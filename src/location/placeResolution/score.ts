import type { HierarchySearchHit } from '../models/elasticsearchHits';
import {
  CONFIDENCE_BOOST,
  CONFIDENCE_FILTER,
  CONFIDENCE_WEIGHTS,
  EXACTNESS,
  FULL_LENGTH_BONUS_TOKENS,
  MAX_BOOST_PLACES,
  MIN_TOKENS_FOR_INEXACT_MATCH,
  PLACETYPE_MAX_EDITS,
  PLACETYPE_MIN_TOKEN_LENGTH_FOR_EDITS,
} from './constants';
import { normalize } from './tokenize';
import type { CandidateSpan, PlaceCandidate } from './types';

/**
 * Grading gazetteer hits against the spans that produced them.
 *
 * Everything here is pure and local. Elasticsearch's `_score` is used only as a last tiebreak:
 * scores from different clauses of one `should` are TF/IDF dependent and not comparable, so
 * ranking on them would make the winner depend on corpus statistics rather than on how well the
 * query actually matches a place name.
 */

/** A gazetteer hit as the repository returns it, with the named clauses it matched. */
interface CandidateHit {
  hit: HierarchySearchHit;
  score: number;
  /** Clause names, `p:<spanId>` for the phrase clause and `f:<spanId>` for the fuzzy one. */
  matchedQueries: string[];
}

const PHRASE_PREFIX = 'p';

/** `indexOf` sentinel. */
const NOT_FOUND = -1;

/** Gazetteer entries may hold one name or several translations of it. */
const namesOf = (hit: HierarchySearchHit): string[] => {
  const text = hit.text as unknown;
  return Array.isArray(text) ? (text as string[]) : [text as string];
};

const exactnessOf = (hit: HierarchySearchHit, spanText: string, phraseMatched: boolean): number => {
  if (!phraseMatched) {
    return EXACTNESS.fuzzy;
  }

  return namesOf(hit).reduce((best, name) => {
    const normalized = normalize(name);
    if (normalized === spanText) {
      return EXACTNESS.exact;
    }
    if (normalized.includes(spanText) && best < EXACTNESS.contained) {
      return EXACTNESS.contained;
    }
    return best;
  }, EXACTNESS.fuzzy);
};

const confidenceOf = (exactness: number, span: CandidateSpan, segmentTokenCount: number): number => {
  const lengthBonus = Math.min(span.tokenCount, FULL_LENGTH_BONUS_TOKENS) / FULL_LENGTH_BONUS_TOKENS;
  const coverage = segmentTokenCount > 0 ? span.tokenCount / segmentTokenCount : 0;

  return CONFIDENCE_WEIGHTS.exactness * exactness + CONFIDENCE_WEIGHTS.lengthBonus * lengthBonus + CONFIDENCE_WEIGHTS.coverage * coverage;
};

/**
 * One candidate per (hit, span) pair that passes the eligibility gate.
 *
 * The gate - exact match, or at least two tokens - removes the whole class of single token
 * accidents (`los` matching "Los Angeles", a bare fuzzy `york` matching "Port") without relying
 * on any threshold being tuned correctly.
 */
const scoreCandidates = (hits: CandidateHit[], spans: CandidateSpan[], segmentTokenCount: number): PlaceCandidate[] => {
  const spansById = new Map(spans.map((span) => [span.id, span]));
  const candidates: PlaceCandidate[] = [];

  for (const { hit, score, matchedQueries } of hits) {
    const phraseBySpan = new Map<string, boolean>();

    for (const name of matchedQueries) {
      const separator = name.indexOf(':');
      if (separator === NOT_FOUND) {
        continue;
      }
      const spanId = name.slice(separator + 1);
      const isPhrase = name.slice(0, separator) === PHRASE_PREFIX;
      phraseBySpan.set(spanId, (phraseBySpan.get(spanId) ?? false) || isPhrase);
    }

    for (const [spanId, phraseMatched] of phraseBySpan) {
      const span = spansById.get(spanId);
      if (!span) {
        continue;
      }

      const exactness = exactnessOf(hit, span.text, phraseMatched);

      if (exactness !== EXACTNESS.exact && span.tokenCount < MIN_TOKENS_FOR_INEXACT_MATCH) {
        continue;
      }

      candidates.push({ hit, span, exactness, confidence: confidenceOf(exactness, span, segmentTokenCount), score });
    }
  }

  return candidates;
};

/**
 * The best candidate, by a total order so the result cannot depend on input order.
 *
 * confidence, then more tokens, then the span later in the query (a place trails the thing being
 * searched for, mirroring the comma convention), then agreement with the NLP name hint, then
 * Elasticsearch's score, then the entry text.
 */
const pickWinner = (candidates: PlaceCandidate[], nameHint?: string): PlaceCandidate | undefined => {
  const hint = nameHint !== undefined && nameHint !== '' ? normalize(nameHint) : undefined;
  const agreesWithHint = (candidate: PlaceCandidate): number =>
    hint !== undefined && (hint.includes(candidate.span.text) || candidate.span.text.includes(hint)) ? 1 : 0;

  /** > 0 when `candidate` should beat `best`. */
  const compare = (candidate: PlaceCandidate, best: PlaceCandidate): number => {
    const comparisons = [
      candidate.confidence - best.confidence,
      candidate.span.tokenCount - best.span.tokenCount,
      candidate.span.tokenStart - best.span.tokenStart,
      agreesWithHint(candidate) - agreesWithHint(best),
      candidate.score - best.score,
      best.span.text.localeCompare(candidate.span.text),
    ];

    return comparisons.find((comparison) => comparison !== 0) ?? 0;
  };

  return candidates.reduce<PlaceCandidate | undefined>((best, candidate) => (!best || compare(candidate, best) > 0 ? candidate : best), undefined);
};

const overlaps = (a: CandidateSpan, b: CandidateSpan): boolean =>
  a.tokenStart < b.tokenStart + b.tokenCount && b.tokenStart < a.tokenStart + a.tokenCount;

/**
 * Runners-up that do not overlap the winner, best first, capped.
 *
 * They become boost-only hierarchies. The cap matters: each one adds a `geo_shape` function to
 * the main query, and the previous code kept up to ten.
 */
const resolveOverlaps = (candidates: PlaceCandidate[], winner: PlaceCandidate, max = MAX_BOOST_PLACES): PlaceCandidate[] => {
  const kept: PlaceCandidate[] = [];

  const remaining = candidates.filter((candidate) => candidate !== winner && !overlaps(candidate.span, winner.span));

  while (kept.length < max) {
    const next = pickWinner(remaining.filter((candidate) => kept.every((chosen) => !overlaps(candidate.span, chosen.span))));
    if (!next) {
      break;
    }
    kept.push(next);
  }

  return kept;
};

/** How a resolved place should constrain the search, or `undefined` to ignore it. */
const decideMode = (confidence: number): 'filter' | 'boost' | undefined => {
  if (confidence >= CONFIDENCE_FILTER) {
    return 'filter';
  }
  return confidence >= CONFIDENCE_BOOST ? 'boost' : undefined;
};

/**
 * Levenshtein distance, giving up once it exceeds `bound` (returns `bound + 1`).
 *
 * Used to decide whether a placetype Elasticsearch returned actually resembles a word the user
 * typed. An Elasticsearch `_score` has no absolute scale, so a score floor cannot answer that;
 * a local edit distance can.
 */
const boundedLevenshtein = (a: string, b: string, bound: number): number => {
  if (Math.abs(a.length - b.length) > bound) {
    return bound + 1;
  }

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    if (Math.min(...current) > bound) {
      return bound + 1;
    }
    previous = current;
  }

  return previous[b.length] > bound ? bound + 1 : previous[b.length];
};

/**
 * Whether a placetype Elasticsearch returned actually resembles a word the user typed.
 *
 * `placetypeQuery` runs with fuzziness, which is how the proper name `york` matched the
 * placetype `port` and turned a search for New York into "Port of Los Angeles". Requiring the
 * placetype to be a query token - or within one edit of a long enough token, so that plurals
 * still match - removes that class of false positive.
 */
const isPlausiblePlacetype = (placetype: string, normalizedTokens: string[]): boolean => {
  const candidate = normalize(placetype);

  return normalizedTokens.some(
    (token) =>
      token === candidate ||
      (token.length >= PLACETYPE_MIN_TOKEN_LENGTH_FOR_EDITS && boundedLevenshtein(candidate, token, PLACETYPE_MAX_EDITS) <= PLACETYPE_MAX_EDITS)
  );
};

export { scoreCandidates, pickWinner, resolveOverlaps, decideMode, boundedLevenshtein, isPlausiblePlacetype };
export type { CandidateHit };
