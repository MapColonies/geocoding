import { Logger } from '@map-colonies/js-logger';
import { type Registry, Counter } from 'prom-client';
import { RequestHandler } from 'express';
import { Feature } from 'geojson';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { MgrsManager } from '../models/mgrsManager';
import { GenericGeocodingResponse } from '../../common/interfaces';

type GetTilesHandler = RequestHandler<
  undefined,
  | (Feature & Pick<GenericGeocodingResponse<Feature>, 'geocoding'>)
  | {
      type: string;
      message: string;
    },
  undefined,
  GetTileQueryParams
>;

export interface GetTileQueryParams {
  tile: string;
}

@injectable()
export class MgrsController {
  private readonly createdMgrsCounter: Counter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(MgrsManager) private readonly manager: MgrsManager,
    @inject(SERVICES.METRICS) private readonly metricsRegistry: Registry
  ) {
    this.createdMgrsCounter = new Counter({
      name: 'created_mgrs',
      help: 'number of created mgrs',
      registers: [this.metricsRegistry],
    });
  }

  public getTile: GetTilesHandler = (req, res, next) => {
    try {
      const { tile } = req.query;
      const response = this.manager.getTile({ tile });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error({ msg: 'MgrsController.getTile', error });
      next(error);
    }
  };
}
