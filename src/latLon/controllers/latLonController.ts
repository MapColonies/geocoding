/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { Polygon } from 'geojson';
import { SERVICES } from '../../common/constants';
import { LatLonManager } from '../models/latLonManager';

type GetLatLonToTileHandler = RequestHandler<
  undefined,
  {
    tileName: string;
    subTileNumber: string[];
  },
  undefined,
  {
    lat: number;
    lon: number;
  }
>;

type GetTileToLatLonHandler = RequestHandler<
  undefined,
  {
    geometry: Polygon;
    type: string;
    properties: {
      TYPE: string;
      SUB_TILE_NUMBER?: number[] | undefined;
      TILE_NAME?: string | undefined;
    };
  },
  undefined,
  {
    tile: string;
    sub_tile_number: number[];
  }
>;

type GetLatLonToMgrsHandler = RequestHandler<
  undefined,
  { mgrs: string },
  undefined,
  {
    lat: number;
    lon: number;
    accuracy?: number;
  }
>;

type getMgrsToLatLonHandler = RequestHandler<
  undefined,
  {
    lat: number;
    lon: number;
  },
  undefined,
  { mgrs: string }
>;

@injectable()
export class LatLonController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(LatLonManager) private readonly manager: LatLonManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = meter.createCounter('created_resource');
  }

  public latlonToTile: GetLatLonToTileHandler = async (req, res, next) => {
    try {
      const { lat, lon } = req.query;

      const response = await this.manager.latLonToTile({ lat, lon });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.warn('latLonController.latlonToTile Error:', error);
      next(error);
    }
  };

  public tileToLatLon: GetTileToLatLonHandler = async (req, res, next) => {
    try {
      const { tile: tileName, sub_tile_number } = req.query;

      const response = await this.manager.tileToLatLon({
        tileName,
        subTileNumber: sub_tile_number,
      });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.warn('latLonController.tileToLatLon Error:', error);
      next(error);
    }
  };

  public latlonToMgrs: GetLatLonToMgrsHandler = (req, res, next) => {
    try {
      const { lat, lon, accuracy } = req.query;

      const response = this.manager.latLonToMGRS({ lat, lon, accuracy });

      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.warn('latLonController.latlonToMgrs Error:', error);
      next(error);
    }
  };

  public mgrsToLatlon: getMgrsToLatLonHandler = (req, res, next) => {
    try {
      const { mgrs } = req.query;

      const response = this.manager.mgrsToLatLon(mgrs);

      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.warn('latLonController.mgrsToLatlon Error:', error);
      next(error);
    }
  };
}
