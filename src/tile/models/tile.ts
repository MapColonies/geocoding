import { Geometry } from '../../common/interfaces';

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

export interface Tile {
  type: string;
  id: number;
  geometry: Geometry;
  properties: Properties;
}
