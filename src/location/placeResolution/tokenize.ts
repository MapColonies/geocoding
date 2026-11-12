import { MAX_SPAN_TOKENS, MAX_TOKENS_FOR_RESOLUTION, MIN_SPAN_CHARS } from './constants';
import type { CandidateSpan, QueryToken } from './types';

/**
 * Query tokenisation for place resolution.
 *
 * Replaces the previous `cleanQuery`, which returned a bare `string[]`. Offsets are carried on
 * every token because a resolved place has to be cut back out of the *original* string: RTL text
 * must never be reassembled by joining tokens.
 */

/**
 * Characters that end a token.
 *
 * The ASCII punctuation matches what `cleanQuery` split on, so the tokens sent to the NLP
 * analyser do not change. Added on top:
 *  - U+05BE maqaf, U+05C0 paseq, U+05C3 sof pasuq - Hebrew punctuation that joins words
 *    (`בת־ים`), which the old expression did not know about.
 *  - bidi controls and the BOM. These are invisible, survive a copy-paste out of an RTL
 *    document, and previously ended up inside tokens where they silently broke every match.
 *    They are separators rather than deletions so that offsets keep addressing the original
 *    string.
 */
const SEPARATOR = /[\s`!@#$%^&*()_\-+=|\\/,.<>:[\]{};\u061B\u05BE\u05C0\u05C3\u200E\u200F\u202A-\u202E\uFEFF]/u;
const SEPARATOR_GLOBAL = new RegExp(SEPARATOR.source, 'gu');

/**
 * Removed from a token without splitting it: an acronym such as `צה״ל` or `נתב"ג` is one word,
 * and gazetteers normally store it unpunctuated.
 */
const STRIPPED_GLOBAL = /["'׳״]/gu;

/** Hebrew points, accents and cantillation. Gazetteers are normally unpointed. */
const DIACRITICS_GLOBAL = /[֑-ׇ]/gu;

const WHITESPACE_GLOBAL = /\s+/gu;

/** `start` sentinel: no token is open. */
const NO_TOKEN = -1;

/**
 * The comparable form of a string: NFC, punctuation that joins words turned into a space,
 * diacritics dropped, lowercased, whitespace collapsed.
 *
 * Separators become spaces *before* diacritics are stripped, so `בת־ים` normalizes to `בת ים`
 * and matches an unpointed gazetteer entry rather than collapsing to `בתים`.
 */
const normalize = (value: string): string =>
  value
    .normalize('NFC')
    .replace(STRIPPED_GLOBAL, '')
    .replace(SEPARATOR_GLOBAL, ' ')
    .replace(DIACRITICS_GLOBAL, '')
    .toLowerCase()
    .replace(WHITESPACE_GLOBAL, ' ')
    .trim();

/** Tokens of `query`, each carrying its offsets in `query`. Tokens that normalize away are dropped. */
const tokenize = (query: string): QueryToken[] => {
  const tokens: QueryToken[] = [];
  let start: number = NO_TOKEN;

  const close = (end: number): void => {
    if (start === NO_TOKEN) {
      return;
    }
    const raw = query.slice(start, end);
    const normalized = normalize(raw);
    if (normalized.length > 0) {
      tokens.push({ raw, normalized, start, end });
    }
    start = NO_TOKEN;
  };

  for (let index = 0; index < query.length; index++) {
    if (SEPARATOR.test(query[index])) {
      close(index);
      continue;
    }
    if (start === NO_TOKEN) {
      start = index;
    }
  }
  close(query.length);

  return tokens;
};

/**
 * Every contiguous token n-gram, longest first then leftmost, as candidate place names.
 *
 * Bounded by design: at most `MAX_SPAN_TOKENS` tokens per span, and a long query - which is a
 * sentence rather than a place - is capped tighter still, so the number of clauses sent to
 * Elasticsearch cannot grow with the query.
 */
const generateSpans = (tokens: QueryToken[]): CandidateSpan[] => {
  const maxLength = Math.min(tokens.length > MAX_TOKENS_FOR_RESOLUTION ? MAX_SPAN_TOKENS - 1 : MAX_SPAN_TOKENS, tokens.length);

  const spans: CandidateSpan[] = [];

  for (let length = maxLength; length >= 1; length--) {
    for (let tokenStart = 0; tokenStart + length <= tokens.length; tokenStart++) {
      const covered = tokens.slice(tokenStart, tokenStart + length);
      const text = covered.map((token) => token.normalized).join(' ');

      if (text.replace(WHITESPACE_GLOBAL, '').length < MIN_SPAN_CHARS) {
        continue;
      }

      spans.push({
        id: `${tokenStart}:${length}`,
        text,
        start: covered[0].start,
        end: covered[covered.length - 1].end,
        tokenStart,
        tokenCount: length,
      });
    }
  }

  return spans;
};

/** `original` with the span's characters removed and the resulting whitespace collapsed. */
const removeSpan = (original: string, span: CandidateSpan): string =>
  `${original.slice(0, span.start)} ${original.slice(span.end)}`.replace(WHITESPACE_GLOBAL, ' ').trim();

export { normalize, tokenize, generateSpans, removeSpan };
