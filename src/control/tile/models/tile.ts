/* eslint-disable @typescript-eslint/naming-convention */
import { Feature } from 'geojson';
import { BaseControlFeatureProperties } from '../../interfaces';

export interface Tile extends Feature {
  properties: BaseControlFeatureProperties & {
    TYPE: 'TILE' | 'SUB_TILE';
    TILE_NAME?: string;
    SUB_TILE_ID?: string;
    LAYER_NAME?: string;
  };
}
