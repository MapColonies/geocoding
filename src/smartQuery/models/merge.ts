import { normalize } from '../../location/placeResolution/tokenize';
import { EXACT_MATCH_BOOST, NO_BOOST, RRF_K } from '../constants';
import type { MergedCandidate, SmartCandidate, SourceWeights } from '../interfaces';

/** Array.sort: a before b. */
const A_FIRST = -1;
const B_FIRST = 1;

/**
 * Fuses two result lists whose scores are not comparable.
 *
 * A control hit scores on a `bool`/`match` over one index; a places hit scores on a
 * `function_score` with multiplicative boosts over another. Normalizing each list to its own
 * maximum would award 1.0 to the best hit of *every* source, including one that matched nothing
 * well - a single irrelevant route would tie with five excellent places.
 *
 * Reciprocal Rank Fusion avoids that by construction: it reads only positions, never scores. Its
 * one weakness - rank 0 and rank 1 are always the same distance apart, however good or bad the
 * match - is closed by the exact-match gate, a local string comparison on fields the search
 * already returned.
 */

interface MergeOptions {
  weights: SourceWeights;
  /** The user's query, for the exact-match gate. */
  normalizedQuery: string;
  limit: number;
}

const mergeCandidates = (candidates: SmartCandidate[], { weights, normalizedQuery, limit }: MergeOptions): MergedCandidate[] => {
  const target = normalize(normalizedQuery);

  const scored: MergedCandidate[] = candidates.map((candidate) => {
    const exactMatch = candidate.matchedText !== undefined && normalize(candidate.matchedText) === target;

    return {
      ...candidate,
      exactMatch,
      finalScore: weights[candidate.source] * (1 / (RRF_K + candidate.rank)) * (exactMatch ? EXACT_MATCH_BOOST : NO_BOOST),
    };
  });

  // Total order, so an integration test can assert an exact array rather than a set.
  return scored
    .sort(
      (a, b) =>
        b.finalScore - a.finalScore ||
        Number(b.exactMatch) - Number(a.exactMatch) ||
        a.rank - b.rank ||
        (a.source === b.source ? 0 : a.source === 'control' ? A_FIRST : B_FIRST)
    )
    .slice(0, limit);
};

export { mergeCandidates };
export type { MergeOptions };
