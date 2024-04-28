import { convertUTMToWgs84 } from '../../common/utils';
import { LatLon } from '../DAL/latLon';

/* eslint-disable @typescript-eslint/naming-convention */
const geoJsonObjectTemplate = (): {
  geometry: {
    coordinates: number[][];
    type: string;
  };
  type: string;
  properties: {
    TYPE: string;
    SUB_TILE_NUMBER?: number[];
    TILE_NAME?: string;
  };
} => ({
  geometry: {
    coordinates: [[]],
    type: 'Polygon',
  },
  type: 'Feature',
  properties: {
    TYPE: 'TILE',
    SUB_TILE_NUMBER: undefined,
    TILE_NAME: undefined,
  },
});
/* eslint-enable @typescript-eslint/naming-convention */

export const convertTilesToUTM = (
  tile: { tileName: string; subTileNumber: number[] },
  tileObject: LatLon
): {
  x: number;
  y: number;
  zone: number;
} => {
  const xCoordinate = parseInt(tileObject.minX);
  const yCoordinate = parseInt(tileObject.minY);

  const xCoordinatePart = tile.subTileNumber
    .map((x) => {
      return x.toString()[0];
    })
    .join('');
  const yCoordinatePart = tile.subTileNumber
    .map(function (y) {
      return y.toString()[1];
    })
    .join('');

  return { x: xCoordinate + parseInt(xCoordinatePart) * 10, y: yCoordinate + parseInt(yCoordinatePart) * 10, zone: parseInt(tileObject.zone) };
};

export const validateResult = (
  tile: LatLon,
  utmCoor: {
    x: number;
    y: number;
    zone: number;
  }
): void => {
  if (tile.extMinX > utmCoor.x || tile.extMaxX < utmCoor.x || tile.extMinY > utmCoor.y || tile.extMaxY < utmCoor.y) {
    throw new Error("Tile is found, sub tile is not in tile's extent");
  }
};

export const getSubTileByBottomLeftUtmCoor = (
  utmCoor: {
    x: number;
    y: number;
    zone: number;
  },
  tile: { tileName: string; subTileNumber: number[] }
) => {
  const result = geoJsonObjectTemplate();
  const multiplyByOrder = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0],
  ]; // bottom left -> bottom right -> top right -> top left -> bottom left
  const distance = 10; // 10 meters
  for (const multiply of multiplyByOrder) {
    const coordiante = convertUTMToWgs84(utmCoor.x + distance * multiply[0], utmCoor.y + distance * multiply[1], utmCoor.zone);
    if (typeof coordiante === 'string') {
      throw new Error('coordinate is string');
    }
    result.geometry.coordinates[0] = [coordiante.lng, coordiante.lat];
  }

  result.properties.TILE_NAME = tile.tileName;
  result.properties.SUB_TILE_NUMBER = tile.subTileNumber;

  return result;
};
