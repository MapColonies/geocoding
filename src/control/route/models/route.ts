/* eslint-disable @typescript-eslint/naming-convention */
import { Feature, GeoJsonProperties } from 'geojson';

export interface Route extends Feature {
  properties: GeoJsonProperties & {
    TYPE: 'ROUTE';
    OBJECT_COMMAND_NAME: string;
    ENTITY_HEB: string;
    LAYER_NAME: string;
  };
}
