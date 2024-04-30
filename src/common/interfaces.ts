import { ClientOptions } from '@elastic/elasticsearch';
import { DataSourceOptions } from 'typeorm';

export interface IConfig {
  get: <T>(setting: string) => T;
  has: (setting: string) => boolean;
}

export interface OpenApiConfig {
  filePath: string;
  basePath: string;
  jsonPath: string;
  uiPath: string;
}

export type ElasticDbConfig = ClientOptions;

export type PostgresDbConfig = {
  enableSslAuth: boolean;
  sslPaths: { ca: string; cert: string; key: string };
} & DataSourceOptions;

export interface GeoContext {
  bbox?: number[];
  radius?: number;
  lon?: number;
  lat?: number;
}

export interface Geometry {
  type: string;
  coordinates: number[][][];
}
