import * as mgrs from 'mgrs';
import { DIGITS_PATTERN, INTENT_CONFIDENCE, MGRS_PATTERN, TILE_PATTERN, TILE_SUB_TILE_PATTERN } from '../constants';
import type { Classification, QueryIntent } from '../interfaces';

/**
 * Decides which backends are worth asking for a query.
 *
 * Pure: one string in, a plain value out. No DI, no config, no I/O - so the whole routing policy
 * is a table-driven unit test with no Elasticsearch. `mgrs.inverse` is a deterministic function
 * from the `mgrs` package, used here exactly as `TileManager` already uses it.
 */

const WHITESPACE_GLOBAL = /\s+/gu;

const isValidMgrs = (value: string): boolean => {
  try {
    mgrs.inverse(value.toUpperCase());
    return true;
  } catch {
    return false;
  }
};

/**
 * Ordered rules. R1 is exclusive; the rest may emit several intents, because a short token or a
 * free-text string genuinely could be answered by more than one backend.
 */
const classifyQuery = (rawQuery: string): Classification => {
  const normalizedQuery = rawQuery.normalize('NFC').replace(WHITESPACE_GLOBAL, ' ').trim();
  const tokens = normalizedQuery.length > 0 ? normalizedQuery.split(' ') : [];

  const classification = (intents: QueryIntent[]): Classification => ({
    normalizedQuery,
    tokens,
    intents: [...intents].sort((a, b) => b.confidence - a.confidence),
  });

  // R1 - a valid MGRS string answers itself; nothing else is worth asking.
  if (MGRS_PATTERN.test(normalizedQuery) && isValidMgrs(normalizedQuery)) {
    return classification([
      {
        kind: 'MGRS',
        confidence: INTENT_CONFIDENCE.mgrs,
        terms: { mgrs: normalizedQuery },
        reason: 'R1:mgrs',
      },
    ]);
  }

  // R2 - "<tile> <digits>"
  const tileSubTile = TILE_SUB_TILE_PATTERN.exec(normalizedQuery);
  if (tileSubTile) {
    const [, tile, subTile] = tileSubTile;
    return classification([
      { kind: 'SUB_TILE', confidence: INTENT_CONFIDENCE.subTileWithTile, terms: { tile, subTile }, reason: 'R2:tile+digits' },
      { kind: 'TILE', confidence: INTENT_CONFIDENCE.tileFromSubTileQuery, terms: { tile }, reason: 'R2:tile-only' },
    ]);
  }

  // R3 - a bare 2-3 letter token is almost certainly a tile, but a short place name is possible.
  if (TILE_PATTERN.test(normalizedQuery)) {
    return classification([
      { kind: 'TILE', confidence: INTENT_CONFIDENCE.tileAlone, terms: { tile: normalizedQuery }, reason: 'R3:short-letters' },
      { kind: 'PLACE', confidence: INTENT_CONFIDENCE.placeFromShortToken, terms: { text: normalizedQuery }, reason: 'R3:short-place' },
    ]);
  }

  // R4 - digits are a control object name or a sub-tile. Never a place.
  if (DIGITS_PATTERN.test(normalizedQuery)) {
    return classification([
      {
        kind: 'CONTROL_NAME',
        confidence: INTENT_CONFIDENCE.controlFromDigits,
        terms: { commandName: normalizedQuery },
        reason: 'R4:digits-command',
      },
      { kind: 'SUB_TILE', confidence: INTENT_CONFIDENCE.subTileFromDigits, terms: { subTile: normalizedQuery }, reason: 'R4:digits-subtile' },
    ]);
  }

  // R5 - everything else, and the reason this endpoint fans out at all.
  //
  // A free-text Hebrew string is genuinely ambiguous between a control object's
  // OBJECT_COMMAND_NAME and a place name; there is no lexical signal that separates them. Any
  // heuristic here would silently drop a whole class of results and be invisible in production,
  // because the dropped side never appears in the response. So both are emitted at *equal*
  // confidence and the merge arbitrates on retrieval evidence instead. The equality is asserted
  // in the tests so nobody can quietly add a tiebreak here later.
  return classification([
    { kind: 'PLACE', confidence: INTENT_CONFIDENCE.ambiguousFreeText, terms: { text: normalizedQuery }, reason: 'R5:free-text-place' },
    {
      kind: 'CONTROL_NAME',
      confidence: INTENT_CONFIDENCE.ambiguousFreeText,
      terms: { commandName: normalizedQuery },
      reason: 'R5:free-text-control',
    },
  ]);
};

export { classifyQuery };
