/* eslint-disable @typescript-eslint/naming-convention */
import { estypes } from '@elastic/elasticsearch';

export interface TileQueryParams {
  tile: string;
  subTile?: number;
}

export const queryForTiles = (params: Omit<TileQueryParams, 'subTile'>): estypes.SearchRequest => ({
  query: {
    bool: {
      must: [
        {
          term: {
            'properties.TYPE.keyword': 'TILE',
          },
        },
        {
          match: {
            'properties.TILE_NAME.keyword': {
              query: params.tile,
              fuzziness: 1,
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
            'properties.TYPE.keyword': 'SUB_TILE',
          },
        },
        {
          term: {
            'properties.TILE_NAME.keyword': params.tile,
          },
        },
        {
          match: {
            'properties.SUB_TILE_ID.keyword': params.subTile,
          },
        },
      ],
    },
  },
});
