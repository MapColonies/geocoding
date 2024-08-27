import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import { SERVICES } from '../../../common/constants';
import { ROUTE_REPOSITORY_SYMBOL, RouteRepository } from '../DAL/routeRepository';
import { RouteQueryParams } from '../DAL/queries';
import { formatResponse } from '../../utils';
import { FeatureCollection, IApplication } from '../../../common/interfaces';
import { Route } from './route';

@injectable()
export class RouteManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.APPLICATION) private readonly application: IApplication,
    @inject(ROUTE_REPOSITORY_SYMBOL) private readonly routeRepository: RouteRepository
  ) {}

  public async getRoutes(routeQueryParams: RouteQueryParams): Promise<FeatureCollection<Route>> {
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

    return formatResponse(elasticResponse, routeQueryParams, this.application.controlObjectDisplayNamePrefixes);
  }
}
