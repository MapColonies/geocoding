/* eslint-disable @typescript-eslint/naming-convention */
import 'reflect-metadata';
import jsLogger from '@map-colonies/js-logger';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import { trace } from '@opentelemetry/api';
import { DeleteBucketCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getApp } from '../../src/app';
import { elasticConfigPath, SERVICES } from '../../src/common/constants';
import { IConfig } from '../../src/common/interfaces';
import { S3Config, s3ConfigPath } from '../../src/common/s3';
import { ElasticDbClientsConfig } from '../../src/common/elastic/interfaces';
import { ElasticClients } from '../../src/common/elastic';
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

  const s3Client = container.resolve<S3Client>(SERVICES.S3_CLIENT);
  const elasticClients = container.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS);

  const s3Config = config.get<S3Config>(s3ConfigPath);
  const elasticClientsConfig = config.get<ElasticDbClientsConfig>(elasticConfigPath);

  const clearS3Data = new Promise<void>((resolve, reject) => {
    void (async (): Promise<void> => {
      try {
        if (s3Config.files.latLonConvertionTable !== undefined) {
          await s3Client.send(
            new DeleteObjectCommand({ Bucket: s3Config.files.latLonConvertionTable.bucket, Key: s3Config.files.latLonConvertionTable.fileName })
          );
          await s3Client.send(new DeleteBucketCommand({ Bucket: s3Config.files.latLonConvertionTable.bucket }));
        }
        resolve();
      } catch (error) {
        console.error(error);
        reject(error);
      }
    })();
  });

  const clearElasticData = new Promise<void>((resolve, reject) => {
    void (async (): Promise<void> => {
      try {
        for (const [key, value] of Object.entries(elasticClientsConfig)) {
          await elasticClients[key as keyof ElasticDbClientsConfig].indices.delete({
            index: typeof value.properties.index === 'string' ? value.properties.index : Object.values(value.properties.index),
          });
        }
        resolve();
      } catch (error) {
        console.error(error);
        reject(error);
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
