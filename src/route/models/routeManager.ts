import config from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import { SERVICES } from '../../common/constants';
import { ROUTE_REPOSITORY_SYMBOL, RouteRepository } from '../DAL/routeRepository';
import { RouteQueryParams } from '../DAL/queries';
import { formatResponse } from '../../common/utils';
import { Route } from './route';

@injectable()
export class RouteManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(ROUTE_REPOSITORY_SYMBOL) private readonly routeRepository: RouteRepository
  ) {}

  public async getRoutes(
    routeQueryParams: RouteQueryParams,
    reduceFuzzyMatch = false,
    size?: number
  ): Promise<{
    type: string;
    features: (Route | undefined)[];
  }> {
    let elasticResponse: estypes.SearchResponse<Route> | undefined = undefined;
    if (routeQueryParams.controlPoint ?? 0) {
      elasticResponse = await this.routeRepository.getControlPointInRoute(
        routeQueryParams as RouteQueryParams & Required<Pick<RouteQueryParams, 'controlPoint'>>,
        size ?? config.get<number>('db.elastic.properties.size')
      );
    } else {
      elasticResponse = await this.routeRepository.getRoutes(routeQueryParams, size ?? config.get<number>('db.elastic.properties.size'));
    }

    const formattedResponse = formatResponse(elasticResponse);

    if (reduceFuzzyMatch && formattedResponse.features.length > 0) {
      const filterFunction =
        routeQueryParams.controlPoint ?? 0
          ? (hit: Route | undefined): hit is Route => hit?.properties.OBJECT_COMMAND_NAME === routeQueryParams.controlPoint
          : (hit: Route | undefined): hit is Route => hit?.properties.OBJECT_COMMAND_NAME === routeQueryParams.commandName;
      formattedResponse.features = formattedResponse.features.filter(filterFunction);
    }

    return formattedResponse;
  }
}
