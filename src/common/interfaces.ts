import { ClientOptions } from '@elastic/elasticsearch';
import { DataSourceOptions } from 'typeorm';
import { Feature, FeatureCollection as GeoJSONFeatureCollection } from 'geojson';

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

export interface FeatureCollection<T extends Feature> extends GeoJSONFeatureCollection {
  features: T[];
}

export interface WGS84Coordinate {
  lat: number;
  lon: number;
}
