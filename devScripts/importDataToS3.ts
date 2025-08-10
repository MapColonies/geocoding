/* eslint-disable @typescript-eslint/naming-convention */
import { CreateBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3Config } from '../src/common/s3/interfaces';
import { ConfigType } from '../src/common/config';
import { s3ConfigPath } from '../src/common/constants';
import mockDataJson from './latLonConvertions.json';

const main = async (config: ConfigType): Promise<void> => {
  const s3Config = config.get(s3ConfigPath) as S3Config;
  const { accessKeyId, secretAccessKey, ...clientConfig } = s3Config;

  const s3Client = new S3Client({
    ...clientConfig,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  if (!s3Config.files.latLonConvertionTable) {
    throw new Error('No latLonConvertionTable file path provided');
  }

  const { bucket: Bucket, fileName: Key } = s3Config.files.latLonConvertionTable;

  try {
    await s3Client.send(new CreateBucketCommand({ Bucket, ACL: 'public-read' }));
  } catch (error) {
    console.error(error);
  }

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket,
        Key,
        Body: Buffer.from(JSON.stringify(mockDataJson), 'utf-8'),
      })
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export default main;
