import * as https from 'https';
import * as http from 'http';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Logger } from '@map-colonies/js-logger';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { IConfig } from '../interfaces';
import { SERVICES } from '../constants';

const createConnectionOptions = (clientOptions: S3ClientConfig): S3ClientConfig => ({
  ...clientOptions,
  forcePathStyle: true,
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
    httpAgent: new http.Agent(),
  }),
});

const initS3Client = (clientOptions: S3ClientConfig): S3Client => {
  const client = new S3Client(createConnectionOptions(clientOptions));
  return client;
};

export const s3ClientFactory: FactoryFunction<S3Client> = (container: DependencyContainer): S3Client => {
  const config = container.resolve<IConfig>(SERVICES.CONFIG);
  const logger = container.resolve<Logger>(SERVICES.LOGGER);

  const s3Config = config.get<S3Config>(s3ConfigPath);

  const client = initS3Client(s3Config);
  logger.info(`S3 Client is initialized`);

  return client;
};

export type S3Config = S3ClientConfig & { bucketName: string } & {
  files: {
    [key: string]:
      | {
          bucket: string;
          fileName: string;
        }
      | undefined;
  };
};
export const s3ConfigPath = 'db.s3';
