import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { BBox } from 'geojson';
import * as mgrs from 'mgrs';
import { SERVICES } from '../../common/constants';
import { LatLonDAL, latLonDalSymbol } from '../DAL/latLonDAL';
import { convertUTMToWgs84, CommonUtils, parseGeo, validateWGS84Coordinate } from '../../common/utils';
import { BadRequestError } from '../../common/errors';
import { GenericGeocodingFeatureResponse, WGS84Coordinate } from '../../common/interfaces';
import { convertCamelToSnakeCase } from '../../control/utils';
import { ConfigType } from '@src/common/config';

const GRID_SIZE = 10000;
const TILE_DIVISOR = 10;
const PAD_LENGTH = 4;
const SUB_TILE_LENGTH = 3;
const MGRS_ACCURACY = 5;

@injectable()
export class LatLonManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(latLonDalSymbol) private readonly latLonDAL: LatLonDAL,
    @inject(SERVICES.CONFIG) private readonly config: ConfigType
  ) {}

  public async latLonToTile({ lat, lon, targetGrid }: WGS84Coordinate & { targetGrid: string }): Promise<GenericGeocodingFeatureResponse> {
    if (!validateWGS84Coordinate({ lat, lon })) {
      this.logger.error({ msg: "LatLonManager.latLonToTile: Invalid lat lon, check 'lat' and 'lon' keys exists and their values are legal" });
      throw new BadRequestError("Invalid lat lon, check 'lat' and 'lon' keys exists and their values are legal");
    }

    const utm = CommonUtils.convertWgs84ToUTM({ longitude: lon, latitude: lat });

    if (typeof utm === 'string') {
      this.logger.error({ msg: 'LatLonManager.latLonToTile: utm is string' });
      throw new BadRequestError('utm is string');
    }

    const coordinatesUTM = {
      x: Math.trunc(utm.Easting / GRID_SIZE) * GRID_SIZE,
      y: Math.trunc(utm.Northing / GRID_SIZE) * GRID_SIZE,
      zone: utm.ZoneNumber,
    };

    const tileCoordinateData = await this.latLonDAL.latLonToTile({ x: coordinatesUTM.x, y: coordinatesUTM.y, zone: coordinatesUTM.zone });

    if (!tileCoordinateData) {
      this.logger.error({ msg: 'LatLonManager.latLonToTile: The coordinate is outside the grid extent' });
      throw new BadRequestError('The coordinate is outside the grid extent');
    }

    const xNumber = Math.abs(Math.trunc((utm.Easting % GRID_SIZE) / TILE_DIVISOR) * TILE_DIVISOR)
      .toString()
      .padStart(PAD_LENGTH, '0');
    const yNumber = Math.abs(Math.trunc((utm.Northing % GRID_SIZE) / TILE_DIVISOR) * TILE_DIVISOR)
      .toString()
      .padStart(PAD_LENGTH, '0');

    const bbox = [
      ...(
        Object.values(convertUTMToWgs84(tileCoordinateData.ext_min_x, tileCoordinateData.ext_min_y, +tileCoordinateData.zone)) as number[]
      ).reverse(),
      ...(
        Object.values(convertUTMToWgs84(tileCoordinateData.ext_max_x, tileCoordinateData.ext_max_y, +tileCoordinateData.zone)) as number[]
      ).reverse(),
    ] as BBox;

    return {
      type: 'Feature',
      geocoding: {
        version: process.env.npm_package_version as string,
        query: {
          lat,
          lon,
          ...convertCamelToSnakeCase({ targetGrid }),
        },
        response: convertCamelToSnakeCase({
          maxScore: 1,
          resultsCount: 1,
          matchLatencyMs: 0,
        }) as GenericGeocodingFeatureResponse['geocoding']['response'],
      },
      bbox,
      geometry: parseGeo({
        bbox,
      }) ?? {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        matches: [
          {
            layer: 'convertionTable',
            source: 'mapcolonies',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            source_id: [],
          },
        ],
        names: {
          default: [tileCoordinateData.tile_name],
          display: tileCoordinateData.tile_name,
        },
        tileName: tileCoordinateData.tile_name,
        subTileNumber: new Array(SUB_TILE_LENGTH).fill('').map(function (value, i) {
          return xNumber[i] + yNumber[i];
        }),
      },
    };
  }

  public latLonToMGRS({
    lat,
    lon,
    accuracy = MGRS_ACCURACY,
    targetGrid,
  }: WGS84Coordinate & {
    accuracy?: number;
    targetGrid: string;
  }): GenericGeocodingFeatureResponse {
    const accuracyString: Record<number, string> = {
      [0]: '100km',
      [1]: '10km',
      [2]: '1km',
      [3]: '100m',
      [4]: '10m',
      [5]: '1m',
    };
    const mgrsStr = mgrs.forward([lon, lat], accuracy);
    return {
      type: 'Feature',
      geocoding: {
        version: process.env.npm_package_version as string,
        query: {
          lat,
          lon,
          ...convertCamelToSnakeCase({ targetGrid }),
        },
        response: convertCamelToSnakeCase({
          maxScore: 1,
          resultsCount: 1,
          matchLatencyMs: 0,
        }) as GenericGeocodingFeatureResponse['geocoding']['response'],
      },
      bbox: mgrs.inverse(mgrsStr),
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        matches: [
          {
            layer: 'MGRS',
            source: 'npm/MGRS',
            // eslint-disable-next-line @typescript-eslint/naming-convention
            source_id: [],
          },
        ],
        names: {
          default: [mgrsStr],
          display: mgrsStr,
        },
        accuracy: accuracyString[accuracy],
        mgrs: mgrsStr,
        score: 1,
      },
    };
  }
}
