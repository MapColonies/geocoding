/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import { Feature } from 'geojson';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { MgrsManager } from '../models/mgrsManager';

type GetTilesHandler = RequestHandler<
  undefined,
  | Feature
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
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(MgrsManager) private readonly manager: MgrsManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = meter.createCounter('created_resource');
  }

  public getTile: GetTilesHandler = (req, res, next) => {
    try {
      const { tile } = req.query;
      const response = this.manager.getTile({ tile });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error(`MgrsController.getTile Error: ${(error as Error).message}`);
      next(error);
    }
  };
}
