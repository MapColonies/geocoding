import { Feature, Geometry } from 'geojson';

/* eslint-disable @typescript-eslint/naming-convention */
interface Properties {
  OBJECTID: number;
  OBJECT_COMMAND_NAME: string;
  FIRST_GFID: null; // TODO: findout real type
  SHAPE_Length: number;
  F_CODE: number;
  F_ATT: number;
  LAYER_NAME: string;
  ENTITY_HEB: string;
  TYPE: string;
}

export interface Route extends Feature<Geometry, Properties> {}
