import utm from 'utm-latlng';
import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { WGS84Coordinate } from './interfaces';
import { TimeoutError } from './errors';
import { SERVICES } from './constants';
import { ElasticClients } from './elastic';

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

export const healthCheckFactory: FactoryFunction<void> = (container: DependencyContainer): void => {
  const logger = container.resolve<Logger>(SERVICES.LOGGER);
  const elasticClients = container.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS);
  const s3Client = container.resolve<S3Client>(SERVICES.S3_CLIENT);
  logger.info('Healthcheck is running');

  try {
    for (const [key, client] of Object.entries(elasticClients)) {
      logger.info(`Checking health of ${key}`);
      void client.cluster.health({});
    }

    void s3Client.send(new ListBucketsCommand({}));

    logger.info('healthcheck passed');
  } catch (error) {
    logger.error(`Healthcheck failed. Error: ${(error as Error).message}`);
  }
};

export const promiseTimeout = async <T>(ms: number, promise: Promise<T>): Promise<T> => {
  // create a promise that rejects in <ms> milliseconds
  const timeout = new Promise<T>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new TimeoutError(`Timed out in + ${ms} + ms.`));
    }, ms);
  });

  // returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]);
};
