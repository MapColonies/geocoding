/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import path from 'path';
import { Logger } from '@map-colonies/js-logger';
import { FactoryFunction } from 'tsyringe';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SERVICES } from '../constants';
import { IConfig } from '../interfaces';
import { S3Config, s3ConfigPath } from '.';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createS3Repository = (s3Client: S3Client, config: IConfig, logger: Logger) => {
  return {
    async downloadFile(key: keyof S3Config['files']): Promise<string> {
      try {
        const fileData = config.get<S3Config>(s3ConfigPath).files[key];
        if (!fileData) {
          throw new Error(`${key} data is missing in the configuration`);
        }
        const { bucket: Bucket, fileName: Key } = fileData;
        logger.info(`Downloading ${Key} file from S3`);

        const command = new GetObjectCommand({
          Bucket,
          Key,
        });

        const { Body } = await s3Client.send(command);

        const filePath = path.join(__dirname, 'downloads', Key);

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
        logger.error(`Error while downloading ${key}'s data from S3. Error: ${(error as Error).message}`);
        throw error;
      }
    },
  };
};

export const s3RepositoryFactory: FactoryFunction<S3Repository> = (depContainer) => {
  return createS3Repository(
    depContainer.resolve<S3Client>(SERVICES.S3_CLIENT),
    depContainer.resolve<IConfig>(SERVICES.CONFIG),
    depContainer.resolve<Logger>(SERVICES.LOGGER)
  );
};

export type S3Repository = ReturnType<typeof createS3Repository>;

export const S3_REPOSITORY_SYMBOL = Symbol('S3_REPOSITORY_SYMBOL');
