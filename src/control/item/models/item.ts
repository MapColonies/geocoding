/* eslint-disable @typescript-eslint/naming-convention */
import { Feature } from 'geojson';
import { BaseControlFeatureProperties } from '../../interfaces';

export interface Item extends Feature {
  properties: BaseControlFeatureProperties & {
    TYPE: 'ITEM';
    OBJECT_COMMAND_NAME: string;
    LAYER_NAME: string;
    TIED_TO?: string;
    SUB_TYPE?: 'CONTROL_CROSS' | 'CONTROL_INFRASTRUCTURE' | 'CONTROL_POINT';
  };
}
