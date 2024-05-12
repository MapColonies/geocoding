/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { LatLonManager } from '../models/latLonManager';
import { Tile } from '../../tile/models/tile';
import { FeatureCollection } from '../../common/interfaces';

type GetLatLonToTileHandler = RequestHandler<
  undefined,
  {
    tileName: string;
    subTileNumber: number[];
  },
  undefined,
  GetLatLonToTileQueryParams
>;

type GetTileToLatLonHandler = RequestHandler<undefined, FeatureCollection<Tile>, undefined, GetTileToLatLonQueryParams>;

type GetLatLonToMgrsHandler = RequestHandler<undefined, { mgrs: string }, undefined, GetLatLonToMgrsQueryParams>;

type GetMgrsToLatLonHandler = RequestHandler<
  undefined,
  {
    lat: number;
    lon: number;
  },
  undefined,
  GetMgrsToLatLonQueryParams
>;

export interface GetLatLonToTileQueryParams {
  lat: number;
  lon: number;
}

export interface GetTileToLatLonQueryParams {
  tile: string;
  sub_tile_number: number[];
}

export interface GetLatLonToMgrsQueryParams {
  lat: number;
  lon: number;
  accuracy?: number;
}
export interface GetMgrsToLatLonQueryParams {
  mgrs: string;
}

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

  public mgrsToLatlon: GetMgrsToLatLonHandler = (req, res, next) => {
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
