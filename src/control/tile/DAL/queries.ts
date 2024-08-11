/* eslint-disable @typescript-eslint/naming-convention */
import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters, GeoContextMode } from '../../../common/interfaces';
import { parseGeo } from '../../../geotextSearch/utils';
import { BadRequestError } from '../../../common/errors';

const ELASTIC_KEYWORDS = {
  TYPE: 'properties.TYPE.keyword',
  TILE_NAME: 'properties.TILE_NAME.keyword',
  SUB_TILE_ID: 'properties.SUB_TILE_ID.keyword',
  GEOMETRY: 'geometry',
};

export interface TileQueryParams extends CommonRequestParameters {
  tile?: string;
  mgrs?: string;
  subTile?: number;
}

export const queryForTiles = (params: Omit<TileQueryParams, 'subTile' | 'limit'>): estypes.SearchRequest => {
  const { tile, geo_context, geo_context_mode, disable_fuzziness } = params;
  if ((geo_context_mode !== undefined && geo_context === undefined) || (geo_context_mode === undefined && geo_context !== undefined)) {
    throw new BadRequestError('/control/tiles/queryForTiles: geo_context and geo_context_mode must be both defined or both undefined');
  }

  const esQuery: estypes.SearchRequest = {
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
                query: tile,
                fuzziness: disable_fuzziness ? undefined : 1,
                prefix_length: 1,
              },
            },
          },
        ],
        // filter: [
        //   {
        //     geo_shape: {
        //       geometry: {
        //         shape: parseGeo(geo_context!),
        //       },
        //       boost: geo_context_mode === GeoContextMode.BIAS ? 1.1 : 1, //TODO: change magic number
        //     },
        //   },
        // ],
      },
    },
  };

  if (geo_context !== undefined) {
    esQuery.query!.bool![geo_context_mode === GeoContextMode.FILTER ? 'filter' : 'should'] = [
      {
        geo_shape: {
          [ELASTIC_KEYWORDS.GEOMETRY]: {
            shape: parseGeo(geo_context),
          },
          boost: geo_context_mode === GeoContextMode.BIAS ? 1.1 : 1, //TODO: change magic number
        },
      },
    ];
  }
  return esQuery;
};

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
