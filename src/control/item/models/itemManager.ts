import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import { SERVICES } from '../../../common/constants';
import { ITEM_REPOSITORY_SYMBOL, ItemRepository } from '../DAL/itemRepository';
import { ItemQueryParams } from '../DAL/queries';
import { formatResponse } from '../../utils';
import { FeatureCollection, IApplication } from '../../../common/interfaces';
import { Item } from './item';
import { ConfigType } from '@src/common/config';

@injectable()
export class ItemManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: ConfigType,
    @inject(SERVICES.APPLICATION) private readonly application: IApplication,
    @inject(ITEM_REPOSITORY_SYMBOL) private readonly itemRepository: ItemRepository
  ) {}

  public async getItems(itemQueryParams: ItemQueryParams): Promise<FeatureCollection<Item>> {
    const { limit } = itemQueryParams;
    let elasticResponse: estypes.SearchResponse<Item> | undefined = undefined;
    elasticResponse = await this.itemRepository.getItems(itemQueryParams, limit);

    return formatResponse(elasticResponse, itemQueryParams, this.application.controlObjectDisplayNamePrefixes);
  }
}
