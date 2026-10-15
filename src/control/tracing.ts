/* eslint-disable @typescript-eslint/naming-convention */
export const ControlSpanName = {
  ITEM_MANAGER_GET_ITEMS: 'control.item.manager.get_items',
  ITEM_REPOSITORY_GET_ITEMS: 'control.item.repository.get_items',
  ROUTE_MANAGER_GET_ROUTES: 'control.route.manager.get_routes',
  ROUTE_REPOSITORY_GET_ROUTES: 'control.route.repository.get_routes',
  ROUTE_REPOSITORY_GET_CONTROL_POINT_IN_ROUTE: 'control.route.repository.get_control_point_in_route',
  TILE_MANAGER_GET_TILES: 'control.tile.manager.get_tiles',
  TILE_REPOSITORY_GET_TILES: 'control.tile.repository.get_tiles',
  TILE_REPOSITORY_GET_SUB_TILES: 'control.tile.repository.get_sub_tiles',
  TILE_REPOSITORY_GET_TILES_BY_BBOX: 'control.tile.repository.get_tiles_by_bbox',
} as const;

export type ControlSpanName = (typeof ControlSpanName)[keyof typeof ControlSpanName];

export const ControlAttributes = {
  COMMAND_NAME: 'control.command_name',
  TILE: 'control.tile',
  SUB_TILE: 'control.sub_tile',
  MGRS: 'control.mgrs',
  CONTROL_POINT: 'control.control_point',
  LIMIT: 'control.limit',
  DISABLE_FUZZINESS: 'control.disable_fuzziness',
} as const;

export type ControlAttributes = (typeof ControlAttributes)[keyof typeof ControlAttributes];
