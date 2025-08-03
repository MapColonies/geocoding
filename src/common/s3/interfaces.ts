import { S3ClientConfig } from '@aws-sdk/client-s3';
import { type vectorGeocodingV1Type } from '@map-colonies/schemas';

export type BaseS3Config = vectorGeocodingV1Type['db']['s3'];

export type S3FileType = vectorGeocodingV1Type['db']['s3']['files']['latLonConvertionTable'];

export type S3Config = BaseS3Config & S3ClientConfig;
