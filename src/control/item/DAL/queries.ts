import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters } from '../../../common/interfaces';
import { ELASTIC_KEYWORDS } from '../../constants';
import { geoContextQuery } from '../../utils';
import { ConvertSnakeToCamelCase } from '../../../common/utils';

export interface ItemQueryParams extends ConvertSnakeToCamelCase<CommonRequestParameters> {
  commandName: string;
  tile?: string;
  subTile?: string;
}
/* eslint-disable @typescript-eslint/naming-convention */
export const queryForItems = ({
  commandName,
  tile,
  subTile,
  geoContext,
  geoContextMode,
  disableFuzziness,
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
        ...(subTile ?? ''
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
