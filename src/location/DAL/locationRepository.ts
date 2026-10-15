import { Logger } from '@map-colonies/js-logger';
import { estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { ElasticClient, ElasticClients } from '../../common/elastic';
import { fetchNLPService } from '../utils';
import { TextSearchParams, TokenResponse } from '../interfaces';
import { PlaceTypeSearchHit, HierarchySearchHit, TextSearchHit } from '../models/elasticsearchHits';
import { BadRequestError } from '../../common/errors';
import { IApplication } from '../../common/interfaces';
import { queryElastic } from '../../common/elastic/utils';
import { SERVICES } from '../../common/constants';
import { CommonSpanAttributes, withSpan } from '../../common/tracing';
import { LocationSpanName, LocationAttributes } from '../tracing';
import { hierarchyQuery, placetypeQuery, geotextQuery } from './queries';

const FIND_QUOTES = /["']/g;

const FIND_SPECIAL = /[`!@#$%^&*()_\-+=|\\/,.<>:[\]{}\n\t\r\s;؛]+/g;
const cleanQuery = (query: string): string[] => query.replace(FIND_QUOTES, '').split(FIND_SPECIAL);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createGeotextRepository = (client: ElasticClient, logger: Logger) => {
  return {
    async extractName(endpoint: string, query: string): Promise<{ name: string; latency: number }> {
      return withSpan(
        LocationSpanName.REPOSITORY_EXTRACT_NAME,
        { attributes: { [LocationAttributes.QUERY]: query, [LocationAttributes.NLP_ENDPOINT]: endpoint } },
        async (span) => {
          const tokensRaw = cleanQuery(query);
          const { data: response, latency } = await fetchNLPService<Partial<TokenResponse>>(endpoint, { tokens: tokensRaw });

          const { tokens, prediction } = response[0];

          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!tokens?.length || !prediction?.length) {
            const message = 'No tokens or prediction';
            logger.error({ msg: message });
            throw new BadRequestError(message);
          }

          const nameTokens = tokens.filter((_, index) => prediction[index] === 'name');
          const name = nameTokens.join(' ');

          span?.setAttribute(LocationAttributes.QUERY_NAME, name);

          return { name, latency };
        }
      );
    },

    async generatePlacetype(
      index: string,
      query: string,
      disableFuzziness: boolean
    ): Promise<{
      placeTypes: string[];
      subPlaceTypes: string[];
      matchLatencyMs: number;
    }> {
      return withSpan(
        LocationSpanName.REPOSITORY_GENERATE_PLACETYPE,
        {
          attributes: {
            [LocationAttributes.QUERY]: query,
            [LocationAttributes.DISABLE_FUZZINESS]: disableFuzziness,
            [CommonSpanAttributes.ELASTIC_INDEX]: index,
          },
        },
        async (span) => {
          const {
            hits: { hits },
            took: matchLatencyMs,
          } = await queryElastic<PlaceTypeSearchHit>(client, { index, ...placetypeQuery(query, disableFuzziness) });

          const SCORE_DIFFERENCE_THRESHOLD = 0.5;
          const MIN_HITS_FOR_DIFFERENCE_CHECK = 2;

          if (hits.length == MIN_HITS_FOR_DIFFERENCE_CHECK && hits[0]._score! - hits[1]._score! > SCORE_DIFFERENCE_THRESHOLD) {
            hits.pop();
          }

          const [placeTypes, subPlaceTypes] = hits.reduce<[string[], string[]]>(
            ([placeTypes, subPlaceTypes], hit) => [placeTypes.concat(hit._source!.placetype), subPlaceTypes.concat(hit._source!.sub_placetype)],
            [[], []]
          );

          span?.setAttributes({
            [LocationAttributes.PLACE_TYPES]: placeTypes,
            [LocationAttributes.SUB_PLACE_TYPES]: subPlaceTypes,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: matchLatencyMs,
          });

          return {
            placeTypes,
            subPlaceTypes,
            matchLatencyMs,
          };
        }
      );
    },

    async extractHierarchy(
      index: string,
      query: string,
      hierarchyBoost: number,
      disableFuzziness: boolean
    ): Promise<{ hierarchies: HierarchySearchHit[]; matchLatencyMs: number }> {
      return withSpan(
        LocationSpanName.REPOSITORY_EXTRACT_HIERARCHY,
        {
          attributes: {
            [LocationAttributes.QUERY]: query,
            [LocationAttributes.DISABLE_FUZZINESS]: disableFuzziness,
            [CommonSpanAttributes.ELASTIC_INDEX]: index,
          },
        },
        async (span) => {
          const {
            hits: { hits },
            took: matchLatencyMs,
          } = await queryElastic<HierarchySearchHit>(client, { index, ...hierarchyQuery(query, disableFuzziness) });

          const MIN_HITS_THRESHOLD = 3;

          const filteredHits = hits.length > MIN_HITS_THRESHOLD ? hits.filter((hit) => hit._score! >= hits[2]._score!) : hits;

          const highestScore = Math.max(...filteredHits.map((hit) => hit._score!));
          const hierarchies = filteredHits.map((hit) => ({
            ...hit._source!,
            weight: (hit._score! / highestScore) * (hierarchyBoost - 1) + 1,
          }));

          span?.setAttributes({
            [LocationAttributes.HIERARCHIES_COUNT]: hierarchies.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: matchLatencyMs,
          });

          return { hierarchies, matchLatencyMs };
        }
      );
    },

    async geotextSearch(
      index: string,
      params: TextSearchParams,
      textLanguage: string,
      elasticQueryBoosts: IApplication['elasticQueryBoosts'],
      geotextLayerName?: { geotextCitiesLayer?: IApplication['geotextCitiesLayer']; roadPlaceTypes?: IApplication['roadPlaceTypes'] }
    ): Promise<estypes.SearchResponse<TextSearchHit>> {
      return withSpan(
        LocationSpanName.REPOSITORY_GEOTEXT_SEARCH,
        {
          attributes: {
            [LocationAttributes.QUERY_NAME]: params.name,
            [CommonSpanAttributes.ELASTIC_INDEX]: index,
          },
        },
        async (span) => {
          const response = await queryElastic<TextSearchHit>(client, {
            index,
            ...geotextQuery(params, textLanguage, elasticQueryBoosts, geotextLayerName),
          });

          span?.setAttributes({
            [CommonSpanAttributes.RESULT_COUNT]: response.hits.hits.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: response.took,
          });

          return response;
        }
      );
    },
  };
};

export type GeotextRepository = ReturnType<typeof createGeotextRepository>;

export const geotextRepositoryFactory: FactoryFunction<GeotextRepository> = (depContainer) => {
  return createGeotextRepository(
    depContainer.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS).geotext,
    depContainer.resolve<Logger>(SERVICES.LOGGER)
  );
};

export const GEOTEXT_REPOSITORY_SYMBOL = Symbol('GEOTEXT_REPOSITORY_SYMBOL');
