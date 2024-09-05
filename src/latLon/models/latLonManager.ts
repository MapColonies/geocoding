import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { BBox, Feature } from 'geojson';
import * as mgrs from 'mgrs';
import { SERVICES } from '../../common/constants';
import { LatLonDAL } from '../DAL/latLonDAL';
import { convertUTMToWgs84, convertWgs84ToUTM, validateWGS84Coordinate } from '../../common/utils';
import { BadRequestError } from '../../common/errors';
import { WGS84Coordinate } from '../../common/interfaces';
import { parseGeo } from '../../location/utils';

@injectable()
export class LatLonManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(LatLonDAL) private readonly latLonDAL: LatLonDAL,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {}

  public async latLonToTile({ lat, lon }: WGS84Coordinate): Promise<{ [key: string]: unknown } & Feature> {
    if (!validateWGS84Coordinate({ lat, lon })) {
      this.logger.warn("LatLonManager.latLonToTile: Invalid lat lon, check 'lat' and 'lon' keys exists and their values are legal");
      throw new BadRequestError("Invalid lat lon, check 'lat' and 'lon' keys exists and their values are legal");
    }

    const utm = convertWgs84ToUTM({ longitude: lon, latitude: lat });

    if (typeof utm === 'string') {
      this.logger.warn('LatLonManager.latLonToTile: utm is string');
      throw new BadRequestError('utm is string');
    }

    const coordinatesUTM = {
      x: Math.trunc(utm.Easting / 10000) * 10000,
      y: Math.trunc(utm.Northing / 10000) * 10000,
      zone: utm.ZoneNumber,
    };

    const tileCoordinateData = await this.latLonDAL.latLonToTile({ x: coordinatesUTM.x, y: coordinatesUTM.y, zone: coordinatesUTM.zone });

    if (!tileCoordinateData) {
      this.logger.warn('LatLonManager.latLonToTile: The coordinate is outside the grid extent');
      throw new BadRequestError('The coordinate is outside the grid extent');
    }

    const xNumber = Math.abs(Math.trunc((utm.Easting % 10000) / 10) * 10)
      .toString()
      .padStart(4, '0');
    const yNumber = Math.abs(Math.trunc((utm.Northing % 10000) / 10) * 10)
      .toString()
      .padStart(4, '0');

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
      query: {
        lat,
        lon,
      },
      response: {},
      bbox,
      geometry: parseGeo({
        bbox,
      }) ?? {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        tileName: tileCoordinateData.tile_name,
        subTileNumber: new Array(3).fill('').map(function (value, i) {
          return xNumber[i] + yNumber[i];
        }),
      },
    };
  }

  public latLonToMGRS({ lat, lon, accuracy = 5 }: { lat: number; lon: number; accuracy?: number }): { [key: string]: unknown } & Feature {
    const accuracyString: Record<number, string> = {
      [0]: '100km',
      [1]: '10km',
      [2]: '1km',
      [3]: '100m',
      [4]: '10m',
      [5]: '1m',
    };
    return {
      type: 'Feature',
      query: {
        lat,
        lon,
      },
      response: {},
      geometry: {
        type: 'Point',
        coordinates: [lon, lat],
      },
      properties: {
        accuracy: accuracyString[accuracy],
        mgrs: mgrs.forward([lon, lat], accuracy),
      },
    };
  }
}
