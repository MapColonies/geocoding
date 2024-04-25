import { ClientOptions } from '@elastic/elasticsearch';

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

export type DbConfig = ClientOptions;

export interface GeoContext {
  bbox?: number[];
  radius?: number;
  lon?: number;
  lat?: number;
}
