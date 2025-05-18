/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { type Registry, Counter } from 'prom-client';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { LatLonManager } from '../models/latLonManager';
import { GenericGeocodingFeatureResponse, WGS84Coordinate } from '../../common/interfaces';
/* istanbul ignore file */

type GetCoordinatesHandler = RequestHandler<undefined, GenericGeocodingFeatureResponse, undefined, GetCoordinatesRequestParams>;

export type GetCoordinatesRequestParams = WGS84Coordinate & { target_grid: 'control' | 'MGRS' };

@injectable()
export class LatLonController {
  private readonly createdResourceCounter: Counter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(LatLonManager) private readonly manager: LatLonManager,
    @inject(SERVICES.METRICS) private readonly metricsRegistry: Registry
  ) {
    this.createdResourceCounter = new Counter({
      name: 'created_resource',
      help: 'number of created resources',
      registers: [this.metricsRegistry],
    });
  }

  public getCoordinates: GetCoordinatesHandler = async (req, res, next) => {
    try {
      const { target_grid: targetGrid } = req.query;

      let response: GenericGeocodingFeatureResponse | undefined = undefined;

      if (targetGrid === 'control') {
        response = await this.manager.latLonToTile({ ...req.query, targetGrid });
      } else {
        response = this.manager.latLonToMGRS({ ...req.query, targetGrid });
      }

      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error({ msG: 'latLonController.getCoordinates error', error });
      next(error);
    }
  };
}
