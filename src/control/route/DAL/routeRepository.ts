import { estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { ConfigType } from '@src/common/config';
import { ElasticClient, ElasticClients } from '../../../common/elastic';
import { SERVICES } from '../../../common/constants';
import { Route } from '../models/route';
import { queryElastic } from '../../../common/elastic/utils';
import { additionalControlSearchProperties } from '../../utils';
import { RouteQueryParams, queryForControlPointInRoute, queryForRoute } from './queries';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createRouteRepository = (client: ElasticClient, config: ConfigType) => {
  return {
    async getRoutes(routeQueryParams: RouteQueryParams, size: number): Promise<estypes.SearchResponse<Route>> {
      const response = await queryElastic<Route>(client, { ...additionalControlSearchProperties(config, size), ...queryForRoute(routeQueryParams) });

      return response;
    },

    async getControlPointInRoute(
      routeQueryParams: RouteQueryParams & Required<Pick<RouteQueryParams, 'controlPoint'>>,
      size: number
    ): Promise<estypes.SearchResponse<Route>> {
      const response = await queryElastic<Route>(client, {
        ...additionalControlSearchProperties(config, size),
        ...queryForControlPointInRoute(routeQueryParams),
      });

      return response;
    },
  };
};

export type RouteRepository = ReturnType<typeof createRouteRepository>;

export const routeRepositoryFactory: FactoryFunction<RouteRepository> = (depContainer) => {
  return createRouteRepository(
    depContainer.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS).control,
    depContainer.resolve<ConfigType>(SERVICES.CONFIG)
  );
};

export const ROUTE_REPOSITORY_SYMBOL = Symbol('ROUTE_REPOSITORY_SYMBOL');
