import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters, GeoContext } from '../../../common/interfaces';
import { ELASTIC_KEYWORDS } from '../../constants';
import { geoContextQuery } from '../../utils';

export interface ItemQueryParams extends CommonRequestParameters {
  commandName: string;
  tile?: string;
  subTile?: number;
  geo?: GeoContext;
}
/* eslint-disable @typescript-eslint/naming-convention */
export const queryForItems = ({
  commandName,
  tile,
  subTile,
  geo_context: geoContext,
  geo_context_mode: geoContextMode,
  disable_fuzziness: disableFuzziness,
}: ItemQueryParams): estypes.SearchRequest => ({
  query: {
    bool: {
      must: [
        {
          term: {
            [ELASTIC_KEYWORDS.type]: 'ITEM',
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
        ...(tile ?? ''
          ? [
              {
                term: {
                  [ELASTIC_KEYWORDS.tileName]: tile,
                },
              },
            ]
          : []),
        ...(subTile ?? 0
          ? [
              {
                term: {
                  [ELASTIC_KEYWORDS.subTileId]: subTile,
                },
              },
            ]
          : []),
      ],
      ...geoContextQuery(geoContext, geoContextMode),
    },
  },
});
