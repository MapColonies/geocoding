/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { TileManager } from '../models/tileManager';
import { Tile } from '../models/tile';
import { FeatureCollection } from '../../common/interfaces';

type GetTilesHandler = RequestHandler<
  undefined,
  | FeatureCollection<Tile>
  | {
      type: string;
      message: string;
    },
  undefined,
  GetTilesQueryParams
>;

export interface GetTilesQueryParams {
  tile: string;
  sub_tile?: string;
  reduce_fuzzy_match?: string;
  size?: string;
}

@injectable()
export class TileController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(TileManager) private readonly manager: TileManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = meter.createCounter('created_resource');
  }

  public getTiles: GetTilesHandler = async (req, res, next) => {
    try {
      const { tile, sub_tile, reduce_fuzzy_match, size } = req.query;
      const response = await this.manager.getTiles(
        { tile, subTile: sub_tile ? parseInt(sub_tile) : undefined },
        reduce_fuzzy_match == 'true',
        size ? parseInt(size) : undefined
      );
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.warn('tileController.getTiles Error:', error);
      next(error);
    }
  };
}
