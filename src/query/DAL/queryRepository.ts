import config from 'config';
import { Client, estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { elasticClientSymbol } from '../../common/elastic';
import { cleanQuery, fetchNLPService } from '../utils';
import { PlaceType, TextSearchParams, TokenResponse } from '../interfaces';
import { TextSearchHit } from '../models/textSearchHit';
import { BadRequestError } from '../../common/errors';
import { ElasticClients } from '../../common/interfaces';
import { esQuery } from './queries';

/* eslint-enable @typescript-eslint/naming-convention */

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createQueryRepository = (client: Client) => {
  return {
    async extractName(endpoint: string, query: string): Promise<string> {
      const tokensRaw = cleanQuery(query);
      const response = await fetchNLPService<TokenResponse>(endpoint, { tokens: tokensRaw });

      const { tokens, prediction } = response[0];

      if (!tokens || !prediction) {
        throw new BadRequestError('No tokens or prediction');
      }

      const nameTokens = tokens.filter((_, index) => prediction[index] === 'name');

      return nameTokens.join(' ');
    },

    async getPlaceType(endpoint: string, query: string): Promise<PlaceType> {
      const response = await fetchNLPService<PlaceType>(endpoint, {
        text: query,
        start: 0,
        end: query.length,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        entity_text: query,
      });

      return response[0];
    },

    async queryElastic(params: TextSearchParams): Promise<estypes.SearchResponse<TextSearchHit>> {
      const index = config.get<string>('db.elastic.nlp.properties.index');

      const response = await client.search<TextSearchHit>({
        index,
        body: esQuery(params),
      });

      return response;
    },
  };
};

export type QueryRepository = ReturnType<typeof createQueryRepository>;

export const queryRepositoryFactory: FactoryFunction<QueryRepository> = (depContainer) => {
  return createQueryRepository(depContainer.resolve<ElasticClients>(elasticClientSymbol).nlp);
};

export const QUERY_REPOSITORY_SYMBOL = Symbol('QUERY_REPOSITORY_SYMBOL');
