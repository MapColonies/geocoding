import config from 'config';
import { getOtelMixin } from '@map-colonies/telemetry';
import { DataSource } from 'typeorm';
import { trace, metrics as OtelMetrics } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { Metrics } from '@map-colonies/telemetry';
import { SERVICES, SERVICE_NAME } from './common/constants';
import { tracing } from './common/tracing';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { elasticClientSymbol, initElasticsearchClient } from './common/elastic';
import { ElasticDbConfig, PostgresDbConfig } from './common/interfaces';
import { TILE_REPOSITORY_SYMBOL, tileRepositoryFactory } from './tile/DAL/tileRepository';
import { TILE_ROUTER_SYMBOL, tileRouterFactory } from './tile/routes/tileRouter';
import { ITEM_REPOSITORY_SYMBOL, itemRepositoryFactory } from './item/DAL/itemRepository';
import { ITEM_ROUTER_SYMBOL, itemRouterFactory } from './item/routes/itemRouter';
import { ROUTE_REPOSITORY_SYMBOL, routeRepositoryFactory } from './route/DAL/routeRepository';
import { ROUTE_ROUTER_SYMBOL, routeRouterFactory } from './route/routes/routeRouter';
import { initDataSource } from './common/postgresql';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL, latLonRepositoryFactory } from './latLon/DAL/latLonRepository';
import { LAT_LON_ROUTER_SYMBOL, latLonRouterFactory } from './latLon/routes/latLonRouter';
import { QUERY_REPOSITORY_SYMBOL, queryRepositoryFactory } from './query/DAL/queryRepository';
import { QUERY_ROUTER_SYMBOL, queryRouterFactory } from './query/routes/queryRouter';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
  const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });

  const metrics = new Metrics();
  metrics.start();

  tracing.start();
  const tracer = trace.getTracer(SERVICE_NAME);

  const elasticDataSourceOptions = config.get<ElasticDbConfig>('db.elastic');
  const postgresqlDataSourceOptions = config.get<PostgresDbConfig>('db.postgresql');
  const elasticClient = await initElasticsearchClient(elasticDataSourceOptions);
  const postgresqlConnection = await initDataSource(postgresqlDataSourceOptions);

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: config } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.METER, provider: { useValue: OtelMetrics.getMeterProvider().getMeter(SERVICE_NAME) } },
    { token: elasticClientSymbol, provider: { useValue: elasticClient } },
    { token: DataSource, provider: { useValue: postgresqlConnection } },
    { token: TILE_REPOSITORY_SYMBOL, provider: { useFactory: tileRepositoryFactory } },
    { token: TILE_ROUTER_SYMBOL, provider: { useFactory: tileRouterFactory } },
    { token: ITEM_REPOSITORY_SYMBOL, provider: { useFactory: itemRepositoryFactory } },
    { token: ITEM_ROUTER_SYMBOL, provider: { useFactory: itemRouterFactory } },
    { token: ROUTE_REPOSITORY_SYMBOL, provider: { useFactory: routeRepositoryFactory } },
    { token: ROUTE_ROUTER_SYMBOL, provider: { useFactory: routeRouterFactory } },
    { token: LATLON_CUSTOM_REPOSITORY_SYMBOL, provider: { useFactory: latLonRepositoryFactory } },
    { token: LAT_LON_ROUTER_SYMBOL, provider: { useFactory: latLonRouterFactory } },
    { token: QUERY_REPOSITORY_SYMBOL, provider: { useFactory: queryRepositoryFactory } },
    { token: QUERY_ROUTER_SYMBOL, provider: { useFactory: queryRouterFactory } },
    {
      token: 'onSignal',
      provider: {
        useValue: {
          useValue: async (): Promise<void> => {
            await Promise.all([tracing.stop(), metrics.stop()]);
          },
        },
      },
    },
  ];

  return registerDependencies(dependencies, options?.override, options?.useChild);
};
