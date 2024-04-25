import { Client, ClientOptions } from '@elastic/elasticsearch';

let client: Client | null = null;

export const initElasticsearchClient = async (clientOptions: ClientOptions): Promise<Client> => {
  if (!client) {
    client = new Client(clientOptions);
    try {
      await client.ping();
    } catch (error) {
      console.error('Elasticsearch cluster is down!', error);
      throw error;
    }
  }
  return client;
};

export const elasticClientSymbol = Symbol('elasticClient');
