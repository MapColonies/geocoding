import type { GeoJSON } from 'geojson';
import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters } from '../common/interfaces';
import { ConvertCamelToSnakeCase, ConvertSnakeToCamelCase, RemoveUnderscore } from '../common/utils';
import { HierarchySearchHit } from './models/elasticsearchHits';

export interface PlaceType {
  placetype: string;
  confidence: number;
}

export interface TokenResponse {
  tokens: string[];
  prediction: string[];
}

export interface TextSearchParams extends ConvertSnakeToCamelCase<GetGeotextSearchParams> {
  name?: string;
  placeTypes?: string[];
  subPlaceTypes?: string[];
  hierarchies: HierarchySearchHit[];
}

export interface GetGeotextSearchParams extends CommonRequestParameters {
  query: string;
  source?: string[];
  region?: string[];
}

/* eslint-disable @typescript-eslint/naming-convention */

export interface QueryResult {
  type: string;
  geocoding: {
    version?: string;
    query: ConvertCamelToSnakeCase<GetGeotextSearchParams>;
    response: { max_score: number; results_count: number; match_latency_ms: number } & Partial<
      ConvertCamelToSnakeCase<Pick<TextSearchParams, 'name' | 'placeTypes' | 'subPlaceTypes' | 'hierarchies'>>
    >;
  };
  features: ({
    type: string;
    geometry?: GeoJSON;
    properties: {
      matches: {
        source?: string;
        source_id?: string[];
        layer?: string;
      };
      name: {
        [key: string]: string | string[] | undefined;
        display: string;
        default: string[];
      };
      placetype?: string;
      sub_placetype?: string;
      regions?: { region: string; sub_region_names: string[] }[];
    };
  } & RemoveUnderscore<Pick<estypes.SearchHit, '_score'>>)[];
}
/* eslint-enable @typescript-eslint/naming-convention */

//Defenitions
export const POINT_LENGTH = 2;
export const BBOX_LENGTH = 4;
export const INDEX_NOT_FOUND = -1;
