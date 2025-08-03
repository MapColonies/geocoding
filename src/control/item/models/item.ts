/* eslint-disable @typescript-eslint/naming-convention */
import type { Feature } from 'geojson';
import { BaseControlFeatureProperties } from '../../interfaces';

export interface Item extends Feature {
  properties: BaseControlFeatureProperties & {
    TYPE: 'ITEM';
    OBJECT_COMMAND_NAME: string;
    LAYER_NAME: string;
    TIED_TO?: string;
  };
}
