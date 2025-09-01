/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import path from 'path';
import { Logger } from '@map-colonies/js-logger';
import { FactoryFunction } from 'tsyringe';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SERVICES, s3ConfigPath } from '../constants';
import { ConfigType } from '../config';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createS3Repository = (s3Client: S3Client, config: ConfigType, logger: Logger) => {
  return {
    async downloadFile(): Promise<string> {
      try {
        const bucket = config.get(s3ConfigPath).bucket;
        const fileName = config.get(s3ConfigPath).fileName;

        logger.info(`Downloading ${fileName} file from S3`);

        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: fileName,
        });

        const { Body } = await s3Client.send(command);

        const filePath = path.join(__dirname, 'downloads', fileName);

        try {
          await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        } catch {
          //folder already exists
        }

        await new Promise<void>((resolve, reject) => {
          (Body as NodeJS.ReadableStream)
            .pipe(fs.createWriteStream(filePath))
            .on('error', (err: Error) => {
              reject(err);
            })
            .on('close', () => {
              logger.info('table.json file was downloaded successfully');
              resolve();
            });
        });

        return filePath;
      } catch (error) {
        logger.error({ msg: `Error while downloading ${__filename}'s data from S3.`, error });
        throw error;
      }
    },
  };
};

export const s3RepositoryFactory: FactoryFunction<S3Repository> = (depContainer) => {
  return createS3Repository(
    depContainer.resolve<S3Client>(SERVICES.S3_CLIENT),
    depContainer.resolve<ConfigType>(SERVICES.CONFIG),
    depContainer.resolve<Logger>(SERVICES.LOGGER)
  );
};

export type S3Repository = ReturnType<typeof createS3Repository>;

export const S3_REPOSITORY_SYMBOL = Symbol('S3_REPOSITORY_SYMBOL');
