import 'reflect-metadata';
import jsLogger from '@map-colonies/js-logger';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { trace } from '@opentelemetry/api';
import { getApp } from '../../src/app';
import { SERVICES } from '../../src/common/constants';
import { IConfig } from '../../src/common/interfaces';
import importDataToS3 from '../../devScripts/importDataToS3';
import importDataToElastic from '../../devScripts/importDataToElastic';
import { cronLoadTileLatLonDataSymbol } from '../../src/latLon/DAL/latLonDAL';

export default async (): Promise<void> => {
  const [app, container] = await getApp({
    override: [
      { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
      { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      {
        token: cronLoadTileLatLonDataSymbol,
        provider: { useValue: {} },
      },
    ],
    useChild: true,
  });

  const config = container.resolve<IConfig>(SERVICES.CONFIG);

  await Promise.allSettled([await importDataToS3(config), await importDataToElastic(config)]).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected') {
        throw result.reason;
      }
    });
  });

  const cleanupRegistry = container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
  await cleanupRegistry.trigger();
  container.reset();
  return;
};
