import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters } from '../../../common/interfaces';
import { ELASTIC_KEYWORDS } from '../../constants';
import { geoContextQuery } from '../../utils';

export interface TileQueryParams extends CommonRequestParameters {
  tile?: string;
  mgrs?: string;
  subTile?: number;
}

export const queryForTiles = ({
  tile,
  geo_context: geoContext,
  geo_context_mode: geoContextMode,
  disable_fuzziness: disableFuzziness,
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
  geo_context: geoContext,
  geo_context_mode: geoContextMode,
  disable_fuzziness: disableFuzziness,
  subTile,
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
            [ELASTIC_KEYWORDS.subTileId]: subTile,
          },
        },
      ],
      ...geoContextQuery(geoContext, geoContextMode),
    },
  },
});
