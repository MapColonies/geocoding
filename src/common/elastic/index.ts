import { Logger } from '@map-colonies/js-logger';
import { Client, ClientOptions } from '@elastic/elasticsearch';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { IConfig } from '../interfaces';
import { elasticConfigPath, SERVICES } from '../constants';
import { ElasticDbClientsConfig, ElasticDbConfig } from './interfaces';

const createConnectionOptions = (clientOptions: ClientOptions): ClientOptions => ({
  ...clientOptions,
  sniffOnStart: false,
  sniffOnConnectionFault: false,
  tls: {
    rejectUnauthorized: false,
  },
});

const initElasticsearchClient = (clientOptions: ClientOptions): ElasticClient => {
  const client = new Client(createConnectionOptions(clientOptions));
  return client;
};

export type ElasticClient = Client | null;

export const elasticClientFactory: FactoryFunction<ElasticClients> = (container: DependencyContainer): ElasticClients => {
  const config = container.resolve<IConfig>(SERVICES.CONFIG);
  const logger = container.resolve<Logger>(SERVICES.LOGGER);

  const elasticClientsConfig = config.get<ElasticDbClientsConfig>(elasticConfigPath);

  const elasticClients = {} as ElasticClients;

  for (const [key, value] of Object.entries(elasticClientsConfig)) {
    try {
      const client = initElasticsearchClient(value as ElasticDbConfig);
      elasticClients[key as keyof ElasticDbClientsConfig] = client;
    } catch (err) {
      logger.error('Failed to connect to Elasticsearch', err);
      elasticClients[key as keyof ElasticDbClientsConfig] = null;
    }
  }

  return elasticClients;
};

export type ElasticClients = Record<keyof ElasticDbClientsConfig, ElasticClient>;
