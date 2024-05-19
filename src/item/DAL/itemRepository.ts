import { Client, estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { elasticClientSymbol } from '../../common/elastic';
import { Item } from '../models/item';
import { additionalSearchProperties } from '../../common/utils';
import { ElasticClients } from '../../common/interfaces';
import { ItemQueryParams, queryForItems } from './queries';

/* eslint-enable @typescript-eslint/naming-convention */

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createItemRepository = (client: Client) => {
  return {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getItems(itemQueryParams: ItemQueryParams, size: number): Promise<estypes.SearchResponse<Item>> {
      const response = await client.search<Item>({
        ...additionalSearchProperties(size),
        body: queryForItems(itemQueryParams),
      });

      return response;
    },
  };
};

export type ItemRepository = ReturnType<typeof createItemRepository>;

export const itemRepositoryFactory: FactoryFunction<ItemRepository> = (depContainer) => {
  return createItemRepository(depContainer.resolve<ElasticClients>(elasticClientSymbol).searchy);
};

export const ITEM_REPOSITORY_SYMBOL = Symbol('ITEM_REPOSITORY_SYMBOL');
