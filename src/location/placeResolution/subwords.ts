/**
 * Re-assembles the sub-word pieces a SentencePiece-based token classifier (RoBERTa / XLM-R)
 * returns, back into whole words, so that a label can be read per word rather than per piece.
 *
 * Measured against xlm-roberta-base: 23 of 36 Israeli place names produce more pieces than
 * words (`פתח תקווה` -> `['▁פתח', '▁תק', 'ווה']`), so reading `prediction[i]` against the raw
 * pieces yields fragments such as `"ווה"`. The marker was verified to agree with true word
 * starts on every probe, including `צה״ל` -> `['▁', 'צה', '״', 'ל']` where the first piece is
 * a bare marker.
 */

/** U+2581 LOWER ONE EIGHTH BLOCK — SentencePiece's word-start marker. */
const SENTENCEPIECE_MARKER = '▁';
const MARKER_GLOBAL = /▁/g;
const WHITESPACE_GLOBAL = /\s+/g;

interface AggregatedTokens {
  words: string[];
  labels: string[];
}

/**
 * Merges sub-word pieces into words, carrying each word's label from its first piece that
 * contributes text (HuggingFace's `aggregation_strategy: "first"`, skipping bare markers).
 *
 * When no piece carries the marker the input is already word-level — the deployed mock and
 * every existing fixture behave this way — and it is returned untouched.
 *
 * Returns `undefined` when the input is empty or the two arrays disagree in length, which is
 * how a re-tokenising service that silently misaligns indices is caught.
 */
const aggregateSubwords = (tokens: string[], prediction: string[]): AggregatedTokens | undefined => {
  if (tokens.length === 0 || tokens.length !== prediction.length) {
    return undefined;
  }

  if (!tokens.some((token) => token.includes(SENTENCEPIECE_MARKER))) {
    return { words: [...tokens], labels: [...prediction] };
  }

  const words: string[] = [];
  const labels: string[] = [];

  let open = false;
  let current = '';
  let currentLabel: string | undefined = undefined;

  const flush = (): void => {
    if (current.length > 0) {
      words.push(current);
      labels.push(currentLabel ?? '');
    }
    current = '';
    currentLabel = undefined;
  };

  tokens.forEach((token, index) => {
    const startsWord = token.startsWith(SENTENCEPIECE_MARKER);
    const text = startsWord ? token.slice(SENTENCEPIECE_MARKER.length) : token;

    if (startsWord || !open) {
      if (startsWord) {
        flush();
      }
      open = true;
      current = text;
      currentLabel = text.length > 0 ? prediction[index] : undefined;
      return;
    }

    current += text;
    if (currentLabel === undefined && text.length > 0) {
      currentLabel = prediction[index];
    }
  });

  flush();

  return { words, labels };
};

/**
 * The longest run of consecutive `nameLabel` words, joined in order. Ties keep the earliest run.
 *
 * Replaces `tokens.filter(...).join(' ')`, which concatenated non-adjacent tokens into a phrase
 * that never existed in the query.
 */
const longestContiguousName = (words: string[], labels: string[], nameLabel = 'name'): string => {
  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  let runLength = 0;

  labels.forEach((label, index) => {
    if (label !== nameLabel) {
      runLength = 0;
      return;
    }

    if (runLength === 0) {
      runStart = index;
    }
    runLength++;

    if (runLength > bestLength) {
      bestStart = runStart;
      bestLength = runLength;
    }
  });

  return bestLength > 0 ? words.slice(bestStart, bestStart + bestLength).join(' ') : '';
};

const contentOf = (parts: string[]): string =>
  parts.join('').normalize('NFC').replace(MARKER_GLOBAL, '').replace(WHITESPACE_GLOBAL, '').toLowerCase();

/**
 * Whether aggregation preserved every character of what the service was given.
 *
 * Compares content only — word boundaries, markers and whitespace are ignored — so a service
 * that re-splits words still passes, while one that drops or invents characters does not.
 * This is the guard that makes a future model or tokeniser change fail loudly instead of
 * silently returning fragments.
 */
const reconstructs = (words: string[], reference: string[]): boolean => contentOf(words) === contentOf(reference);

export { aggregateSubwords, longestContiguousName, reconstructs };
export type { AggregatedTokens };
