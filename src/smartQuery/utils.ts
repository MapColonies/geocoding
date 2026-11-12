import { bbox } from '@turf/bbox';
import type { Feature } from 'geojson';
import type { GenericGeocodingResponse } from '../common/interfaces';
import type { CandidateSource, GetSmartQueryParams, MergedCandidate, PartialFailure, QueryIntent, SmartCandidate } from './interfaces';

/**
 * Adapts a formatted response into merge candidates, and back again.
 *
 * Deliberately a post-formatting adapter rather than a refactor of the two existing formatters.
 * `control/utils.ts` spreads a `_source` that is already a GeoJSON Feature; `location/utils.ts`
 * constructs one from `_source.geo_json`. They share their output type and nothing else, so the
 * reusable surface is the envelope, not the per-feature mapping - extracting a "core" would
 * touch both highest-traffic paths and both integration suites for near-zero reuse.
 */

/** Source label reported on a merged feature, in place of the control index's raw name. */
const CONTROL_SOURCE_LABEL = 'control';

type SmartFeature = GenericGeocodingResponse<Feature>['features'][number];

/** The field a hit is compared on for the exact-match gate. */
const matchedTextOf = (feature: SmartFeature, source: CandidateSource): string | undefined => {
  if (source === 'places') {
    return feature.properties.names.default[0];
  }

  /* eslint-disable @typescript-eslint/naming-convention */
  const properties = feature.properties as { OBJECT_COMMAND_NAME?: string; TILE_NAME?: string; SUB_TILE_ID?: string };
  /* eslint-enable @typescript-eslint/naming-convention */
  return properties.OBJECT_COMMAND_NAME ?? properties.SUB_TILE_ID ?? properties.TILE_NAME;
};

const toCandidates = (response: GenericGeocodingResponse<Feature>, source: CandidateSource): SmartCandidate[] =>
  response.features.map((feature, rank) => ({
    feature,
    source,
    rank,
    rawScore: (feature.properties.score as number | undefined) ?? 0,
    matchedText: matchedTextOf(feature, source),
  }));

/**
 * The feature as the merged response returns it: ranked by the fused score, with the source's own
 * score preserved for diagnostics.
 *
 * Also normalizes two inconsistencies rather than changing the formatters, which would break the
 * existing control expectations: the control formatter reports the literal index name as
 * `matches[].source`, and the location formatter leaves `regions` undefined when the document
 * carries no region.
 */
const toMergedFeature = (candidate: MergedCandidate): SmartFeature => ({
  ...candidate.feature,
  properties: {
    ...candidate.feature.properties,
    score: candidate.finalScore,
    /* eslint-disable @typescript-eslint/naming-convention */
    source_score: candidate.rawScore,
    match_source: candidate.source,
    exact_match: candidate.exactMatch,
    /* eslint-enable @typescript-eslint/naming-convention */
    regions: candidate.feature.properties.regions ?? [],
    matches: candidate.feature.properties.matches.map((match) => ({
      ...match,
      source: candidate.source === 'control' ? CONTROL_SOURCE_LABEL : match.source,
    })),
  },
});

/* eslint-disable @typescript-eslint/naming-convention */
/**
 * The merged response envelope, built fresh.
 *
 * Deliberately not derived from a sub-response: each backend echoes its *own* parameters, so
 * reusing one would leak derived values such as `commandName`, `tile` or `place_types` that the
 * caller never sent.
 */
const buildSmartEnvelope = (
  requestParams: GetSmartQueryParams,
  features: SmartFeature[],
  diagnostics: {
    intents: QueryIntent[];
    sourcesQueried: string[];
    partialFailures: PartialFailure[];
    controlMaxScore?: number;
    placesMaxScore?: number;
    matchLatencyMs: number;
  }
): GenericGeocodingResponse<Feature> => {
  const collection: Omit<GenericGeocodingResponse<Feature>, 'bbox'> = {
    type: 'FeatureCollection',
    geocoding: {
      version: process.env.npm_package_version as string,
      query: {
        query: requestParams.query,
        geo_context: requestParams.geo_context,
        geo_context_mode: requestParams.geo_context_mode,
        limit: requestParams.limit,
        disable_fuzziness: requestParams.disable_fuzziness,
      },
      response: {
        results_count: features.length,
        max_score: features.length > 0 ? (features[0].properties.score as number) : 0,
        match_latency_ms: diagnostics.matchLatencyMs,
        intents: diagnostics.intents.map(({ kind, confidence, reason }) => ({ kind, confidence, reason })),
        sources_queried: diagnostics.sourcesQueried,
        ...(diagnostics.partialFailures.length > 0 ? { partial_failures: diagnostics.partialFailures } : {}),
        merge_strategy: 'rrf',
        control_max_score: diagnostics.controlMaxScore,
        places_max_score: diagnostics.placesMaxScore,
      },
    },
    features,
  };

  // A merged list can mix a tile in one country with a place in another, which makes this
  // bounding box correct but not very meaningful. Kept for consistency with the other routes.
  return { ...collection, bbox: features.length > 0 ? bbox(collection) : null };
};
/* eslint-enable @typescript-eslint/naming-convention */

export { toCandidates, toMergedFeature, matchedTextOf, buildSmartEnvelope, CONTROL_SOURCE_LABEL };
export type { SmartFeature };
