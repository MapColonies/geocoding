export const ELASTIC_KEYWORDS = {
  type: 'properties.TYPE.keyword',
  tileName: 'properties.TILE_NAME.keyword',
  subTileId: 'properties.SUB_TILE_ID.keyword',
  geometry: 'geometry',
  objectCommandName: 'properties.OBJECT_COMMAND_NAME.keyword',
  layerName: 'properties.LAYER_NAME.keyword',
  tiedTo: 'properties.TIED_TO',
};

export const CONTROL_FIELDS = [
  'type',
  'geometry',
  'properties.OBJECT_COMMAND_NAME',
  'properties.TILE_NAME',
  'properties.TYPE',
  'properties.ENTITY_HEB',
  'properties.SUB_TILE_ID',
  'properties.SECTION',
];
