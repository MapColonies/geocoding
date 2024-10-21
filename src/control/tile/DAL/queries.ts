import { estypes } from '@elastic/elasticsearch';
import { BBox } from 'geojson';
import { CommonRequestParameters } from '../../../common/interfaces';
import { ELASTIC_KEYWORDS } from '../../constants';
import { ConvertSnakeToCamelCase, geoContextQuery, parseGeo, RequireKeys } from '../../../common/utils';

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
}: Omit<TileQueryParams, 'subTile' | 'limit' | 'mgrs'> & Required<Pick<TileQueryParams, 'tile'>>): estypes.SearchRequest => ({
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
}: RequireKeys<Omit<TileQueryParams, 'mgrs'>, 'tile' | 'subTile'>): estypes.SearchRequest => ({
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

export const queryForTilesByBbox = ({
  bbox,
  geoContext,
  geoContextMode,
}: { bbox: BBox } & ConvertSnakeToCamelCase<CommonRequestParameters>): estypes.SearchRequest => {
  const { filter: geoCOntextQueryFilter, should } = geoContextQuery(geoContext, geoContextMode);

  const query: estypes.SearchRequest = {
    query: {
      bool: {
        must: [
          {
            term: {
              ['properties.TYPE.keyword']: 'TILE',
            },
          },
        ],
        filter: [
          {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            geo_shape: {
              [ELASTIC_KEYWORDS.geometry]: {
                shape: parseGeo({ bbox }),
                relation: 'intersects',
              },
            },
          },
          ...(geoCOntextQueryFilter ?? []),
        ],
        should,
      },
    },
  };
  return query;
};
