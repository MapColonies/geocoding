// /* eslint-disable @typescript-eslint/naming-convention */
// import jsLogger from '@map-colonies/js-logger';
// import { DeleteBucketCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
// import { trace } from '@opentelemetry/api';
// import { getApp } from '../../src/app';
// import { elasticConfigPath, SERVICES } from '../../src/common/constants';
// import { S3Config, s3ConfigPath } from '../../src/common/s3';
// import { IConfig } from '../../src/common/interfaces';
// import importDataToS3 from '../../devScripts/importDataToS3';
// import importDataToElastic from '../../devScripts/importDataToElastic';
// import { ElasticClients } from '../../src/common/elastic';
// import { ElasticDbClientsConfig } from '../../src/common/elastic/interfaces';

// let s3Client: S3Client;
// let s3Config: S3Config | undefined;
// let elasticClients: ElasticClients;
// let elasticClientsConfig: ElasticDbClientsConfig;

// beforeAll(async function () {
//   const app = await getApp({
//     override: [
//       { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
//       { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
//     ],
//     useChild: true,
//   });

//   const config = app.container.resolve<IConfig>(SERVICES.CONFIG);

//   s3Client = app.container.resolve(SERVICES.S3_CLIENT);
//   s3Config = config.get<S3Config>(s3ConfigPath);

//   elasticClients = app.container.resolve(SERVICES.ELASTIC_CLIENTS);
//   elasticClientsConfig = config.get<ElasticDbClientsConfig>(elasticConfigPath);

//   await Promise.allSettled([await importDataToS3(config), await importDataToElastic(config)]).then((results) => {
//     results.forEach((result) => {
//       if (result.status === 'rejected') {
//         throw result.reason;
//       }
//     });
//   });
// });

// afterAll(async function () {
//   const clearS3Data = new Promise<void>((resolve, reject) => {
//     void (async (): Promise<void> => {
//       try {
//         if (s3Config?.files.latLonConvertionTable !== undefined) {
//           await s3Client.send(
//             new DeleteObjectCommand({ Bucket: s3Config.files.latLonConvertionTable.bucket, Key: s3Config.files.latLonConvertionTable.fileName })
//           );
//           await s3Client.send(new DeleteBucketCommand({ Bucket: s3Config.files.latLonConvertionTable.bucket }));
//         }
//         resolve();
//       } catch (error) {
//         console.error(error);
//         reject(error);
//       }
//     })();
//   });

//   const clearElasticData = new Promise<void>((resolve, reject) => {
//     void (async (): Promise<void> => {
//       try {
//         for (const [key, _] of Object.entries(elasticClientsConfig)) {
//           await elasticClients[key as keyof ElasticDbClientsConfig].indices.delete({ index: '*' });
//         }
//         resolve();
//       } catch (error) {
//         console.error(error);
//         reject(error);
//       }
//     })();
//   });

//   await Promise.allSettled([clearS3Data, clearElasticData]).then((results) => {
//     results.forEach((result) => {
//       if (result.status === 'rejected') {
//         throw result.reason;
//       }
//     });
//   });
// });
