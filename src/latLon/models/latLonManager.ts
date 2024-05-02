import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import * as mgrs from 'mgrs';
import { SERVICES } from '../../common/constants';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL, LatLonRepository } from '../DAL/latLonRepository';
import { convertWgs84ToUTM, validateTile, validateWGS84Coordinate } from '../../common/utils';
import { convertTilesToUTM, getSubTileByBottomLeftUtmCoor, validateResult } from '../utlis';
import { BadRequestError, NotFoundError } from '../../common/errors';

@injectable()
export class LatLonManager {
  private readonly dbSchema: string;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(LATLON_CUSTOM_REPOSITORY_SYMBOL) private readonly latLonRepository: LatLonRepository,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {
    this.dbSchema = this.config.get('db.postgresql.schema');
  }

  public async latLonToTile({ lat, lon }: { lat: number; lon: number }): Promise<{
    tileName: string;
    subTileNumber: string[];
  }> {
    if (!validateWGS84Coordinate({ lat, lon })) {
      throw new BadRequestError("Invalid lat lon, check 'lat' and 'lon' keys exists and their values are legal");
    }

    const utm = convertWgs84ToUTM(lat, lon);

    if (typeof utm === 'string') {
      throw new BadRequestError('utm is string');
    }

    const coordinatesUTM = {
      x: Math.trunc(utm.Easting / 10000) * 10000,
      y: Math.trunc(utm.Northing / 10000) * 10000,
      zone: utm.ZoneNumber,
    };

    const tileCoordinateData = await this.latLonRepository.latLonToTile({ x: coordinatesUTM.x, y: coordinatesUTM.y, zone: coordinatesUTM.zone });

    if (!tileCoordinateData) {
      throw new BadRequestError('The coordinate is outside the grid extent');
    }

    const xNumber = Math.abs(Math.trunc((coordinatesUTM.x % 10000) / 10) * 10)
      .toString()
      .padStart(4, '0');
    const yNumber = Math.abs(Math.trunc((coordinatesUTM.y % 10000) / 10) * 10)
      .toString()
      .padStart(4, '0');

    return {
      tileName: tileCoordinateData.tileName,
      subTileNumber: new Array(3).fill('').map(function (value, i) {
        return xNumber[i] + yNumber[i];
      }),
    };
  }

  public async tileToLatLon({ tileName, subTileNumber }: { tileName: string; subTileNumber: number[] }): Promise<{
    geometry: {
      coordinates: number[][];
      type: string;
    };
    type: string;
    properties: {
      /* eslint-disable @typescript-eslint/naming-convention */
      TYPE: string;
      SUB_TILE_NUMBER?: number[] | undefined;
      TILE_NAME?: string | undefined;
      /* eslint-enable @typescript-eslint/naming-convention */
    };
  }> {
    if (!validateTile({ tileName, subTileNumber })) {
      throw new BadRequestError(
        "Invalid tile, check that 'tileName' and 'subTileNumber' exists and subTileNumber is array of size 3 with positive integers"
      );
    }

    const tile = await this.latLonRepository.tileToLatLon(tileName);

    if (!tile) {
      throw new NotFoundError('Tile not found');
    }

    const utmCoor = convertTilesToUTM({ tileName, subTileNumber }, tile);
    validateResult(tile, utmCoor);

    const geojsonRes = getSubTileByBottomLeftUtmCoor(utmCoor, { tileName, subTileNumber });
    return geojsonRes;
  }

  public latLonToMGRS({ lat, lon, accuracy = 5 }: { lat: number; lon: number; accuracy?: number }): { mgrs: string } {
    return {
      mgrs: mgrs.forward([lon, lat], accuracy),
    };
  }

  public mgrsToLatLon(mgrsStr: string): { lat: number; lon: number } {
    const [lon, lat] = mgrs.toPoint(mgrsStr);
    return { lat, lon };
  }
}
