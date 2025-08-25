import { estypes } from '@elastic/elasticsearch';
import { ServiceUnavailableError } from '../errors';
import { ElasticClient } from './index';

export const queryElastic = async <T>(client: ElasticClient, body: estypes.SearchRequest): Promise<estypes.SearchResponse<T>> => {
  const clientNotAvailableError = new ServiceUnavailableError(
    'Elasticsearch client is not available. As for, the search request cannot be executed.'
  );
  try {
    if (!(await client.ping())) {
      throw clientNotAvailableError;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    throw clientNotAvailableError;
  }

  return client.search<T>(body);
};
