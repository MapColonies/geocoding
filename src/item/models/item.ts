import { Feature, Geometry } from 'geojson';

/* eslint-disable @typescript-eslint/naming-convention */
interface Properties {
  OBJECTID: number;
  F_CODE: number;
  F_ATT: number;
  VIEW_SCALE_50K_CONTROL: number;
  NAME: null; // TODO: Check if this is correct
  GFID: string;
  OBJECT_COMMAND_NAME: string;
  SUB_TILE_NAME: null; // TODO: Check if this is correct
  TILE_NAME: string;
  TILE_ID: null | string;
  SUB_TILE_ID?: string;
  'SHAPE.AREA': number;
  'SHAPE.LEN': number;
  LAYER_NAME: string;
  ENTITY_HEB: string;
  TYPE: string;
}

export interface Item extends Feature<Geometry, Properties> {}
