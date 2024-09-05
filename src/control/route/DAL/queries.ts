import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters } from '../../../common/interfaces';
import { geoContextQuery } from '../../utils';
import { ELASTIC_KEYWORDS } from '../../constants';
import { ConvertSnakeToCamelCase } from '../../../common/utils';

export interface RouteQueryParams extends ConvertSnakeToCamelCase<CommonRequestParameters> {
  commandName: string;
  controlPoint?: string;
}

/* eslint-disable @typescript-eslint/naming-convention */
export const queryForRoute = ({ geoContext, geoContextMode, commandName, disableFuzziness }: RouteQueryParams): estypes.SearchRequest => ({
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
  geoContext,
  geoContextMode,
  disableFuzziness,
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
                fuzziness: disableFuzziness ? undefined : 1,
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
