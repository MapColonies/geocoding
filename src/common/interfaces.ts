import { estypes } from '@elastic/elasticsearch';
import { BBox, Feature, FeatureCollection as GeoJSONFeatureCollection, GeoJsonProperties } from 'geojson';
import { RemoveUnderscore } from './utils';

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

export interface FeebackApiGeocodingResponse {
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

export interface GenericGeocodingResponse<T extends Feature, G = any> extends FeatureCollection<T> {
  geocoding: {
    version: string;
    query: G & CommonRequestParameters;
    response: Pick<estypes.SearchHitsMetadata, 'max_score'> & {
      /* eslint-disable @typescript-eslint/naming-convention */
      results_count?: estypes.SearchHitsMetadata['total'];
      match_latency_ms?: estypes.SearchResponse['took'];
      /* eslint-enable @typescript-eslint/naming-convention */
    } & { [key: string]: unknown };
  };
  bbox: BBox;
  features: (T & {
    properties: RemoveUnderscore<Pick<estypes.SearchHit<T>, '_score'>> &
      GeoJsonProperties & {
        matches: {
          layer: string;
          source: string;
          // eslint-disable-next-line @typescript-eslint/naming-convention
          source_id: string[];
        }[];
        names: {
          [key: string]: string | string[] | undefined;
          display: string;
          default: string[];
        };
      };
  })[];
}

export type GenericGeocodingFeatureResponse = GenericGeocodingResponse<Feature>['features'][number] &
  Pick<GenericGeocodingResponse<Feature>, 'geocoding'>;
