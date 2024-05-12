import { Polygon } from 'geojson';
import { BadRequestError } from '../../common/errors';
import { convertUTMToWgs84 } from '../../common/utils';
import { LatLon } from '../DAL/latLon';
import { FeatureCollection } from '../../common/interfaces';
import { Tile } from '../../tile/models/tile';

/* eslint-disable @typescript-eslint/naming-convention */
const geoJsonObjectTemplate = (): FeatureCollection<Tile> => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[]],
      },
      properties: {
        TYPE: 'TILE',
      },
    },
  ],
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
    throw new BadRequestError("Tile is found, sub tile is not in tile's extent");
  }
};

export const getSubTileByBottomLeftUtmCoor = (
  utmCoor: {
    x: number;
    y: number;
    zone: number;
  },
  tile: { tileName: string; subTileNumber: number[] }
): FeatureCollection<Tile> => {
  const result = geoJsonObjectTemplate();

  const multiplyByOrder = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 0],
  ]; // bottom left -> bottom right -> top right -> top left -> bottom left
  const distance = 10; // 10 meters
  const polygon: Polygon = {
    type: 'Polygon',
    coordinates: [[]],
  };

  for (const multiply of multiplyByOrder) {
    const coordiante = convertUTMToWgs84(utmCoor.x + distance * multiply[0], utmCoor.y + distance * multiply[1], utmCoor.zone);
    if (typeof coordiante === 'string') {
      throw new Error('coordinate is string');
    }
    polygon.coordinates[0].push([coordiante.lon, coordiante.lat]);
  }

  result.features[0].geometry = polygon;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  result.features[0].properties = { ...result.features[0].properties, TILE_NAME: tile.tileName, SUB_TILE_NUMBER: tile.subTileNumber };

  return result;
};
