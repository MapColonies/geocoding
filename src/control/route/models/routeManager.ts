import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import { SERVICES } from '../../../common/constants';
import { CommonSpanAttributes, withSpan } from '../../../common/tracing';
import { ROUTE_REPOSITORY_SYMBOL, RouteRepository } from '../DAL/routeRepository';
import { RouteQueryParams } from '../DAL/queries';
import { formatResponse } from '../../utils';
import { FeatureCollection, IApplication } from '../../../common/interfaces';
import { ControlSpanName, ControlAttributes } from '../../tracing';
import { Route } from './route';

@injectable()
export class RouteManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.APPLICATION) private readonly application: IApplication,
    @inject(ROUTE_REPOSITORY_SYMBOL) private readonly routeRepository: RouteRepository
  ) {}

  public async getRoutes(routeQueryParams: RouteQueryParams): Promise<FeatureCollection<Route>> {
    return withSpan(
      ControlSpanName.ROUTE_MANAGER_GET_ROUTES,
      {
        attributes: {
          [ControlAttributes.COMMAND_NAME]: routeQueryParams.commandName,
          [ControlAttributes.LIMIT]: routeQueryParams.limit,
          ...(routeQueryParams.controlPoint !== undefined ? { [ControlAttributes.CONTROL_POINT]: routeQueryParams.controlPoint } : {}),
        },
      },
      async (span) => {
        const { limit } = routeQueryParams;

        let elasticResponse: estypes.SearchResponse<Route> | undefined = undefined;
        if (routeQueryParams.controlPoint ?? '') {
          elasticResponse = await this.routeRepository.getControlPointInRoute(
            routeQueryParams as RouteQueryParams & Required<Pick<RouteQueryParams, 'controlPoint'>>,
            limit
          );
        } else {
          elasticResponse = await this.routeRepository.getRoutes(routeQueryParams, limit);
        }

        span?.setAttribute(CommonSpanAttributes.RESULT_COUNT, elasticResponse.hits.hits.length);

        return formatResponse(elasticResponse, routeQueryParams, this.application.controlObjectDisplayNamePrefixes);
      }
    );
  }
}
