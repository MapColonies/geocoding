import type { GeoJSON } from 'geojson';
import { HierarchySearchHit } from './models/elasticsearchHits';

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
  regions?: string[];
  name?: string;
  placeTypes?: string[];
  subPlaceTypes?: string[];
  hierarchies: HierarchySearchHit[];
  limit: number;
}

export interface GetGeotextSearchParams {
  query: string;
  limit: number;
  source?: string[];
  viewbox?: string;
  boundary?: string;
  region?: string[];
}

/* eslint-disable @typescript-eslint/naming-convention */

export interface QueryResult {
  type: string;
  geocoding: { version?: string; query: TextSearchParams; name?: string };
  features: {
    type: string;
    geometry?: GeoJSON;
    properties: {
      rank: number;
      source?: string;
      source_id?: string[];
      layer?: string;
      name: {
        [key: string]: string | string[] | undefined;
      };
      highlight?: Record<string, string[]>;
      placetype?: string;
      sub_placetype?: string;
      region?: string[];
      sub_region?: string[];
      regions?: { region: string; sub_regions: string[] }[];
    };
  }[];
}
/* eslint-enable @typescript-eslint/naming-convention */

//Defenitions
export const POINT_LENGTH = 2;
export const BBOX_LENGTH = 4;
export const INDEX_NOT_FOUND = -1;
