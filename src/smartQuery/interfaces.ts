import type { Feature } from 'geojson';
import type { CommonRequestParameters, GenericGeocodingResponse } from '../common/interfaces';

/** Request parameters of `GET /search/query`. */
interface GetSmartQueryParams extends CommonRequestParameters {
  query: string;
}

/** A backend that failed while others succeeded. */
interface PartialFailure {
  source: string;
  message: string;
}

/** Which backend a query might be answered by. */
type IntentKind = 'MGRS' | 'TILE' | 'SUB_TILE' | 'CONTROL_NAME' | 'PLACE';

interface IntentBase {
  /** A prior over which backend is worth asking - not a relevance score. */
  confidence: number;
  /** Rule identifier, echoed in `geocoding.response.intents` so a routing decision is explainable. */
  reason: string;
}

/**
 * Discriminated by `kind`, so the terms an intent carries are guaranteed by its type rather than
 * re-checked at every use. Without this the query builder needs a defensive guard per branch that
 * nothing can ever reach.
 */
type QueryIntent =
  | (IntentBase & { kind: 'MGRS'; terms: { mgrs: string } })
  | (IntentBase & { kind: 'TILE'; terms: { tile: string } })
  | (IntentBase & { kind: 'SUB_TILE'; terms: { tile?: string; subTile: string } })
  | (IntentBase & { kind: 'CONTROL_NAME'; terms: { commandName: string } })
  | (IntentBase & { kind: 'PLACE'; terms: { text: string } });

interface Classification {
  /** NFC, trimmed, whitespace collapsed. Case is preserved for the patterns. */
  normalizedQuery: string;
  tokens: string[];
  /** Never empty, ordered by descending confidence. */
  intents: QueryIntent[];
}

type CandidateSource = 'control' | 'places';

/** A formatted feature plus the evidence the merge ranks it on. */
interface SmartCandidate {
  feature: GenericGeocodingResponse<Feature>['features'][number];
  source: CandidateSource;
  /** 0-based position within its own source's result list. */
  rank: number;
  /** Diagnostics only - never compared across sources. */
  rawScore: number;
  /** The hit's own key field, for the exact-match gate. */
  matchedText?: string;
}

interface MergedCandidate extends SmartCandidate {
  /** The fused score the merged list is ordered by. */
  finalScore: number;
  exactMatch: boolean;
}

interface SourceWeights {
  control: number;
  places: number;
}

export type {
  GetSmartQueryParams,
  PartialFailure,
  IntentKind,
  QueryIntent,
  Classification,
  CandidateSource,
  SmartCandidate,
  MergedCandidate,
  SourceWeights,
};
