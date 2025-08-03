/* eslint-disable @typescript-eslint/naming-convention */
import type { Feature } from 'geojson';
import { BaseControlFeatureProperties } from '../../interfaces';

export interface Route extends Feature {
  properties: BaseControlFeatureProperties & {
    TYPE: 'ROUTE';
    OBJECT_COMMAND_NAME: string;
    TIED_TO?: string;
    ENTITY_HEB: string;
    LAYER_NAME: string;
  };
}
