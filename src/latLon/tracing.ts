/* eslint-disable @typescript-eslint/naming-convention */
export const LatLonSpanName = {
  MANAGER_TO_TILE: 'latlon.manager.to_tile',
  MANAGER_TO_MGRS: 'latlon.manager.to_mgrs',
  DAL_INIT: 'latlon.dal.init',
  DAL_TO_TILE: 'latlon.dal.to_tile',
  DAL_LOAD_DATA: 'latlon.dal.load_data',
} as const;

export type LatLonSpanName = (typeof LatLonSpanName)[keyof typeof LatLonSpanName];

export const LatLonAttributes = {
  LAT: 'geocoding.query.lat',
  LON: 'geocoding.query.lon',
  TARGET_GRID: 'geocoding.query.target_grid',
  ACCURACY: 'geocoding.query.accuracy',
  UTM_X: 'utm.x',
  UTM_Y: 'utm.y',
  UTM_ZONE: 'utm.zone',
  TILE_NAME: 'tile.name',
  ENTRIES_COUNT: 'latlon.entries.count',
} as const;

export type LatLonAttributes = (typeof LatLonAttributes)[keyof typeof LatLonAttributes];
