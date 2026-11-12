/** Longest place name we will consider, in tokens - covers "תל אביב יפו", "New York City". */
const MAX_SPAN_TOKENS = 4;

/** Above this many tokens the query is a sentence, not a place; cap spans to keep the fan-out bounded. */
const MAX_TOKENS_FOR_RESOLUTION = 12;

/** Spans shorter than this are noise - a single Hebrew letter matches far too much. */
const MIN_SPAN_CHARS = 2;

/** Gazetteer hits to ask Elasticsearch for. Scoring is local, so a wide net costs little. */
const PLACE_CANDIDATE_SIZE = 20;

/**
 * How a span's match is graded. Elasticsearch's `_score` is deliberately not used: it is
 * TF/IDF dependent and not comparable between different spans inside one `should`.
 */
const EXACTNESS = {
  /** The gazetteer entry is the span. */
  exact: 1,
  /** The entry contains the span - "new york" inside "New York City". */
  contained: 0.8,
  /** Only the fuzzy clause matched. */
  fuzzy: 0.5,
};

/** confidence = exactness*0.60 + lengthBonus*0.25 + coverage*0.15 */
const CONFIDENCE_WEIGHTS = { exactness: 0.6, lengthBonus: 0.25, coverage: 0.15 };

/** A span of this many tokens already earns the full length bonus. */
const FULL_LENGTH_BONUS_TOKENS = 3;

/** At or above this, the place becomes a hard geo_shape filter. */
const CONFIDENCE_FILTER = 0.75;

/** At or above this (but below the filter threshold) it becomes a strong boost; below it, ignored. */
const CONFIDENCE_BOOST = 0.45;

/** Weight of the geo_shape `should` clause in boost mode. A code constant, not config. */
const PLACE_BOOST = 8;

/** Runners-up kept as boost-only hierarchies. Previously up to ten, each adding a geo_shape function. */
const MAX_BOOST_PLACES = 3;

/** A span must be an exact match or at least this many tokens to be eligible at all. */
const MIN_TOKENS_FOR_INEXACT_MATCH = 2;

/** Placetype hits to ask for. Acceptance is decided locally, so a couple of spares cost nothing. */
const PLACETYPE_QUERY_SIZE = 3;

/** Weight of the phrase clause relative to the fuzzy one when querying the gazetteer. */
const PLACE_PHRASE_BOOST = 3;

/** Weight of the exact (un-fuzzied) placetype clause relative to the fuzzy one. */
const PLACETYPE_EXACT_BOOST = 3;

/** A placetype may differ from a query token by at most this many edits. */
const PLACETYPE_MAX_EDITS = 1;

/** ...and only when the token is long enough that one edit is not most of the word. */
const PLACETYPE_MIN_TOKEN_LENGTH_FOR_EDITS = 5;

export {
  MAX_SPAN_TOKENS,
  MAX_TOKENS_FOR_RESOLUTION,
  MIN_SPAN_CHARS,
  PLACE_CANDIDATE_SIZE,
  EXACTNESS,
  CONFIDENCE_WEIGHTS,
  FULL_LENGTH_BONUS_TOKENS,
  CONFIDENCE_FILTER,
  CONFIDENCE_BOOST,
  PLACE_BOOST,
  MAX_BOOST_PLACES,
  MIN_TOKENS_FOR_INEXACT_MATCH,
  PLACE_PHRASE_BOOST,
  PLACETYPE_QUERY_SIZE,
  PLACETYPE_EXACT_BOOST,
  PLACETYPE_MAX_EDITS,
  PLACETYPE_MIN_TOKEN_LENGTH_FOR_EDITS,
};
