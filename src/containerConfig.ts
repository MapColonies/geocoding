import config from 'config';
import { getOtelMixin } from '@map-colonies/telemetry';
import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { instancePerContainerCachingFactory } from 'tsyringe';
import { trace, metrics as OtelMetrics } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { Metrics } from '@map-colonies/telemetry';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { ScheduledTask } from 'node-cron';
import { HEALTHCHECK, ON_SIGNAL, SERVICES, SERVICE_NAME } from './common/constants';
import { tracing } from './common/tracing';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { elasticClientFactory, ElasticClients } from './common/elastic';
import { IApplication } from './common/interfaces';
import { TILE_REPOSITORY_SYMBOL, tileRepositoryFactory } from './control/tile/DAL/tileRepository';
import { TILE_ROUTER_SYMBOL, tileRouterFactory } from './control/tile/routes/tileRouter';
import { ITEM_ROUTER_SYMBOL, itemRouterFactory } from './control/item/routes/itemRouter';
import { ROUTE_REPOSITORY_SYMBOL, routeRepositoryFactory } from './control/route/DAL/routeRepository';
import { ROUTE_ROUTER_SYMBOL, routeRouterFactory } from './control/route/routes/routeRouter';
import { LAT_LON_ROUTER_SYMBOL, latLonRouterFactory } from './latLon/routes/latLonRouter';
import { GEOTEXT_REPOSITORY_SYMBOL, geotextRepositoryFactory } from './location/DAL/locationRepository';
import { GEOTEXT_SEARCH_ROUTER_SYMBOL, geotextSearchRouterFactory } from './location/routes/locationRouter';
import { cronLoadTileLatLonDataFactory, cronLoadTileLatLonDataSymbol } from './latLon/DAL/latLonDAL';
import { ITEM_REPOSITORY_SYMBOL, itemRepositoryFactory } from './control/item/DAL/itemRepository';
import { s3ClientFactory } from './common/s3';
import { S3_REPOSITORY_SYMBOL, s3RepositoryFactory } from './common/s3/s3Repository';
import { healthCheckFactory } from './common/utils';

export interface RegisterOptions {
  override?: InjectionObject<unknown>[];
  useChild?: boolean;
}

export const registerExternalValues = async (options?: RegisterOptions): Promise<DependencyContainer> => {
  const cleanupRegistry = new CleanupRegistry();
  try {
    const loggerConfig = config.get<LoggerOptions>('telemetry.logger');
    const logger = jsLogger({ ...loggerConfig, prettyPrint: loggerConfig.prettyPrint, mixin: getOtelMixin() });
    const cleanupRegistryLogger = logger.child({ subComponent: 'cleanupRegistry' });

    cleanupRegistry.on('itemFailed', (id, error, msg) => cleanupRegistryLogger.error({ msg, itemId: id, err: error }));
    cleanupRegistry.on('finished', (status) => cleanupRegistryLogger.info({ msg: `cleanup registry finished cleanup`, status }));

    const metrics = new Metrics();
    cleanupRegistry.register({ func: metrics.stop.bind(metrics), id: SERVICES.METER });
    metrics.start();

    cleanupRegistry.register({ func: tracing.stop.bind(tracing), id: SERVICES.TRACER });
    tracing.start();
    const tracer = trace.getTracer(SERVICE_NAME);

    const applicationConfig: IApplication = config.get<IApplication>('application');

    const dependencies: InjectionObject<unknown>[] = [
      { token: SERVICES.CONFIG, provider: { useValue: config } },
      { token: SERVICES.LOGGER, provider: { useValue: logger } },
      { token: SERVICES.TRACER, provider: { useValue: tracer } },
      { token: SERVICES.METER, provider: { useValue: OtelMetrics.getMeterProvider().getMeter(SERVICE_NAME) } },
      { token: SERVICES.APPLICATION, provider: { useValue: applicationConfig } },
      { token: HEALTHCHECK, provider: { useFactory: healthCheckFactory } },
      {
        token: ON_SIGNAL,
        provider: {
          useValue: cleanupRegistry.trigger.bind(cleanupRegistry),
        },
      },
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
            cleanupRegistry.register({
              func: async () => {
                await elasticClients.control.close();
                await elasticClients.geotext.close();
              },
              id: SERVICES.ELASTIC_CLIENTS,
            });
          } catch (err) {
            logger.error('Failed to connect to Elasticsearch', err);
          }
        },
      },
      {
        token: SERVICES.S3_CLIENT,
        provider: { useFactory: s3ClientFactory },
        postInjectionHook: async (deps: DependencyContainer): Promise<void> => {
          const s3Client = deps.resolve<S3Client>(SERVICES.S3_CLIENT);
          try {
            await s3Client.send(new ListBucketsCommand({}));
            logger.info('Connected to S3');
          } catch (err) {
            logger.error('Failed to connect to S3', err);
          }
          cleanupRegistry.register({ func: async () => s3Client.destroy(), id: SERVICES.S3_CLIENT });
        },
      },
      {
        token: S3_REPOSITORY_SYMBOL,
        provider: { useFactory: s3RepositoryFactory },
      },
      { token: TILE_REPOSITORY_SYMBOL, provider: { useFactory: tileRepositoryFactory } },
      { token: TILE_ROUTER_SYMBOL, provider: { useFactory: tileRouterFactory } },
      { token: ITEM_REPOSITORY_SYMBOL, provider: { useFactory: itemRepositoryFactory } },
      { token: ITEM_ROUTER_SYMBOL, provider: { useFactory: itemRouterFactory } },
      { token: ROUTE_REPOSITORY_SYMBOL, provider: { useFactory: routeRepositoryFactory } },
      { token: ROUTE_ROUTER_SYMBOL, provider: { useFactory: routeRouterFactory } },
      { token: LAT_LON_ROUTER_SYMBOL, provider: { useFactory: latLonRouterFactory } },
      { token: GEOTEXT_REPOSITORY_SYMBOL, provider: { useFactory: geotextRepositoryFactory } },
      { token: GEOTEXT_SEARCH_ROUTER_SYMBOL, provider: { useFactory: geotextSearchRouterFactory } },
      {
        token: cronLoadTileLatLonDataSymbol,
        provider: {
          useFactory: cronLoadTileLatLonDataFactory,
        },
        postInjectionHook: async (deps: DependencyContainer): Promise<void> => {
          const cronLoadTileLatLonData = deps.resolve<ScheduledTask>(cronLoadTileLatLonDataSymbol);
          cronLoadTileLatLonData.start();
          cleanupRegistry.register({
            func: async () => cronLoadTileLatLonData.stop.bind(cronLoadTileLatLonData),
            id: cronLoadTileLatLonDataSymbol,
          });
        },
      },
    ];
    const container = await registerDependencies(dependencies, options?.override, options?.useChild);
    return container;
  } catch (error) {
    await cleanupRegistry.trigger();
    throw error;
  }
};
