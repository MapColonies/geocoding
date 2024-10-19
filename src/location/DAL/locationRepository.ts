import { Logger } from '@map-colonies/js-logger';
import { estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { ElasticClient } from '../../common/elastic';
import { cleanQuery, fetchNLPService } from '../utils';
import { TextSearchParams, TokenResponse } from '../interfaces';
import { PlaceTypeSearchHit, HierarchySearchHit, TextSearchHit } from '../models/elasticsearchHits';
import { BadRequestError } from '../../common/errors';
import { IApplication } from '../../common/interfaces';
import { ElasticClients } from '../../common/elastic';
import { queryElastic } from '../../common/elastic/utils';
import { SERVICES } from '../../common/constants';
import { hierarchyQuery, placetypeQuery, geotextQuery } from './queries';

/* eslint-enable @typescript-eslint/naming-convention */

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createGeotextRepository = (client: ElasticClient, logger: Logger) => {
  return {
    async extractName(endpoint: string, query: string): Promise<{ name: string; latency: number }> {
      const tokensRaw = cleanQuery(query);
      const { data: response, latency } = await fetchNLPService<Partial<TokenResponse>>(endpoint, { tokens: tokensRaw });

      const { tokens, prediction } = response[0];

      if (!tokens || !tokens.length || !prediction || !prediction.length) {
        logger.error('No tokens or prediction');
        throw new BadRequestError('No tokens or prediction');
      }

      const nameTokens = tokens.filter((_, index) => prediction[index] === 'name');

      return { name: nameTokens.join(' '), latency };
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

      return {
        placeTypes,
        subPlaceTypes,
        matchLatencyMs,
      };
    },

    async extractHierarchy(
      index: string,
      query: string,
      hierarchyBoost: number,
      disableFuzziness: boolean
    ): Promise<{ hierarchies: HierarchySearchHit[]; matchLatencyMs: number }> {
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

      return { hierarchies, matchLatencyMs };
    },

    async geotextSearch(
      index: string,
      params: TextSearchParams,
      textLanguage: string,
      elasticQueryBoosts: IApplication['elasticQueryBoosts']
    ): Promise<estypes.SearchResponse<TextSearchHit>> {
      const response = await queryElastic<TextSearchHit>(client, { index, ...geotextQuery(params, textLanguage, elasticQueryBoosts) });
      return response;
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
