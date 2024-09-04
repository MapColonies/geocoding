import utm from 'utm-latlng';
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

export type RemoveUnderscore<T> = {
  [K in keyof T as K extends `_${infer Rest}` ? Rest : K]: T[K];
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
  //@ts-expect-error: utm has problem with types. Need to ignore ts error here
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const UTMcoordinates = new utm().convertLatLngToUtm(latitude, longitude, utmPrecision) as {
    Easting: number;
    Northing: number;
    ZoneNumber: number;
    ZoneLetter: string;
  };

  return UTMcoordinates;
};
/* eslint-enable @typescript-eslint/naming-convention */

export const convertUTMToWgs84 = (x: number, y: number, zone: number): WGS84Coordinate => {
  //TODO: change ZONE Letter to relevent letter. Currently it is hardcoded to 'N'
  const { lat, lng: lon } = new utm().convertUtmToLatLng(x, y, zone, 'N') as { lat: number; lng: number };
  return { lat, lon };
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
