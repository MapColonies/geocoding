import type { GeoJSON, Geometry } from 'geojson';

/* eslint-disable @typescript-eslint/naming-convention */
export interface TextSearchHit {
  name: string;
  text: string[];
  translated_text: string[];
  geo_json: GeoJSON;
  source: string;
  source_id: string[];
  placetype: string;
  sub_placetype: string;
  layer_name: string;
  region: string[];
  sub_region: string[];
}

export interface PlaceTypeSearchHit {
  placetype: string;
  sub_placetype: string;
  sub_placetype_keyword: string;
}

export interface HierarchySearchHit {
  text: string;
  region: string;
  hierarchy: string;
  placetype: string;
  geo_json: string | Geometry;
  weight?: number;
}

/* eslint-enable @typescript-eslint/naming-convention */
