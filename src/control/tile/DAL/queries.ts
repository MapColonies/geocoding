import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters } from '../../../common/interfaces';
import { ELASTIC_KEYWORDS } from '../../constants';
import { geoContextQuery } from '../../utils';
import { ConvertSnakeToCamelCase } from '../../../common/utils';

export interface TileQueryParams extends ConvertSnakeToCamelCase<CommonRequestParameters> {
  tile?: string;
  mgrs?: string;
  subTile?: string;
}

export const queryForTiles = ({
  tile,
  geoContext,
  geoContextMode,
  disableFuzziness,
}: Omit<TileQueryParams, 'subTile' | 'limit'> & Required<Pick<TileQueryParams, 'tile'>>): estypes.SearchRequest => ({
  query: {
    bool: {
      must: [
        {
          term: {
            [ELASTIC_KEYWORDS.type]: 'TILE',
          },
        },
        {
          match: {
            [ELASTIC_KEYWORDS.tileName]: {
              query: tile,
              fuzziness: disableFuzziness ? undefined : 1,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              prefix_length: 1,
            },
          },
        },
      ],
      ...geoContextQuery(geoContext, geoContextMode),
    },
  },
});

export const queryForSubTiles = ({
  tile,
  geoContext,
  geoContextMode,
  subTile,
  disableFuzziness,
}: Required<TileQueryParams>): estypes.SearchRequest => ({
  query: {
    bool: {
      must: [
        {
          term: {
            [ELASTIC_KEYWORDS.type]: 'SUB_TILE',
          },
        },
        {
          term: {
            [ELASTIC_KEYWORDS.tileName]: tile,
          },
        },
        {
          match: {
            [ELASTIC_KEYWORDS.subTileId]: {
              query: subTile,
              fuzziness: disableFuzziness ? undefined : 1,
              // eslint-disable-next-line @typescript-eslint/naming-convention
              prefix_length: 1,
            },
          },
        },
      ],
      ...geoContextQuery(geoContext, geoContextMode),
    },
  },
});
