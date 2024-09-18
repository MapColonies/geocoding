import { Logger } from '@map-colonies/js-logger';
import { estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { BBox } from 'geojson';
import { ElasticClient, ElasticClients } from '../../../common/elastic';
import { Tile } from '../models/tile';
import { queryElastic } from '../../../common/elastic/utils';
import { IConfig } from '../../../common/interfaces';
import { SERVICES } from '../../../common/constants';
import { additionalControlSearchProperties } from '../../utils';
import { queryForTiles, queryForSubTiles, TileQueryParams, queryForTilesByBbox } from './queries';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createTileRepository = (client: ElasticClient, config: IConfig, logger: Logger) => {
  return {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getTiles(tileQueryParams: TileQueryParams & Required<Pick<TileQueryParams, 'tile'>>): Promise<estypes.SearchResponse<Tile>> {
      const response = await queryElastic<Tile>(client, {
        ...additionalControlSearchProperties(config, tileQueryParams.limit),
        ...queryForTiles(tileQueryParams),
      });

      return response;
    },

    async getSubTiles(tileQueryParams: Required<TileQueryParams>): Promise<estypes.SearchResponse<Tile>> {
      const response = await queryElastic<Tile>(client, {
        ...additionalControlSearchProperties(config, tileQueryParams.limit),
        ...queryForSubTiles(tileQueryParams),
      });

      return response;
    },
    async getTilesByBbox(searchParams: { bbox: BBox } & Omit<TileQueryParams, 'tile' | 'subTile' | 'mgrs'>): Promise<estypes.SearchResponse<Tile>> {
      const response = await queryElastic<Tile>(client, {
        ...additionalControlSearchProperties(config, searchParams.limit),
        ...queryForTilesByBbox(searchParams),
      });
      return response;
    },
  };
};

export type TileRepository = ReturnType<typeof createTileRepository>;

export const tileRepositoryFactory: FactoryFunction<TileRepository> = (depContainer) => {
  return createTileRepository(
    depContainer.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS).control,
    depContainer.resolve<IConfig>(SERVICES.CONFIG),
    depContainer.resolve<Logger>(SERVICES.LOGGER)
  );
};

export const TILE_REPOSITORY_SYMBOL = Symbol('TILE_REPOSITORY_SYMBOL');
