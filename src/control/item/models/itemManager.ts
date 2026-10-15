import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import { SERVICES } from '../../../common/constants';
import { CommonSpanAttributes, withSpan } from '../../../common/tracing';
import { ITEM_REPOSITORY_SYMBOL, ItemRepository } from '../DAL/itemRepository';
import { ItemQueryParams } from '../DAL/queries';
import { formatResponse } from '../../utils';
import { FeatureCollection, IApplication } from '../../../common/interfaces';
import { ControlSpanName, ControlAttributes } from '../../tracing';
import { Item } from './item';

@injectable()
export class ItemManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.APPLICATION) private readonly application: IApplication,
    @inject(ITEM_REPOSITORY_SYMBOL) private readonly itemRepository: ItemRepository
  ) {}

  public async getItems(itemQueryParams: ItemQueryParams): Promise<FeatureCollection<Item>> {
    return withSpan(
      ControlSpanName.ITEM_MANAGER_GET_ITEMS,
      {
        attributes: {
          [ControlAttributes.COMMAND_NAME]: itemQueryParams.commandName,
          [ControlAttributes.LIMIT]: itemQueryParams.limit,
          ...(itemQueryParams.tile !== undefined ? { [ControlAttributes.TILE]: itemQueryParams.tile } : {}),
          ...(itemQueryParams.subTile !== undefined ? { [ControlAttributes.SUB_TILE]: itemQueryParams.subTile } : {}),
        },
      },
      async (span) => {
        const { limit } = itemQueryParams;
        let elasticResponse: estypes.SearchResponse<Item> | undefined = undefined;
        elasticResponse = await this.itemRepository.getItems(itemQueryParams, limit);

        span?.setAttribute(CommonSpanAttributes.RESULT_COUNT, elasticResponse.hits.hits.length);

        return formatResponse(elasticResponse, itemQueryParams, this.application.controlObjectDisplayNamePrefixes);
      }
    );
  }
}
