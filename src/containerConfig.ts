import config from 'config';
import { getOtelMixin } from '@map-colonies/telemetry';
import { trace, metrics as OtelMetrics } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe/dist/typings/types';
import jsLogger, { LoggerOptions } from '@map-colonies/js-logger';
import { Metrics } from '@map-colonies/telemetry';
import { SERVICES, SERVICE_NAME } from './common/constants';
import { tracing } from './common/tracing';
import { resourceNameRouterFactory, RESOURCE_NAME_ROUTER_SYMBOL } from './resourceName/routes/resourceNameRouter';
import { InjectionObject, registerDependencies } from './common/dependencyRegistration';
import { elasticClientSymbol, initElasticsearchClient } from './common/elastic';
import { DbConfig } from './common/interfaces';
import { ITEM_REPOSITORY_SYMBOL, itemRepositoryFactory } from './item/DAL/itemRepository';
import { ITEM_ROUTER_SYMBOL, itemRouterFactory } from './item/routes/itemRouter';

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

  const dataSourceOptions = config.get<DbConfig>('db.elastic');
  const elasticClient = await initElasticsearchClient(dataSourceOptions);

  const dependencies: InjectionObject<unknown>[] = [
    { token: SERVICES.CONFIG, provider: { useValue: config } },
    { token: SERVICES.LOGGER, provider: { useValue: logger } },
    { token: SERVICES.TRACER, provider: { useValue: tracer } },
    { token: SERVICES.METER, provider: { useValue: OtelMetrics.getMeterProvider().getMeter(SERVICE_NAME) } },
    { token: elasticClientSymbol, provider: { useValue: elasticClient } },
    { token: ITEM_REPOSITORY_SYMBOL, provider: { useFactory: itemRepositoryFactory } },
    { token: ITEM_ROUTER_SYMBOL, provider: { useFactory: itemRouterFactory } },
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
