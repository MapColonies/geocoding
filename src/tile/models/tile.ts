import { Geometry, Feature } from 'geojson';

/* eslint-disable @typescript-eslint/naming-convention */
interface Properties {
  OBJECTID: number;
  ZONE: string;
  TILE_NAME: string;
  SUB_TILE_ID?: string;
  TILE_ID: null | string;
  LAYER_NAME: string;
  TYPE: string;
}

export interface Tile extends Feature<Geometry, Properties> {}
