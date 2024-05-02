import { GeoJSON } from 'geojson';

/* eslint-disable @typescript-eslint/naming-convention */
export interface TextSearchHit {
  name: string;
  text: string[];
  tranlated_text: string[];
  geo_json: GeoJSON;
  source: string;
  source_id: string[];
  placetype: string;
  sub_placetype: string;
  layer_name: string;
  region: string[];
  sub_region: string[];
}
/* eslint-enable @typescript-eslint/naming-convention */
