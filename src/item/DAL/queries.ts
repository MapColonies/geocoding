import { estypes } from '@elastic/elasticsearch';
import { boundingBox, geoDistance } from '../../common/elastic/utils';
import { GeoContext } from '../../common/interfaces';

export interface ItemQueryParams {
  commandName: string;
  tile?: string;
  subTile?: number;
  geo?: GeoContext;
}

/* eslint-disable @typescript-eslint/naming-convention */
export const queryForItems = (params: ItemQueryParams): estypes.SearchRequest => ({
  query: {
    bool: {
      should: [
        {
          term: {
            'properties.TYPE.keyword': 'ITEM',
          },
        },
      ],
      must: [
        {
          match: {
            'properties.OBJECT_COMMAND_NAME.keyword': {
              query: params.commandName,
              fuzziness: 1,
              prefix_length: 1,
            },
          },
        },
        ...(params.tile ?? ''
          ? [
              {
                term: {
                  'properties.TILE_NAME.keyword': params.tile,
                },
              },
            ]
          : []),
        ...(params.subTile ?? 0
          ? [
              {
                term: {
                  'properties.SUB_TILE_ID.keyword': params.subTile,
                },
              },
            ]
          : []),
        ...(params.geo?.bbox ? [boundingBox(params.geo.bbox)] : []),
        ...((params.geo?.radius ?? 0) && (params.geo?.lat ?? 0) && (params.geo?.lon ?? 0)
          ? [
              geoDistance(
                params.geo as {
                  radius: number;
                  lon: number;
                  lat: number;
                }
              ),
            ]
          : []),
      ],
    },
  },
});
