import * as Ajv from 'ajv';
import utm from 'utm-latlng';
import { BBox, Geometry, Point } from 'geojson';
import { estypes } from '@elastic/elasticsearch';
import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import { ELASTIC_KEYWORDS } from '../control/constants';
import { TimeoutError } from './errors';
import { RedisClient } from './redis';
import { GeoContext, GeoContextMode, WGS84Coordinate } from './interfaces';
import { SERVICES } from './constants';
import { ElasticClients } from './elastic';
import { BadRequestError } from './errors';

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}` ? `${T}${Capitalize<SnakeToCamelCase<U>>}` : S;

type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? U extends Uncapitalize<U>
    ? `${Lowercase<T>}${CamelToSnakeCase<U>}`
    : `${Lowercase<T>}_${CamelToSnakeCase<Uncapitalize<U>>}`
  : S;

const ajv = new Ajv.Ajv();

const parsePoint = (split: string[] | number[]): Geometry => ({
  type: 'Point',
  coordinates: split.map(Number),
});

const parseBbox = (split: [string, string, string, string] | BBox): Geometry => {
  const [xMin, yMin, xMax, yMax] = split.map(Number);
  return {
    type: 'Polygon',
    coordinates: [
      [
        [xMin, yMin],
        [xMin, yMax],
        [xMax, yMax],
        [xMax, yMin],
        [xMin, yMin],
      ],
    ],
  };
};

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
  const redis = container.resolve<RedisClient>(SERVICES.REDIS);

  for (const [key, client] of Object.entries(elasticClients)) {
    client.cluster
      .health({})
      .then(() => {
        return;
      })
      .catch((error) => {
        logger.error(`Healthcheck failed for ${key}. Error: ${(error as Error).message}`);
      });
  }

  s3Client
    .send(new ListBucketsCommand({}))
    .then(() => {
      return;
    })
    .catch((error) => {
      logger.error(`Healthcheck failed for S3. Error: ${(error as Error).message}`);
    });

  redis
    .ping()
    .then(() => {
      return;
    })
    .catch((error) => {
      logger.error(`Healthcheck failed for Redis. Error: ${(error as Error).message}`);
    });
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

export const parseGeo = (input: GeoContext): Geometry | undefined => {
  //TODO: Add geojson validation
  //TODO: refactor this function
  if (input.bbox !== undefined) {
    return parseBbox(input.bbox);
  } else if (
    (input.x !== undefined && input.y !== undefined && input.zone !== undefined && input.zone !== undefined) ||
    (input.lon !== undefined && input.lat !== undefined)
  ) {
    const { x, y, zone, radius } = input;
    const { lon, lat } = x && y && zone ? convertUTMToWgs84(x, y, zone) : (input as Required<Pick<GeoContext, 'lat' | 'lon'>>);

    return { type: 'Circle', coordinates: (parsePoint([lon, lat]) as Point).coordinates, radius: `${radius ?? ''}` } as unknown as Geometry;
  }
};

export const validateGeoContext = (geoContext: GeoContext): boolean => {
  const geoCOntextSchema: Ajv.Schema = {
    oneOf: [
      {
        type: 'object',
        properties: {
          bbox: {
            oneOf: [
              {
                type: 'array',
                minItems: 4,
                maxItems: 4,
                items: {
                  type: 'number',
                },
              },
              {
                type: 'array',
                minItems: 6,
                maxItems: 6,
                items: {
                  type: 'number',
                },
              },
            ],
          },
        },
        required: ['bbox'],
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {
          lat: {
            type: 'number',
          },
          lon: {
            type: 'number',
          },
          radius: {
            type: 'number',
          },
        },
        required: ['lat', 'lon', 'radius'],
        additionalProperties: false,
      },
      {
        type: 'object',
        properties: {
          x: {
            type: 'number',
          },
          y: {
            type: 'number',
          },
          zone: {
            type: 'number',
          },
          radius: {
            type: 'number',
          },
        },
        required: ['x', 'y', 'zone', 'radius'],
        additionalProperties: false,
      },
    ],
  };

  const validate = ajv.compile(geoCOntextSchema);
  const isValid = validate(geoContext);
  const messagePrefix = 'geo_context validation: ';

  if (!isValid) {
    throw new BadRequestError(
      messagePrefix +
        'geo_context must contain one of the following: {"bbox": [number,number,number,number] | [number,number,number,number,number,number]}, {"lat": number, "lon": number, "radius": number}, or {"x": number, "y": number, "zone": number, "radius": number}'
    );
  }

  return true;
};

export const geoContextQuery = (
  geoContext?: GeoContext,
  geoContextMode?: GeoContextMode,
  elasticGeoShapeField = ELASTIC_KEYWORDS.geometry
): { [key in 'filter' | 'should']?: estypes.QueryDslQueryContainer[] } => {
  if (geoContext === undefined && geoContextMode === undefined) {
    return {};
  }
  if ((geoContext !== undefined && geoContextMode === undefined) || (geoContext === undefined && geoContextMode !== undefined)) {
    throw new BadRequestError('/control/utils/geoContextQuery: geo_context and geo_context_mode must be both defined or both undefined');
  }

  validateGeoContext(geoContext!);

  return {
    [geoContextMode === GeoContextMode.FILTER ? 'filter' : 'should']: [
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        geo_shape: {
          [elasticGeoShapeField]: {
            shape: parseGeo(geoContext!),
          },
          boost: geoContextMode === GeoContextMode.BIAS ? 1.1 : 1, //TODO: change magic number
        },
      },
    ],
  };
};
