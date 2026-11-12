import { Logger } from '@map-colonies/js-logger';
import type { Span } from '@opentelemetry/api';
import { inject, injectable } from 'tsyringe';
import type { Feature } from 'geojson';
import { ConfigType } from '@src/common/config';
import { SERVICES } from '../../common/constants';
import { GenericGeocodingResponse, IApplication } from '../../common/interfaces';
import { ConvertSnakeToCamelCase } from '../../common/utils';
import { withSpan, CommonSpanAttributes } from '../../common/tracing';
import { formatResponse } from '../../control/utils';
import { TileManager } from '../../control/tile/models/tileManager';
import { GeotextSearchManager } from '../../location/models/locationManager';
import { MAX_PER_SOURCE_SIZE, OVERFETCH_FACTOR } from '../constants';
import { SMART_QUERY_REPOSITORY_SYMBOL, SmartQueryRepository } from '../DAL/smartQueryRepository';
import { buildSmartEnvelope, toCandidates, toMergedFeature } from '../utils';
import { SmartQueryAttributes, SmartQuerySpanName } from '../tracing';
import type { GetSmartQueryParams, PartialFailure, QueryIntent, SmartCandidate } from '../interfaces';
import { classifyQuery } from './classifier';
import { decideBackends, sourceWeights } from './dispatch';
import { mergeCandidates } from './merge';

/** `PromiseSettledResult.reason` is `any`; narrow it once rather than at every use. */
const failureOf = (result: PromiseRejectedResult): Error => (result.reason instanceof Error ? result.reason : new Error(String(result.reason)));

@injectable()
export class SmartQueryManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.APPLICATION) private readonly appConfig: IApplication,
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SMART_QUERY_REPOSITORY_SYMBOL) private readonly smartQueryRepository: SmartQueryRepository,
    @inject(GeotextSearchManager) private readonly geotextSearchManager: GeotextSearchManager,
    @inject(TileManager) private readonly tileManager: TileManager
  ) {}

  public async search(params: GetSmartQueryParams): Promise<GenericGeocodingResponse<Feature>> {
    return withSpan(SmartQuerySpanName.MANAGER_SEARCH, { attributes: { [SmartQueryAttributes.QUERY]: params.query } }, async (span) => {
      const started = Date.now();
      const classification = classifyQuery(params.query);
      const backends = decideBackends(classification);
      const weights = sourceWeights(classification);

      // Over-fetch so the merge has something to choose from, capped because over-fetching
      // costs real work on the geotext index.
      const perSourceSize = Math.min(params.limit * OVERFETCH_FACTOR, MAX_PER_SOURCE_SIZE);

      const sourcesQueried: string[] = [];
      const partialFailures: PartialFailure[] = [];
      const candidates: SmartCandidate[] = [];
      let controlMaxScore: number | undefined;
      let placesMaxScore: number | undefined;

      if (backends.mgrsTiles) {
        sourcesQueried.push('mgrs');
        const [mgrsIntent] = classification.intents as [Extract<QueryIntent, { kind: 'MGRS' }>];
        const tiles = await this.tileManager.getTiles({
          mgrs: mgrsIntent.terms.mgrs,
          limit: params.limit,
          disableFuzziness: params.disable_fuzziness,
          geoContext: params.geo_context,
          geoContextMode: params.geo_context_mode,
        });

        const mgrsCandidates = toCandidates(tiles as unknown as GenericGeocodingResponse<Feature>, 'control');
        return this.respond(params, mgrsCandidates, classification, weights, {
          sourcesQueried,
          partialFailures,
          controlMaxScore: mgrsCandidates[0]?.rawScore,
          placesMaxScore: undefined,
          matchLatencyMs: Date.now() - started,
          span,
        });
      }

      // allSettled, not all: `queryElastic` throws when a client cannot be pinged, so one sick
      // backend would otherwise 500 every ambiguous query even though the other is healthy.
      const [controlResult, placesResult] = await Promise.allSettled([
        backends.control
          ? this.smartQueryRepository.searchControl({
              intents: classification.intents,
              limit: perSourceSize,
              disableFuzziness: params.disable_fuzziness,
              geoContext: params.geo_context,
              geoContextMode: params.geo_context_mode,
            })
          : Promise.resolve(undefined),
        backends.places
          ? this.geotextSearchManager.search({
              query: classification.normalizedQuery,
              limit: perSourceSize,
              disableFuzziness: params.disable_fuzziness,
              geoContext: params.geo_context,
              geoContextMode: params.geo_context_mode,
            } as ConvertSnakeToCamelCase<GetSmartQueryParams> & { source?: string[]; region?: string[] })
          : Promise.resolve(undefined),
      ]);

      if (backends.control) {
        sourcesQueried.push('control');
        if (controlResult.status === 'fulfilled' && controlResult.value) {
          const formatted = formatResponse(controlResult.value, params, this.appConfig.controlObjectDisplayNamePrefixes);
          const controlCandidates = toCandidates(formatted as unknown as GenericGeocodingResponse<Feature>, 'control');
          controlMaxScore = controlCandidates[0]?.rawScore;
          candidates.push(...controlCandidates);
        } else if (controlResult.status === 'rejected') {
          const error = failureOf(controlResult);
          partialFailures.push({ source: 'control', message: error.message });
          this.logger.warn({ msg: 'SmartQueryManager.search: control backend failed', error });
        }
      }

      if (backends.places) {
        sourcesQueried.push('places');
        if (placesResult.status === 'fulfilled' && placesResult.value) {
          const placeCandidates = toCandidates(placesResult.value, 'places');
          placesMaxScore = placeCandidates[0]?.rawScore;
          candidates.push(...placeCandidates);
        } else if (placesResult.status === 'rejected') {
          const error = failureOf(placesResult);
          partialFailures.push({ source: 'places', message: error.message });
          this.logger.warn({ msg: 'SmartQueryManager.search: places backend failed', error });
        }
      }

      // Only an all-sources failure is a failure; anything less is a partial answer.
      if (partialFailures.length > 0 && partialFailures.length === sourcesQueried.length) {
        throw failureOf(controlResult.status === 'rejected' ? controlResult : (placesResult as PromiseRejectedResult));
      }

      return this.respond(params, candidates, classification, weights, {
        sourcesQueried,
        partialFailures,
        controlMaxScore,
        placesMaxScore,
        matchLatencyMs: Date.now() - started,
        span,
      });
    });
  }

  private respond(
    params: GetSmartQueryParams,
    candidates: SmartCandidate[],
    classification: ReturnType<typeof classifyQuery>,
    weights: ReturnType<typeof sourceWeights>,
    context: {
      sourcesQueried: string[];
      partialFailures: PartialFailure[];
      controlMaxScore?: number;
      placesMaxScore?: number;
      matchLatencyMs: number;
      span?: Span;
    }
  ): GenericGeocodingResponse<Feature> {
    const merged = mergeCandidates(candidates, {
      weights,
      normalizedQuery: classification.normalizedQuery,
      limit: params.limit,
    });

    context.span?.setAttributes({
      [SmartQueryAttributes.INTENTS]: classification.intents.map((intent) => intent.reason),
      [SmartQueryAttributes.SOURCES_QUERIED]: context.sourcesQueried,
      [SmartQueryAttributes.PARTIAL_FAILURES]: context.partialFailures.map((failure) => failure.source),
      [CommonSpanAttributes.RESULT_COUNT]: merged.length,
    });

    return buildSmartEnvelope(params, merged.map(toMergedFeature), {
      intents: classification.intents,
      sourcesQueried: context.sourcesQueried,
      partialFailures: context.partialFailures,
      controlMaxScore: context.controlMaxScore,
      placesMaxScore: context.placesMaxScore,
      matchLatencyMs: context.matchLatencyMs,
    });
  }
}
