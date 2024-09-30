import { Logger } from '@map-colonies/js-logger';
import { estypes } from '@elastic/elasticsearch';
import { FactoryFunction } from 'tsyringe';
import { IConfig } from '../../common/interfaces';
import { ElasticClients } from '../../common/elastic';
import { additionalControlSearchProperties, queryElastic } from '../../common/elastic/utils';
import { ElasticClient } from '../../common/elastic';
import { Item } from '../models/item';
import { SERVICES } from '../../common/constants';
import { ItemQueryParams, queryForItems } from './queries';

/* eslint-enable @typescript-eslint/naming-convention */

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createItemRepository = (client: ElasticClient, config: IConfig, logger: Logger) => {
  return {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    async getItems(itemQueryParams: ItemQueryParams, size: number): Promise<estypes.SearchResponse<Item>> {
      logger.info('Querying items from elastic');
      const response = await queryElastic<Item>(client, { ...additionalControlSearchProperties(config, size), ...queryForItems(itemQueryParams) });

      return response;
    },
  };
};

export type ItemRepository = ReturnType<typeof createItemRepository>;

export const itemRepositoryFactory: FactoryFunction<ItemRepository> = (depContainer) => {
  return createItemRepository(
    depContainer.resolve<ElasticClients>(SERVICES.ELASTIC_CLIENTS).control,
    depContainer.resolve<IConfig>(SERVICES.CONFIG),
    depContainer.resolve<Logger>(SERVICES.LOGGER)
  );
};

export const ITEM_REPOSITORY_SYMBOL = Symbol('ITEM_REPOSITORY_SYMBOL');
