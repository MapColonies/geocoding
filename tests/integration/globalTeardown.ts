/* eslint-disable @typescript-eslint/naming-convention */
import 'reflect-metadata';
import jsLogger from '@map-colonies/js-logger';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { trace } from '@opentelemetry/api';
import { DeleteBucketCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getApp } from '../../src/app';
import { elasticConfigPath, s3ConfigPath, SERVICES } from '../../src/common/constants';
import { ElasticClients } from '../../src/common/elastic';
import { cronLoadTileLatLonDataSymbol } from '../../src/latLon/DAL/latLonDAL';
import { ConfigType } from '../../src/common/config';

export default async (): Promise<void> => {
  const [, container] = await getApp({
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

  const config = container.resolve<ConfigType>(SERVICES.CONFIG);

  const s3Client = container.resolve<S3Client>(SERVICES.S3_CLIENT);
  const elasticClients = container.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS);

  const s3Config = config.get(s3ConfigPath);
  const elasticClientsConfig = config.get(elasticConfigPath);

  const clearS3Data = new Promise<void>((resolve, reject) => {
    void (async (): Promise<void> => {
      try {
        await s3Client.send(new DeleteObjectCommand({ Bucket: s3Config.bucket, Key: s3Config.fileName }));
        await s3Client.send(new DeleteBucketCommand({ Bucket: s3Config.bucket }));
        resolve();
      } catch (error) {
        console.error(error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    })();
  });

  const clearElasticData = new Promise<void>((resolve, reject) => {
    void (async (): Promise<void> => {
      try {
        const clients = ['control', 'geotext'] as const;

        for (const clientKey of clients) {
          const { index } = elasticClientsConfig[clientKey];
          const indices = typeof index === 'string' ? index : Object.values(index);

          await elasticClients[clientKey].indices.delete({
            index: indices,
          });
        }

        resolve();
      } catch (error) {
        console.error(error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    })();
  });

  await Promise.allSettled([clearS3Data, clearElasticData]).then((results) => {
    results.forEach((result) => {
      if (result.status === 'rejected') {
        throw result.reason;
      }
    });
  });

  const cleanupRegistry = container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
  await cleanupRegistry.trigger();
  container.reset();
  await container.dispose();

  console.log('Global Teardown completed');
  return;
};
