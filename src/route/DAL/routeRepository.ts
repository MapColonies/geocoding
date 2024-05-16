import { Client, estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { elasticClientSymbol } from '../../common/elastic';
import { Route } from '../models/route';
import { additionalSearchProperties } from '../../common/utils';
import { ElasticClients } from '../../common/interfaces';
import { RouteQueryParams, queryForControlPointInRoute, queryForRoute } from './queries';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createRouteRepository = (client: Client) => {
  return {
    async getRoutes(routeQueryParams: RouteQueryParams, size: number): Promise<estypes.SearchResponse<Route>> {
      const response = await client.search<Route>({
        ...additionalSearchProperties(size),
        body: queryForRoute(routeQueryParams),
      });

      return response;
    },

    async getControlPointInRoute(
      routeQueryParams: RouteQueryParams & Required<Pick<RouteQueryParams, 'controlPoint'>>,
      size: number
    ): Promise<estypes.SearchResponse<Route>> {
      const response = await client.search<Route>({
        ...additionalSearchProperties(size),
        body: queryForControlPointInRoute(routeQueryParams),
      });

      return response;
    },
  };
};

export type RouteRepository = ReturnType<typeof createRouteRepository>;

export const routeRepositoryFactory: FactoryFunction<RouteRepository> = (depContainer) => {
  return createRouteRepository(depContainer.resolve<ElasticClients>(elasticClientSymbol).searchy);
};

export const ROUTE_REPOSITORY_SYMBOL = Symbol('ROUTE_REPOSITORY_SYMBOL');
