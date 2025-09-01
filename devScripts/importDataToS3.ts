/* eslint-disable @typescript-eslint/naming-convention */
import { CreateBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigType } from '../src/common/config';
import { s3ConfigPath } from '../src/common/constants';
import mockDataJson from './latLonConvertions.json';

const main = async (config: ConfigType): Promise<void> => {
  const s3Config = config.get(s3ConfigPath);
  const { accessKeyId, secretAccessKey, ...clientConfig } = s3Config;

  const s3Client = new S3Client({
    ...clientConfig,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: s3Config.bucket, ACL: 'public-read' }));
  } catch (error) {
    console.error(error);
  }

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: s3Config.fileName,
        Body: Buffer.from(JSON.stringify(mockDataJson), 'utf-8'),
      })
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export default main;
