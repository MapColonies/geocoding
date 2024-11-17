/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-magic-numbers */

import { Tile } from '../../src/control/tile/models/tile';

export const RIT_TILE: Tile = {
  type: 'Feature',
  geometry: {
    coordinates: [
      [
        [12.539507865186607, 41.851751203650096],
        [12.536787075186538, 41.94185043165008],
        [12.42879133518656, 41.93952837265009],
        [12.431625055186686, 41.84943698365008],
        [12.539507865186607, 41.851751203650096],
      ],
    ],
    type: 'Polygon',
  },
  properties: {
    LAYER_NAME: 'CONTROL.TILES',
    TILE_NAME: 'RIT',
    TYPE: 'TILE',
    regions: [
      {
        region: 'italy',
        sub_region_names: ['rome'],
      },
    ],
  },
};

export const RIC_TILE: Tile = {
  type: 'Feature',
  properties: {
    LAYER_NAME: 'CONTROL.TILES',
    TILE_NAME: 'RIC',
    TYPE: 'TILE',
    regions: [
      {
        region: 'italy',
        sub_region_names: [],
      },
    ],
  },
  geometry: {
    coordinates: [
      [
        [12.64750356570994, 41.854073129598774],
        [12.64478277570987, 41.94417235759876],
        [12.536787035709892, 41.941850298598766],
        [12.539620755710018, 41.85175890959876],
        [12.64750356570994, 41.854073129598774],
      ],
    ],
    type: 'Polygon',
  },
};

export const SUB_TILE_66: Tile = {
  type: 'Feature',
  properties: {
    LAYER_NAME: 'CONTROL.SUB_TILES',
    SUB_TILE_ID: '66',
    TILE_NAME: 'RIT',
    TYPE: 'SUB_TILE',
    regions: [
      {
        region: 'italy',
        sub_region_names: [],
      },
    ],
  },
  geometry: {
    coordinates: [
      [
        [12.44999804325252, 41.930226156898485],
        [12.45011422425253, 41.939247112898514],
        [12.439626097252557, 41.93934663789851],
        [12.439510908252515, 41.93032564689851],
        [12.44999804325252, 41.930226156898485],
      ],
    ],
    type: 'Polygon',
  },
};

export const SUB_TILE_65: Tile = {
  type: 'Feature',
  properties: {
    LAYER_NAME: 'CONTROL.SUB_TILES',
    SUB_TILE_ID: '65',
    TILE_NAME: 'RIT',
    TYPE: 'SUB_TILE',
    regions: [
      {
        region: 'italy',
        sub_region_names: ['rome'],
      },
    ],
  },
  geometry: {
    coordinates: [
      [
        [12.439530324602458, 41.93031190061167],
        [12.439646505602468, 41.9393328566117],
        [12.429158378602494, 41.939432381611695],
        [12.429043189602453, 41.930411390611695],
        [12.439530324602458, 41.93031190061167],
      ],
    ],
    type: 'Polygon',
  },
};
