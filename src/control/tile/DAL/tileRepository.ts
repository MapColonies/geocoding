import { estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import type { BBox } from 'geojson';
import { ConfigType } from '@src/common/config';
import { ElasticClient, ElasticClients } from '../../../common/elastic';
import { Tile } from '../models/tile';
import { queryElastic } from '../../../common/elastic/utils';
import { SERVICES } from '../../../common/constants';
import { CommonSpanAttributes, withSpan } from '../../../common/tracing';
import { additionalControlSearchProperties } from '../../utils';
import { ControlSpanName, ControlAttributes } from '../../tracing';
import { queryForTiles, queryForSubTiles, TileQueryParams, queryForTilesByBbox } from './queries';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createTileRepository = (client: ElasticClient, config: ConfigType) => {
  return {
    async getTiles(tileQueryParams: TileQueryParams & Required<Pick<TileQueryParams, 'tile'>>): Promise<estypes.SearchResponse<Tile>> {
      return withSpan(
        ControlSpanName.TILE_REPOSITORY_GET_TILES,
        { attributes: { [ControlAttributes.TILE]: tileQueryParams.tile, [ControlAttributes.LIMIT]: tileQueryParams.limit } },
        async (span) => {
          const response = await queryElastic<Tile>(client, {
            ...additionalControlSearchProperties(config, tileQueryParams.limit),
            ...queryForTiles(tileQueryParams),
          });

          span?.setAttributes({
            [CommonSpanAttributes.RESULT_COUNT]: response.hits.hits.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: response.took,
          });

          return response;
        }
      );
    },

    async getSubTiles(tileQueryParams: Required<TileQueryParams>): Promise<estypes.SearchResponse<Tile>> {
      return withSpan(
        ControlSpanName.TILE_REPOSITORY_GET_SUB_TILES,
        {
          attributes: {
            [ControlAttributes.TILE]: tileQueryParams.tile,
            [ControlAttributes.SUB_TILE]: tileQueryParams.subTile,
            [ControlAttributes.LIMIT]: tileQueryParams.limit,
          },
        },
        async (span) => {
          const response = await queryElastic<Tile>(client, {
            ...additionalControlSearchProperties(config, tileQueryParams.limit),
            ...queryForSubTiles(tileQueryParams),
          });

          span?.setAttributes({
            [CommonSpanAttributes.RESULT_COUNT]: response.hits.hits.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: response.took,
          });

          return response;
        }
      );
    },
    async getTilesByBbox(searchParams: { bbox: BBox } & Omit<TileQueryParams, 'tile' | 'subTile' | 'mgrs'>): Promise<estypes.SearchResponse<Tile>> {
      return withSpan(
        ControlSpanName.TILE_REPOSITORY_GET_TILES_BY_BBOX,
        { attributes: { [ControlAttributes.LIMIT]: searchParams.limit } },
        async (span) => {
          const response = await queryElastic<Tile>(client, {
            ...additionalControlSearchProperties(config, searchParams.limit),
            ...queryForTilesByBbox(searchParams),
          });

          span?.setAttributes({
            [CommonSpanAttributes.RESULT_COUNT]: response.hits.hits.length,
            [CommonSpanAttributes.MATCH_LATENCY_MS]: response.took,
          });

          return response;
        }
      );
    },
  };
};

export type TileRepository = ReturnType<typeof createTileRepository>;

export const tileRepositoryFactory: FactoryFunction<TileRepository> = (depContainer) => {
  return createTileRepository(
    depContainer.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS).control,
    depContainer.resolve<ConfigType>(SERVICES.CONFIG)
  );
};

export const TILE_REPOSITORY_SYMBOL = Symbol('TILE_REPOSITORY_SYMBOL');
