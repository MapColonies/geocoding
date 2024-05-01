import type { GeoJSON } from 'geojson';

export interface PlaceType {
  placetype: string;
  confidence: number;
}

export interface TokenResponse {
  tokens: string[];
  prediction: string[];
}

export interface TextSearchParams {
  query: string;
  viewbox?: GeoJSON;
  boundary?: GeoJSON;
  sources?: string[];
  name?: string;
  placeType?: PlaceType;
  limit?: number;
}

export interface GetQueryQueryParams {
  query: string;
  limit: number;
  sources?: string[];
  viewbox: string;
  boundary: string;
}

/* eslint-disable @typescript-eslint/naming-convention */

export interface QueryResult {
  type: string;
  geocoding: TextSearchParams;
  features: {
    type: string;
    geometry?: GeoJSON;
    properties: {
      rank: number;
      source?: string;
      layer?: string;
      source_id?: string[];
      name: {
        default?: string;
        primary?: string[];
        tranlated?: string[];
      };
      highlight?: Record<string, string[]>;
      placetype?: string;
      sub_placetype?: string;
      region?: string[];
      sub_region?: string[];
    };
  }[];
}
/* eslint-enable @typescript-eslint/naming-convention */

//Defenitions
export const POINT_LENGTH = 2;
export const BBOX_LENGTH = 4;
export const INDEX_NOT_FOUND = -1;
