/* eslint-disable @typescript-eslint/naming-convention */
import { Feature, GeoJsonProperties } from 'geojson';

export interface Item extends Feature {
  properties: GeoJsonProperties & {
    TYPE: 'ITEM';
    OBJECT_COMMAND_NAME: string;
    LAYER_NAME: string;
    TIED_TO?: string;
  };
}
