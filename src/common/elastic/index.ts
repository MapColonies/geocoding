import { Client, ClientOptions } from '@elastic/elasticsearch';

export const initElasticsearchClient = async (clientOptions: ClientOptions): Promise<Client | null> => {
  const client = new Client({
    ...clientOptions,
    sniffOnStart: false,
    sniffOnConnectionFault: false,
    tls: {
      rejectUnauthorized: false,
    },
  });
  try {
    await client.ping();
  } catch (error) {
    console.error("Can't connect to Elasticseach!", clientOptions.node, error);
    return null;
  }

  return client;
};

export const elasticClientSymbol = Symbol('elasticClient');
