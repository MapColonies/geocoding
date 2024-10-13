/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { CreateBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3Config, s3ConfigPath } from '../src/common/s3';
import { IConfig } from '../src/common/interfaces';
import mockDataJson from './latLonConvertions.json';

const main = async (config: IConfig): Promise<void> => {
  const s3Config = config.get<S3Config>(s3ConfigPath);
  const s3Client = new S3Client({ ...s3Config });

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
