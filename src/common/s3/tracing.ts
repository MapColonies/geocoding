/* eslint-disable @typescript-eslint/naming-convention */
export const S3SpanName = {
  REPOSITORY_DOWNLOAD_FILE: 's3.repository.download_file',
} as const;

export type S3SpanName = (typeof S3SpanName)[keyof typeof S3SpanName];

export const S3Attributes = {
  BUCKET: 's3.bucket',
  FILE_NAME: 's3.file.name',
} as const;

export type S3Attributes = (typeof S3Attributes)[keyof typeof S3Attributes];
