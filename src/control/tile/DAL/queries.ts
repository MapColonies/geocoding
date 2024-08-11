/* eslint-disable @typescript-eslint/naming-convention */
import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters } from '../../../common/interfaces';

const ELASTIC_KEYWORDS = {
  TYPE: 'properties.TYPE.keyword',
  TILE_NAME: 'properties.TILE_NAME.keyword',
  SUB_TILE_ID: 'properties.SUB_TILE_ID.keyword',
};

export interface TileQueryParams extends CommonRequestParameters {
  tile: string;
  subTile?: number;
}

export const queryForTiles = (params: Omit<TileQueryParams, 'subTile'>): estypes.SearchRequest => ({
  query: {
    bool: {
      must: [
        {
          term: {
            [ELASTIC_KEYWORDS.TYPE]: 'TILE',
          },
        },
        {
          match: {
            [ELASTIC_KEYWORDS.TILE_NAME]: {
              query: params.tile,
              fuzziness: !params.disable_fuzziness ? 1 : undefined,
              prefix_length: 1,
            },
          },
        },
      ],
    },
  },
});

export const queryForSubTiles = (params: Required<TileQueryParams>): estypes.SearchRequest => ({
  query: {
    bool: {
      must: [
        {
          term: {
            [ELASTIC_KEYWORDS.TYPE]: 'SUB_TILE',
          },
        },
        {
          term: {
            [ELASTIC_KEYWORDS.TILE_NAME]: params.tile,
          },
        },
        {
          match: {
            [ELASTIC_KEYWORDS.SUB_TILE_ID]: params.subTile,
          },
        },
      ],
    },
  },
});
