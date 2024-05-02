import config from 'config';
import { estypes } from '@elastic/elasticsearch';
import proj4 from 'proj4';
import { Item } from '../item/models/item';
import { Tile } from '../tile/models/tile';
import { Route } from '../route/models/route';
import { FIELDS } from './constants';
import { utmProjection, wgs84Projection } from './projections';

export const formatResponse = <T extends Item | Tile | Route>(
  elasticResponse: estypes.SearchResponse<T>
): {
  type: string;
  features: (T | undefined)[];
} => ({
  type: 'FeatureCollection',
  features: [
    ...elasticResponse.hits.hits.map((item) => {
      const source = item._source;
      if (source) {
        Object.keys(source.properties).forEach((key) => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (source.properties[key as keyof typeof source.properties] == null) {
            delete source.properties[key as keyof typeof source.properties];
          }
        });
      }
      return source;
    }),
  ],
});

/* eslint-disable @typescript-eslint/naming-convention */
export const additionalSearchProperties = (size: number): { size: number; index: string; _source: string[] } => ({
  size,
  index: config.get<string>('db.elastic.properties.controlIndex'),
  _source: FIELDS,
});
/* eslint-enable @typescript-eslint/naming-convention */

export const validateWGS84Coordinate = (coordinate: { lon: number; lat: number }): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const [min, max] = [0, 180];
  const exceptedKeys = ['lat', 'lon'];
  const regex = /^([0-9]+(\.[0-9]+)?)$/;
  exceptedKeys.forEach((key) => {
    if (!coordinate[key as keyof typeof coordinate]) {
      return false;
    }
    if (
      !regex.test(`${coordinate[key as keyof typeof coordinate]}`) ||
      coordinate[key as keyof typeof coordinate] < min ||
      coordinate[key as keyof typeof coordinate] > max
    ) {
      return false;
    }
  });
  return true;
};

/* eslint-disable @typescript-eslint/naming-convention */
export const convertWgs84ToUTM = (
  latitude: number,
  longitude: number,
  utmPrecision = 0
):
  | string
  | {
      Easting: number;
      Northing: number;
      ZoneNumber: number;
    } => {
  const zone = Math.floor((longitude + 180) / 6) + 1;

  const [easting, northing] = proj4(wgs84Projection, utmProjection(zone), [longitude, latitude]);

  return {
    Easting: +easting.toFixed(utmPrecision),
    Northing: +northing.toFixed(utmPrecision),
    ZoneNumber: zone,
  };
};
/* eslint-enable @typescript-eslint/naming-convention */

export const convertUTMToWgs84 = (x: number, y: number, zone: number) => {
  const [longitude, latitude] = proj4(utmProjection(zone), wgs84Projection, [x, y]);
  return { lat: latitude, lng: longitude };
};

export const validateTile = (tile: { tileName: string; subTileNumber: number[] }): boolean => {
  if (!tile.tileName || !Array.isArray(tile.subTileNumber) || tile.subTileNumber.length !== 3) {
    return false;
  }
  //regex = /^-?d+$/;
  const regex = /^(\d\d)$/;
  for (const subTileNumber of tile.subTileNumber) {
    if (!regex.test(`${subTileNumber}`)) {
      return false;
    }
  }
  return true;
};
