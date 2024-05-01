import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { QueryManager } from '../models/queryManager';
import { GetQueryQueryParams, QueryResult } from '../interfaces';
import { DataFetchError, InvalidGeoJSONError } from '../../common/errors';

type GetQueryHandler = RequestHandler<
  unknown,
  QueryResult | { message: string; error: string }, //response
  undefined,
  GetQueryQueryParams
>;
@injectable()
export class QueryController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(QueryManager) private readonly manager: QueryManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = meter.createCounter('created_resource');
  }

  public getQuery: GetQueryHandler = async (req, res) => {
    try {
      const response = await this.manager.query(req.query);
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      if (error instanceof InvalidGeoJSONError) {
        return res.status(httpStatus.BAD_REQUEST).json({
          message: 'Invalid GeoJSON provided',
          error: error.message,
        });
      }
      if (error instanceof DataFetchError) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Internal server error: DataFetchError',
          error: error.message,
        });
      }
      if (error instanceof Error) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Internal server error',
          error: error.message,
        });
      }
    }
  };
}
