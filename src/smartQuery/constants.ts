/**
 * Patterns are the ones the OpenAPI spec already enforces on `/search/control/*`, kept here so
 * `/search/query` cannot drift away from the endpoints it dispatches to.
 */

/** MGRS: zone digits, a latitude band letter, the 100km square, then the numeric location. */
const MGRS_PATTERN = /^\d{1,2}[C-X][A-Z]{2}\d*$/iu;

/** A tile name is 2-3 letters; `openapi3.yaml` allows querying from 2. */
const TILE_PATTERN = /^[A-Za-z]{2,3}$/u;

/** Tile followed by a sub-tile number, e.g. "RIT 66". */
const TILE_SUB_TILE_PATTERN = /^([A-Za-z]{2,3})\s+([0-9][0-9]*)$/u;

/** Digits only: a control item or route command name, or a bare sub-tile. */
const DIGITS_PATTERN = /^[0-9]+$/u;

/**
 * Prior confidence per rule. These order which backends are worth asking; they are not
 * relevance scores and never rank results.
 */
const INTENT_CONFIDENCE = {
  mgrs: 1,
  subTileWithTile: 0.95,
  tileAlone: 0.9,
  tileFromSubTileQuery: 0.4,
  controlFromDigits: 0.6,
  subTileFromDigits: 0.5,
  /** Free text is genuinely ambiguous between a control object name and a place. */
  ambiguousFreeText: 0.5,
  /** A 2-3 letter token is probably a tile, but could still be a short place name. */
  placeFromShortToken: 0.3,
};

/** Below this, the places backend is not worth a round trip. */
const PLACE_FANOUT_MIN_CONFIDENCE = 0.3;

/** Reciprocal Rank Fusion constant. Elasticsearch's own `rrf` retriever uses 60. */
const RRF_K = 60;

/** Multiplier for a hit whose key field is exactly the query. Bounded so it cannot swamp ranking. */
const EXACT_MATCH_BOOST = 2;

/** No boost. */
const NO_BOOST = 1;

/** Over-fetch per source before merging, so the merge has something to choose from. */
const OVERFETCH_FACTOR = 2;

/** ...capped, because over-fetching costs real work on the geotext index. */
const MAX_PER_SOURCE_SIZE = 30;

export {
  MGRS_PATTERN,
  TILE_PATTERN,
  TILE_SUB_TILE_PATTERN,
  DIGITS_PATTERN,
  INTENT_CONFIDENCE,
  PLACE_FANOUT_MIN_CONFIDENCE,
  RRF_K,
  EXACT_MATCH_BOOST,
  NO_BOOST,
  OVERFETCH_FACTOR,
  MAX_PER_SOURCE_SIZE,
};
