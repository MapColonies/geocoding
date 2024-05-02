import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { QueryManager } from '../models/queryManager';
import { GetQueryQueryParams, QueryResult } from '../interfaces';

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
    const response = await this.manager.query(req.query);
    return res.status(httpStatus.OK).json(response);
  };
}
