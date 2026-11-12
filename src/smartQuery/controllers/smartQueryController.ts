import { Logger } from '@map-colonies/js-logger';
import { type Registry } from 'prom-client';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import type { Feature } from 'geojson';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { GenericGeocodingResponse } from '../../common/interfaces';
import { SmartQueryManager } from '../models/smartQueryManager';
import type { GetSmartQueryParams } from '../interfaces';

type GetSmartQueryHandler = RequestHandler<
  unknown,
  GenericGeocodingResponse<Feature> | { message: string; error: string },
  undefined,
  GetSmartQueryParams
>;

@injectable()
export class SmartQueryController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SmartQueryManager) private readonly manager: SmartQueryManager,
    @inject(SERVICES.METRICS) private readonly metricsRegistry: Registry
  ) {}

  public getSmartQuery: GetSmartQueryHandler = async (req, res, next) => {
    try {
      const response = await this.manager.search(req.query);
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error({ msg: 'Error in getSmartQuery', error });
      next(error);
    }
  };
}
