import { Logger } from '@map-colonies/js-logger';
import { Client } from '@elastic/elasticsearch';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { ConfigType } from '../config';
import { elasticConfigPath, SERVICES } from '../constants';
import { ElasticDbClientsConfig, ElasticGeotextClientConfig } from './interfaces';

const createConnectionOptions = (clientOptions: ElasticGeotextClientConfig): ElasticGeotextClientConfig => ({
  ...clientOptions,
  sniffOnStart: false,
  sniffOnConnectionFault: false,
  tls: {
    rejectUnauthorized: false,
  },
});

const initElasticsearchClient = (clientOptions: ElasticGeotextClientConfig): ElasticClient => {
  const client = new Client(createConnectionOptions(clientOptions));
  return client;
};

export const elasticClientsFactory: FactoryFunction<ElasticClients> = (container: DependencyContainer): ElasticClients => {
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
  const logger = container.resolve<Logger>(SERVICES.LOGGER);

  const elasticClientsConfig = config.get(elasticConfigPath) as ElasticDbClientsConfig;

  const elasticClients = {} as ElasticClients;

  for (const [key, value] of Object.entries(elasticClientsConfig)) {
    elasticClients[key as keyof ElasticDbClientsConfig] = initElasticsearchClient(value as ElasticGeotextClientConfig);
    logger.info(`Elasticsearch client for ${key} is initialized`);
  }

  return elasticClients;
};

export type ElasticClient = Client;
export type ElasticClients = Record<keyof ElasticDbClientsConfig, ElasticClient>;
