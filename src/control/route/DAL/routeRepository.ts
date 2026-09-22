import { estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { ConfigType } from '@src/common/config';
import { ElasticClient, ElasticClients } from '../../../common/elastic';
import { SERVICES } from '../../../common/constants';
import { CommonSpanAttributes, withSpan } from '../../../common/tracing';
import { Route } from '../models/route';
import { queryElastic } from '../../../common/elastic/utils';
import { additionalControlSearchProperties } from '../../utils';
import { ControlSpanName, ControlAttributes } from '../../tracing';
import { RouteQueryParams, queryForControlPointInRoute, queryForRoute } from './queries';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createRouteRepository = (client: ElasticClient, config: ConfigType) => {
  return {
    async getRoutes(routeQueryParams: RouteQueryParams, size: number): Promise<estypes.SearchResponse<Route>> {
      return withSpan(
        ControlSpanName.ROUTE_REPOSITORY_GET_ROUTES,
        { attributes: { [ControlAttributes.COMMAND_NAME]: routeQueryParams.commandName, [ControlAttributes.LIMIT]: size } },
        async (span) => {
          const response = await queryElastic<Route>(client, {
            ...additionalControlSearchProperties(config, size),
            ...queryForRoute(routeQueryParams),
          });

          span?.setAttributes({
            [CommonSpanAttributes.RESULT_COUNT]: response.hits.hits.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: response.took,
          });

          return response;
        }
      );
    },

    async getControlPointInRoute(
      routeQueryParams: RouteQueryParams & Required<Pick<RouteQueryParams, 'controlPoint'>>,
      size: number
    ): Promise<estypes.SearchResponse<Route>> {
      return withSpan(
        ControlSpanName.ROUTE_REPOSITORY_GET_CONTROL_POINT_IN_ROUTE,
        {
          attributes: {
            [ControlAttributes.COMMAND_NAME]: routeQueryParams.commandName,
            [ControlAttributes.CONTROL_POINT]: routeQueryParams.controlPoint,
            [ControlAttributes.LIMIT]: size,
          },
        },
        async (span) => {
          const response = await queryElastic<Route>(client, {
            ...additionalControlSearchProperties(config, size),
            ...queryForControlPointInRoute(routeQueryParams),
          });

          span?.setAttributes({
            [CommonSpanAttributes.RESULT_COUNT]: response.hits.hits.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: response.took,
          });

          return response;
        }
      );
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
