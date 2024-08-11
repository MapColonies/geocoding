import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters } from '../../../common/interfaces';
import { geoContextQuery } from '../../utils';
import { ELASTIC_KEYWORDS } from '../../constants';

export interface RouteQueryParams extends CommonRequestParameters {
  commandName: string;
  controlPoint?: number;
}

/* eslint-disable @typescript-eslint/naming-convention */
export const queryForRoute = ({
  geo_context: geoContext,
  geo_context_mode: geoContextMode,
  commandName,
  disable_fuzziness: disableFuzziness,
}: RouteQueryParams): estypes.SearchRequest => ({
  query: {
    bool: {
      must: [
        {
          term: {
            [ELASTIC_KEYWORDS.type]: 'ROUTE',
          },
        },
        {
          match: {
            [ELASTIC_KEYWORDS.objectCommandName]: {
              query: commandName,
              fuzziness: disableFuzziness ? undefined : 1,
              prefix_length: 1,
            },
          },
        },
      ],
      ...geoContextQuery(geoContext, geoContextMode),
    },
  },
});

export const queryForControlPointInRoute = ({
  controlPoint,
  commandName,
  geo_context: geoContext,
  geo_context_mode: geoContextMode,
}: RouteQueryParams & Required<Pick<RouteQueryParams, 'controlPoint'>>): estypes.SearchRequest => {
  const geoContextOperation = geoContextQuery(geoContext, geoContextMode);

  const esQuery: estypes.SearchRequest = {
    query: {
      bool: {
        must: [
          {
            match: {
              [ELASTIC_KEYWORDS.objectCommandName]: {
                query: controlPoint,
                fuzziness: 1,
                prefix_length: 1,
              },
            },
          },
        ],
        filter: [
          {
            terms: {
              [ELASTIC_KEYWORDS.layerName]: ['CONTROL_GIL_GDB.CTR_CONTROL_POINT_N', 'CONTROL_GIL_GDB.CTR_CONTROL_POINT_CROSS_N'],
            },
          },
          {
            term: {
              [ELASTIC_KEYWORDS.tiedTo]: commandName,
            },
          },
          ...(geoContextOperation.filter ?? []),
        ],
        should: geoContextOperation.should ?? [],
      },
    },
  };

  return esQuery;
};
