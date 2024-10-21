/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../../common/constants';
import { RouteManager } from '../models/routeManager';
import { Route } from '../models/route';
import { FeatureCollection } from '../../../common/interfaces';
import { ConvertCamelToSnakeCase } from '../../../common/utils';
import { RouteQueryParams } from '../DAL/queries';

type GetRoutesHandler = RequestHandler<undefined, FeatureCollection<Route>, undefined, GetRoutesQueryParams>;

export type GetRoutesQueryParams = ConvertCamelToSnakeCase<RouteQueryParams>;

@injectable()
export class RouteController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(RouteManager) private readonly manager: RouteManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = this.meter.createCounter('created_route');
  }

  public getRoutes: GetRoutesHandler = async (req, res, next) => {
    try {
      const { command_name: commandName, control_point, geo_context, geo_context_mode, disable_fuzziness, limit } = req.query;
      const response = await this.manager.getRoutes({
        commandName,
        controlPoint: control_point,
        geoContext: geo_context,
        geoContextMode: geo_context_mode,
        disableFuzziness: disable_fuzziness,
        limit,
      });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error({ msg: 'routeController.getRoutes error', error });
      next(error);
    }
  };
}
