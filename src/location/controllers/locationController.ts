import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { GeotextSearchManager } from '../models/locationManager';
import { GetGeotextSearchParams, QueryResult } from '../interfaces';

type GetGeotextSearchHandler = RequestHandler<
  unknown,
  QueryResult | { message: string; error: string }, //response
  undefined,
  GetGeotextSearchParams
>;

type GetRegionshHandler = RequestHandler<unknown, string[], undefined, undefined>;

type GetSourcesHandler = RequestHandler<unknown, string[], undefined, undefined>;

@injectable()
export class GeotextSearchController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(GeotextSearchManager) private readonly manager: GeotextSearchManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = meter.createCounter('created_resource');
  }

  public getGeotextSearch: GetGeotextSearchHandler = async (req, res, next) => {
    const {
      disable_fuzziness: disableFuzziness,
      geo_context: geoContext,
      geo_context_mode: geoContextMode,
      query,
      region,
      source,
      limit,
    } = req.query;

    try {
      const response = await this.manager.search({ query, region, source, disableFuzziness, geoContext, geoContextMode, limit });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error('Error in getGeotextSearch', error);
      next(error);
    }
  };

  public getRegions: GetRegionshHandler = (req, res, next) => {
    return res.status(httpStatus.OK).json(this.manager.regions());
  };

  public getSources: GetSourcesHandler = (req, res, next) => {
    return res.status(httpStatus.OK).json(this.manager.sources());
  };
}
