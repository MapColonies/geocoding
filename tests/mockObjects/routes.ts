/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-magic-numbers */

import { Route } from '../../src/control/route/models/route';

export const ROUTE_VIA_CAMILLUCCIA_A: Route = {
  type: 'Feature',
  geometry: {
    coordinates: [
      [12.443243654365062, 41.93890891937724],
      [12.442636325462843, 41.93804302794496],
      [12.442828646282095, 41.93725242115204],
      [12.443405608739027, 41.93556576056804],
      [12.44388471483822, 41.93370245333628],
      [12.445132826188399, 41.93084467089824],
      [12.445812354584433, 41.93031849813403],
      [12.445819951137906, 41.930296776658196],
    ],
    type: 'LineString',
  },
  properties: {
    OBJECT_COMMAND_NAME: 'via camillucciaA',
    ENTITY_HEB: 'route',
    TYPE: 'ROUTE',
    LAYER_NAME: 'CONTROL.ROUTES',
  },
};
export const ROUTE_VIA_CAMILLUCCIA_B: Route = {
  type: 'Feature',
  geometry: {
    coordinates: [
      [12.445818466287847, 41.93029376141277],
      [12.446047161911423, 41.930040913942264],
      [12.446171038707206, 41.9297762500957],
      [12.446167862379838, 41.92945014491775],
      [12.446075748864388, 41.9286136066203],
    ],
    type: 'LineString',
  },
  properties: {
    OBJECT_COMMAND_NAME: 'via camillucciaB',
    ENTITY_HEB: 'route',
    TYPE: 'ROUTE',
    LAYER_NAME: 'CONTROL.ROUTES',
  },
};

export const CONTROL_POINT_OLIMPIADE_111: Route = {
  type: 'Feature',
  geometry: {
    coordinates: [12.475638293442415, 41.932360642739155],
    type: 'Point',
  },
  properties: {
    OBJECT_COMMAND_NAME: '111',
    ENTITY_HEB: 'control point',
    TIED_TO: 'olimpiade',
    TYPE: 'ITEM' as never,
    LAYER_NAME: 'CONTROL_GIL_GDB.CTR_CONTROL_POINT_CROSS_N',
  },
};

export const CONTROL_POINT_OLIMPIADE_112: Route = {
  type: 'Feature',
  geometry: {
    coordinates: [12.474175672012962, 41.932217551210556],
    type: 'Point',
  },
  properties: {
    OBJECT_COMMAND_NAME: '112',
    ENTITY_HEB: 'control point',
    TIED_TO: 'olimpiade',
    TYPE: 'ITEM' as never,
    LAYER_NAME: 'CONTROL_GIL_GDB.CTR_CONTROL_POINT_CROSS_N',
  },
};
