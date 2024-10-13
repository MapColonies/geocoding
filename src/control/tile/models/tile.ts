/* eslint-disable @typescript-eslint/naming-convention */
import { Feature, GeoJsonProperties } from 'geojson';

export interface Tile extends Feature {
  properties: GeoJsonProperties & {
    TYPE: 'TILE' | 'SUB_TILE';
    TILE_NAME?: string;
    SUB_TILE_ID?: string;
    LAYER_NAME?: string;
  };
}
