/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { ConfigManager } from '../models/configManager';
import { LatLonDAL } from '../../latLon/DAL/latLonDAL';

type GetTilesHandler = RequestHandler<
  undefined,
  | ReturnType<LatLonDAL['getLatLonTable']>
  | {
      type: string;
      message: string;
    },
  undefined,
  undefined
>;

@injectable()
export class ConfigController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(ConfigManager) private readonly manager: ConfigManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = meter.createCounter('config_created_resource');
  }

  public getControlTable: GetTilesHandler = (_, res, next) => {
    try {
      const response = this.manager.getControlTable();
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error({ msg: 'ConfigController.getControlTable error while trying to return control table', error });
      next(error);
    }
  };
}
