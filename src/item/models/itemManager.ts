import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import { SERVICES, elasticConfigPath } from '../../common/constants';
import { ITEM_REPOSITORY_SYMBOL, ItemRepository } from '../DAL/itemRepository';
import { ItemQueryParams } from '../DAL/queries';
import { formatResponse } from '../../common/utils';
import { ElasticDbClientsConfig, FeatureCollection } from '../../common/interfaces';
import { Item } from './item';

@injectable()
export class ItemManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(ITEM_REPOSITORY_SYMBOL) private readonly itemRepository: ItemRepository
  ) {}

  public async getItems(itemQueryParams: ItemQueryParams, reduceFuzzyMatch = false, size?: number): Promise<FeatureCollection<Item>> {
    let elasticResponse: estypes.SearchResponse<Item> | undefined = undefined;
    elasticResponse = await this.itemRepository.getItems(
      itemQueryParams,
      size ?? this.config.get<ElasticDbClientsConfig>(elasticConfigPath).control.properties.defaultResponseLimit
    );

    const formattedResponse = formatResponse(elasticResponse);

    if (reduceFuzzyMatch && formattedResponse.features.length > 0) {
      const filterFunction = (hit: Item | undefined): hit is Item => hit?.properties?.OBJECT_COMMAND_NAME === itemQueryParams.commandName;
      formattedResponse.features = formattedResponse.features.filter(filterFunction);
    }

    return formattedResponse;
  }
}
