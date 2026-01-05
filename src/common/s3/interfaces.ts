import { S3ClientConfig } from '@aws-sdk/client-s3';
import { type vectorGeocodingV2Type } from '@map-colonies/schemas';

export type BaseS3Config = vectorGeocodingV2Type['db']['s3'];

export type S3Config = BaseS3Config & S3ClientConfig;
