/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../../common/constants';
import { TileManager } from '../models/tileManager';
import { Tile } from '../models/tile';
import { FeatureCollection } from '../../../common/interfaces';
import { ConvertCamelToSnakeCase } from '../../../common/utils';
import { TileQueryParams } from '../DAL/queries';

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

export type GetTilesQueryParams = ConvertCamelToSnakeCase<TileQueryParams>;

@injectable()
export class TileController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(TileManager) private readonly manager: TileManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = this.meter.createCounter('created_tile');
  }

  public getTiles: GetTilesHandler = async (req, res, next) => {
    try {
      const { tile, sub_tile, disable_fuzziness, geo_context, geo_context_mode, limit, mgrs } = req.query;
      const response = await this.manager.getTiles({
        tile,
        subTile: sub_tile,
        disableFuzziness: disable_fuzziness,
        geoContext: geo_context,
        geoContextMode: geo_context_mode,
        limit,
        mgrs,
      });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error({ msg: 'tileController.getTiles', error });
      next(error);
    }
  };
}
