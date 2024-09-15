import { BBox, Feature, FeatureCollection as GeoJSONFeatureCollection } from 'geojson';

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

export interface GeoContext {
  bbox?: BBox;
  radius?: number;
  lon?: number;
  lat?: number;
  x?: number;
  y?: number;
  zone?: number;
}

export interface FeatureCollection<T extends Feature> extends GeoJSONFeatureCollection {
  features: T[];
}

export interface WGS84Coordinate {
  lat: number;
  lon: number;
}

export interface IApplication {
  services: {
    tokenTypesUrl: string;
  };
  cronLoadTileLatLonDataPattern: string;
  elasticQueryBoosts: {
    name: number;
    placeType: number;
    subPlaceType: number;
    hierarchy: number;
    viewbox: number;
  };
  sources?: {
    [key: string]: string;
  };
  regions?: {
    [key: string]: string[];
  };
  nameTranslationsKeys: string[];
  mainLanguageRegex: string;
  controlObjectDisplayNamePrefixes: {
    [key: string]: string;
  };
}

export enum GeoContextMode {
  FILTER = 'filter',
  BIAS = 'bias',
}

export interface GeocodingResponse {
  userId: string;
  apiKey: string;
  site: string;
  response: JSON;
  respondedAt: Date;
}

/* eslint-disable @typescript-eslint/naming-convention */
export interface CommonRequestParameters {
  geo_context?: GeoContext;
  geo_context_mode?: GeoContextMode;
  limit: number;
  disable_fuzziness: boolean;
}
/* eslint-enable @typescript-eslint/naming-convention */
