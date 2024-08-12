import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import { SERVICES } from '../../../common/constants';
import { ROUTE_REPOSITORY_SYMBOL, RouteRepository } from '../DAL/routeRepository';
import { RouteQueryParams } from '../DAL/queries';
import { formatResponse } from '../../utils';
import { FeatureCollection } from '../../../common/interfaces';
import { Route } from './route';

@injectable()
export class RouteManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(ROUTE_REPOSITORY_SYMBOL) private readonly routeRepository: RouteRepository
  ) {}

  public async getRoutes(routeQueryParams: RouteQueryParams): Promise<FeatureCollection<Route>> {
    const { limit, disableFuzziness } = routeQueryParams;

    let elasticResponse: estypes.SearchResponse<Route> | undefined = undefined;
    if (routeQueryParams.controlPoint ?? 0) {
      elasticResponse = await this.routeRepository.getControlPointInRoute(
        routeQueryParams as RouteQueryParams & Required<Pick<RouteQueryParams, 'controlPoint'>>,
        limit
      );
    } else {
      elasticResponse = await this.routeRepository.getRoutes(routeQueryParams, limit);
    }

    const formattedResponse = formatResponse(elasticResponse, routeQueryParams);

    if (disableFuzziness && formattedResponse.features.length > 0) {
      const filterFunction =
        routeQueryParams.controlPoint ?? 0
          ? (hit: Route | undefined): hit is Route => hit?.properties?.OBJECT_COMMAND_NAME === routeQueryParams.controlPoint
          : (hit: Route | undefined): hit is Route => hit?.properties?.OBJECT_COMMAND_NAME === routeQueryParams.commandName;
      formattedResponse.features = formattedResponse.features.filter(filterFunction);
    }

    return formattedResponse;
  }
}
