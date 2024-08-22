import proj4 from 'proj4';
import { utmProjection, wgs84Projection } from './projections';
import { WGS84Coordinate } from './interfaces';

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}` ? `${T}${Capitalize<SnakeToCamelCase<U>>}` : S;

type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? U extends Uncapitalize<U>
    ? `${Lowercase<T>}${CamelToSnakeCase<U>}`
    : `${Lowercase<T>}_${CamelToSnakeCase<Uncapitalize<U>>}`
  : S;

export type ConvertSnakeToCamelCase<T> = {
  [K in keyof T as SnakeToCamelCase<K & string>]: T[K];
};

export type ConvertCamelToSnakeCase<T> = {
  [K in keyof T as CamelToSnakeCase<K & string>]: T[K];
};

export const validateWGS84Coordinate = (coordinate: { lon: number; lat: number }): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const [min, max] = [0, 180];
  const exceptedKeys = ['lat', 'lon'];
  const regex = /^([0-9]+(\.[0-9]+)?)$/;
  for (const key of exceptedKeys) {
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
  }
  return true;
};

/* eslint-disable @typescript-eslint/naming-convention */
export const convertWgs84ToUTM = (
  { longitude, latitude }: { longitude: number; latitude: number },
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

export const convertUTMToWgs84 = (x: number, y: number, zone: number): WGS84Coordinate => {
  const [longitude, latitude] = proj4(utmProjection(zone), wgs84Projection, [x, y]);
  return { lat: latitude, lon: longitude };
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
