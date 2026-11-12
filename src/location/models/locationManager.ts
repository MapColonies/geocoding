import { Logger } from '@map-colonies/js-logger';
import { estypes } from '@elastic/elasticsearch';
import { inject, injectable } from 'tsyringe';
import type { Feature } from 'geojson';
import { ConfigType } from '@src/common/config';
import { SERVICES, elasticConfigPath } from '../../common/constants';
import { GEOTEXT_REPOSITORY_SYMBOL, GeotextRepository } from '../DAL/locationRepository';
import { GetGeotextSearchParams, TextSearchParams } from '../interfaces';
import { convertResult } from '../utils';
import { GenericGeocodingResponse, IApplication } from '../../common/interfaces';
import { ElasticGeotextClientConfig } from '../../common/elastic/interfaces';
import { ConvertSnakeToCamelCase } from '../../common/utils';
import { BadRequestError } from '../../common/errors';
import { CommonSpanAttributes, withSpan } from '../../common/tracing';
import { LocationSpanName, LocationAttributes } from '../tracing';
import { generateSpans, removeSpan, tokenize } from '../placeResolution/tokenize';
import { decideMode, pickWinner, resolveOverlaps, scoreCandidates } from '../placeResolution/score';
import type { ResolvedPlace } from '../placeResolution/types';
import type { HierarchySearchHit, TextSearchHit } from './elasticsearchHits';

/** `indexOf` sentinel: the query holds no comma. */
const NO_COMMA = -1;

@injectable()
export class GeotextSearchManager {
  private readonly elasticConfig: ElasticGeotextClientConfig;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.APPLICATION) private readonly appConfig: IApplication,
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(GEOTEXT_REPOSITORY_SYMBOL) private readonly geotextRepository: GeotextRepository
  ) {
    this.elasticConfig = this.config.get(`${elasticConfigPath}.geotext`);
  }

  public async search(params: ConvertSnakeToCamelCase<GetGeotextSearchParams>): Promise<GenericGeocodingResponse<Feature>> {
    return withSpan(
      LocationSpanName.MANAGER_SEARCH,
      {
        attributes: {
          [LocationAttributes.QUERY]: params.query,
          [LocationAttributes.DISABLE_FUZZINESS]: params.disableFuzziness,
          ...(params.source ? { [LocationAttributes.SOURCES]: params.source } : {}),
        },
      },
      async (span) => {
        if (this.appConfig.sources && (params.source?.some((source) => !this.appConfig.sources![source]) ?? false)) {
          throw new BadRequestError(`Invalid source. Available sources are ${Object.keys(this.appConfig.sources).toString()}`);
        }

        const extractNameEndpoint = this.appConfig.services.tokenTypesUrl;
        const {
          geotext: geotextIndex,
          placetypes: placetypesIndex,
          hierarchies: hierarchiesIndex,
        } = this.elasticConfig.index as {
          [key: string]: string;
        };
        const hierarchyBoost = this.appConfig.elasticQueryBoosts.hierarchy;

        // The comma convention, "<thing>, <place>", is a segmentation hint that feeds the same
        // resolver rather than a separate code path. Only the first comma separates.
        const commaIndex = params.query.indexOf(',');
        const head = (commaIndex === NO_COMMA ? params.query : params.query.slice(0, commaIndex)).trim();
        const tail = commaIndex === NO_COMMA ? '' : params.query.slice(commaIndex + 1).trim();

        // Where a place name may live: after the comma when the caller used one, otherwise anywhere.
        const placeSegment = tail.length > 0 ? tail : head;
        const placeTokens = tokenize(placeSegment);
        const spans = generateSpans(placeTokens);

        const [nlp, speculativePlacetypes, placeCandidates] = await Promise.all([
          this.geotextRepository.extractName(extractNameEndpoint, head),
          // Issued on the untrimmed text so the common no-place case costs no extra round trip.
          this.geotextRepository.generatePlacetype(placetypesIndex, head, params.disableFuzziness),
          this.geotextRepository.findPlaceCandidates(hierarchiesIndex, spans, params.disableFuzziness),
        ]);

        const scored = scoreCandidates(placeCandidates.candidates, spans, placeTokens.length);
        const winner = pickWinner(scored, nlp.name);
        const mode = winner ? decideMode(winner.confidence) : undefined;
        const place: ResolvedPlace | undefined =
          winner && mode ? { hit: winner.hit, span: winner.span, confidence: winner.confidence, mode } : undefined;

        // The winner drives the query through `place`, so only the runners-up become function_score
        // boosts - applying the winner twice would double-count its polygon.
        let queryHierarchies: HierarchySearchHit[] = winner
          ? resolveOverlaps(scored, winner).map((candidate) => ({ ...candidate.hit, weight: hierarchyBoost }))
          : [];
        // ...but it is still reported under `hierarchies`, which existing clients read.
        let reportedHierarchies: HierarchySearchHit[] = winner ? [{ ...winner.hit, weight: hierarchyBoost }, ...queryHierarchies] : queryHierarchies;
        let hierarchiesLatency = placeCandidates.matchLatencyMs;

        // Nothing in the tail resolved, so fall back to the pre-existing hierarchy lookup. That keeps
        // the new behaviour a strict superset of the old comma handling.
        if (tail.length > 0 && !place) {
          const legacy = await this.geotextRepository.extractHierarchy(hierarchiesIndex, tail, hierarchyBoost, params.disableFuzziness);
          queryHierarchies = legacy.hierarchies;
          reportedHierarchies = legacy.hierarchies;
          hierarchiesLatency = legacy.matchLatencyMs;
        }

        const searchText = this.residualText(params.query, head, tail, place);

        // Only re-ask for placetypes when the text actually changed; otherwise reuse the speculative
        // answer. This is what keeps the no-place path at today's cost.
        const placetypes =
          searchText === head
            ? speculativePlacetypes
            : await this.geotextRepository.generatePlacetype(placetypesIndex, searchText, params.disableFuzziness);

        const searchParams: TextSearchParams = {
          ...params,
          searchText,
          name: nlp.name,
          placeTypes: placetypes.placeTypes,
          subPlaceTypes: placetypes.subPlaceTypes,
          hierarchies: queryHierarchies,
          place,
        };

        let esResult = await this.runSearch(geotextIndex, searchParams);
        let fallbackApplied = false;

        // A correct but coarse polygon must never empty the results. One retry, demoted to a boost.
        if (place?.mode === 'filter' && esResult.hits.hits.length === 0) {
          this.logger.info({
            msg: 'GeotextSearchManager.search: place filter returned nothing, retrying as a boost',
            place: place.span.text,
          });
          fallbackApplied = true;
          // A fresh object: `searchParams` was already handed to the first search.
          esResult = await this.runSearch(geotextIndex, { ...searchParams, place: { ...place, mode: 'boost' } });
        }

        span?.setAttributes({
          [LocationAttributes.QUERY_NAME]: nlp.name,
          [LocationAttributes.PLACE_TYPES]: placetypes.placeTypes,
          [CommonSpanAttributes.RESULT_COUNT]: esResult.hits.hits.length,
          ...(place
            ? {
                [LocationAttributes.PLACE_TEXT]: place.span.text,
                [LocationAttributes.PLACE_MODE]: place.mode,
                [LocationAttributes.PLACE_CONFIDENCE]: place.confidence,
                [LocationAttributes.PLACE_FALLBACK_APPLIED]: fallbackApplied,
              }
            : {}),
        });

        return convertResult({ ...searchParams, hierarchies: reportedHierarchies }, esResult, {
          sources: this.appConfig.sources,
          regionCollection: this.appConfig.regions,
          nameKeys: this.appConfig.nameTranslationsKeys,
          mainLanguageRegex: this.appConfig.mainLanguageRegex,
          place: place ? { ...place, fallbackApplied } : undefined,
          externalResourcesLatency: {
            query: esResult.took,
            placeType: placetypes.matchLatencyMs,
            hierarchies: hierarchiesLatency,
            nlpAnalyser: nlp.latency,
          },
        });
      }
    );
  }

  public regions(): string[] {
    return Object.keys(this.appConfig.regions ?? {});
  }

  public sources(): string[] {
    return Object.keys(this.appConfig.sources ?? {});
  }

  /**
   * The text the search runs on: the query with the resolved place name cut out, so the place
   * does not also compete as a literal term.
   *
   * When the query *is* the place, the original text is kept - `geo_shape` defaults to
   * `intersects`, so the place's own feature survives its own polygon.
   */
  private residualText(query: string, head: string, tail: string, place?: ResolvedPlace): string {
    if (tail.length > 0 || !place) {
      return head;
    }

    const residual = removeSpan(query, place.span);
    return residual.length > 0 ? residual : query;
  }

  private async runSearch(index: string, searchParams: TextSearchParams): Promise<estypes.SearchResponse<TextSearchHit>> {
    return this.geotextRepository.geotextSearch(index, searchParams, this.elasticConfig.textTermLanguage, this.appConfig.elasticQueryBoosts, {
      geotextCitiesLayer: this.appConfig.geotextCitiesLayer,
      roadPlaceTypes: this.appConfig.roadPlaceTypes,
    });
  }
}
