import { Client, estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { elasticClientSymbol } from '../../common/elastic';
import { Tile } from '../models/tile';
import { additionalSearchProperties } from '../../common/utils';
import { queryForTiles, queryForSubTiles, TileQueryParams } from './queries';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createTileRepository = (client: Client) => {
  return {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getTiles(tileQueryParams: TileQueryParams, size: number): Promise<estypes.SearchResponse<Tile>> {
      const response = await client.search<Tile>({
        ...additionalSearchProperties(size),
        body: queryForTiles(tileQueryParams),
      });

      return response;
    },

    async getSubTiles(tileQueryParams: Required<TileQueryParams>, size: number): Promise<estypes.SearchResponse<Tile>> {
      const response = await client.search<Tile>({
        ...additionalSearchProperties(size),
        body: queryForSubTiles(tileQueryParams),
      });

      return response;
    },
  };
};

export type TileRepository = ReturnType<typeof createTileRepository>;

export const tileRepositoryFactory: FactoryFunction<TileRepository> = (depContainer) => {
  return createTileRepository(depContainer.resolve<Client>(elasticClientSymbol));
};

export const TILE_REPOSITORY_SYMBOL = Symbol('TILE_REPOSITORY_SYMBOL');
