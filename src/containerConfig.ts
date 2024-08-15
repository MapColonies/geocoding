import config from 'config';
import { getOtelMixin } from '@map-colonies/telemetry';
import { DataSource } from 'typeorm';
import { instancePerContainerCachingFactory } from 'tsyringe';
import { trace, metrics as OtelMetrics } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { Metrics } from '@map-colonies/telemetry';
import { SERVICES, SERVICE_NAME } from './common/constants';
import { tracing } from './common/tracing';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { elasticClientFactory, ElasticClients } from './common/elastic';
import { IApplication } from './common/interfaces';
import { TILE_REPOSITORY_SYMBOL, tileRepositoryFactory } from './control/tile/DAL/tileRepository';
import { TILE_ROUTER_SYMBOL, tileRouterFactory } from './control/tile/routes/tileRouter';
import { ITEM_ROUTER_SYMBOL, itemRouterFactory } from './control/item/routes/itemRouter';
import { ROUTE_REPOSITORY_SYMBOL, routeRepositoryFactory } from './control/route/DAL/routeRepository';
import { ROUTE_ROUTER_SYMBOL, routeRouterFactory } from './control/route/routes/routeRouter';
import { postgresClientFactory } from './common/postgresql';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL, latLonRepositoryFactory } from './latLon/DAL/latLonRepository';
import { LAT_LON_ROUTER_SYMBOL, latLonRouterFactory } from './latLon/routes/latLonRouter';
import { GEOTEXT_REPOSITORY_SYMBOL, geotextRepositoryFactory } from './location/DAL/locationRepository';
import { GEOTEXT_SEARCH_ROUTER_SYMBOL, geotextSearchRouterFactory } from './location/routes/locationRouter';
import { cronLoadTileLatLonDataFactory, cronLoadTileLatLonDataSymbol } from './latLon/DAL/latLonDAL';
import { ITEM_REPOSITORY_SYMBOL, itemRepositoryFactory } from './control/item/DAL/itemRepository';

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

  const applicationConfig: IApplication = config.get<IApplication>('application');

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: config } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.METER, provider: { useValue: OtelMetrics.getMeterProvider().getMeter(SERVICE_NAME) } },
    { token: SERVICES.APPLICATION, provider: { useValue: applicationConfig } },
    {
      token: SERVICES.ELASTIC_CLIENTS,
      provider: { useFactory: instancePerContainerCachingFactory(elasticClientFactory) },
      postInjectionHook: async (deps: DependencyContainer): Promise<void> => {
        const elasticClients = deps.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS);
        try {
          const response = await Promise.all([elasticClients.control?.ping(), elasticClients.geotext?.ping()]);
          response.forEach((res) => {
            if (!res) {
              logger.error('Failed to connect to Elasticsearch', res);
            }
          });
        } catch (err) {
          logger.error('Failed to connect to Elasticsearch', err);
        }
      },
    },
    {
      token: DataSource,
      provider: { useFactory: postgresClientFactory },
      postInjectionHook: async (deps: DependencyContainer): Promise<void> => {
        const connection = deps.resolve<DataSource>(DataSource);
        try {
          await connection.initialize();
          logger.info('Connected to Postgres');
        } catch (err) {
          logger.error('Failed to connect to Postgres', err);
        }
      },
    },
    { token: TILE_REPOSITORY_SYMBOL, provider: { useFactory: tileRepositoryFactory } },
    { token: TILE_ROUTER_SYMBOL, provider: { useFactory: tileRouterFactory } },
    { token: ITEM_REPOSITORY_SYMBOL, provider: { useFactory: itemRepositoryFactory } },
    { token: ITEM_ROUTER_SYMBOL, provider: { useFactory: itemRouterFactory } },
    { token: ROUTE_REPOSITORY_SYMBOL, provider: { useFactory: routeRepositoryFactory } },
    { token: ROUTE_ROUTER_SYMBOL, provider: { useFactory: routeRouterFactory } },
    { token: LATLON_CUSTOM_REPOSITORY_SYMBOL, provider: { useFactory: latLonRepositoryFactory } },
    { token: LAT_LON_ROUTER_SYMBOL, provider: { useFactory: latLonRouterFactory } },
    { token: GEOTEXT_REPOSITORY_SYMBOL, provider: { useFactory: geotextRepositoryFactory } },
    { token: GEOTEXT_SEARCH_ROUTER_SYMBOL, provider: { useFactory: geotextSearchRouterFactory } },
    {
      token: cronLoadTileLatLonDataSymbol,
      provider: {
        useFactory: cronLoadTileLatLonDataFactory,
      },
    },
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
  const container = await registerDependencies(dependencies, options?.override, options?.useChild);
  return container;
};
