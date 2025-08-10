import * as https from 'https';
import * as http from 'http';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Logger } from '@map-colonies/js-logger';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { s3ConfigPath, SERVICES } from '../constants';
import { ConfigType } from '../config';
import { S3Config } from './interfaces';

const createConnectionOptions = (clientOptions: S3Config): S3ClientConfig => ({
  endpoint: clientOptions.endpoint,
  region: clientOptions.region,
  forcePathStyle: true,
  credentials: {
    accessKeyId: clientOptions.accessKeyId,
    secretAccessKey: clientOptions.secretAccessKey,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
    httpAgent: new http.Agent(),
  }),
});

const initS3Client = (clientOptions: S3Config): S3Client => {
  const client = new S3Client(createConnectionOptions(clientOptions));
  return client;
};

export const s3ClientFactory: FactoryFunction<S3Client> = (container: DependencyContainer): S3Client => {
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
  const logger = container.resolve<Logger>(SERVICES.LOGGER);

  const s3Config = config.get(s3ConfigPath);

  const client = initS3Client(s3Config);
  logger.info(`S3 Client is initialized`);

  return client;
};
