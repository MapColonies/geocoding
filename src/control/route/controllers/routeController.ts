/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../../common/constants';
import { RouteManager } from '../models/routeManager';
import { Route } from '../models/route';
import { CommonRequestParameters, FeatureCollection, GeoContext } from '../../../common/interfaces';

type GetRoutesHandler = RequestHandler<undefined, FeatureCollection<Route>, undefined, GetRoutesQueryParams>;

export interface GetRoutesQueryParams extends CommonRequestParameters {
  command_name: string;
  control_point?: string;
}

@injectable()
export class RouteController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(RouteManager) private readonly manager: RouteManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = meter.createCounter('created_resource');
  }

  public getRoutes: GetRoutesHandler = async (req, res, next) => {
    try {
      const { command_name: commandName, control_point, geo_context, geo_context_mode, disable_fuzziness, limit } = req.query;
      const response = await this.manager.getRoutes({
        commandName,
        controlPoint: control_point ? parseInt(control_point) : undefined,
        geo_context,
        geo_context_mode,
        disable_fuzziness,
        limit,
      });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.warn('routeController.getRoutes Error:', error);
      next(error);
    }
  };
}
