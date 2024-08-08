import { estypes } from '@elastic/elasticsearch';
import { boundingBox, geoDistance } from '../../../common/elastic/utils';
import { GeoContext, WGS84Coordinate } from '../../../common/interfaces';

export interface RouteQueryParams {
  commandName: string;
  controlPoint?: number;
  geo?: GeoContext;
}

/* eslint-disable @typescript-eslint/naming-convention */
export const queryForRoute = (params: RouteQueryParams): estypes.SearchRequest => ({
  query: {
    bool: {
      should: [
        {
          term: {
            'properties.TYPE.keyword': 'ROUTE',
          },
        },
      ],
      must: [
        {
          match: {
            'properties.OBJECT_COMMAND_NAME.keyword': {
              query: params.commandName,
              fuzziness: 1,
              prefix_length: 1,
            },
          },
        },
        ...(params.geo?.bbox ? [boundingBox(params.geo.bbox)] : []),
        ...(params.geo?.radius
          ? [
              geoDistance(
                params.geo as {
                  radius: number;
                  lon: number;
                  lat: number;
                }
              ),
            ]
          : []),
      ],
    },
  },
});

export const queryForControlPointInRoute = (params: RouteQueryParams & Required<Pick<RouteQueryParams, 'controlPoint'>>): estypes.SearchRequest => ({
  query: {
    bool: {
      must: [
        {
          match: {
            'properties.OBJECT_COMMAND_NAME.keyword': {
              query: params.controlPoint,
              fuzziness: 1,
              prefix_length: 1,
            },
          },
        },
        ...(params.geo?.bbox ? [boundingBox(params.geo.bbox)] : []),
        ...(params.geo?.radius ?? 0 ? [geoDistance(params.geo as WGS84Coordinate & { radius: number })] : []),
      ],
      filter: [
        {
          terms: {
            'properties.LAYER_NAME.keyword': ['CONTROL_GIL_GDB.CTR_CONTROL_POINT_N', 'CONTROL_GIL_GDB.CTR_CONTROL_POINT_CROSS_N'],
          },
        },
        {
          term: {
            'properties.TIED_TO': params.commandName,
          },
        },
      ],
    },
  },
});
