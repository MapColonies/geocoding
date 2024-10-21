/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../../common/constants';
import { ItemManager } from '../models/itemManager';
import { Item } from '../models/item';
import { FeatureCollection } from '../../../common/interfaces';
import { ConvertCamelToSnakeCase } from '../../../common/utils';
import { ItemQueryParams } from '../DAL/queries';

type GetItemsHandler = RequestHandler<undefined, FeatureCollection<Item>, undefined, GetItemsQueryParams>;

export type GetItemsQueryParams = ConvertCamelToSnakeCase<ItemQueryParams>;

@injectable()
export class ItemController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(ItemManager) private readonly manager: ItemManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = this.meter.createCounter('created_item');
  }

  public getItems: GetItemsHandler = async (req, res, next) => {
    try {
      const { command_name: commandName, tile, sub_tile, geo_context, geo_context_mode, disable_fuzziness, limit } = req.query;
      const response = await this.manager.getItems({
        tile,
        subTile: sub_tile,
        commandName,
        geoContext: geo_context,
        geoContextMode: geo_context_mode,
        limit,
        disableFuzziness: disable_fuzziness,
      });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error({ msg: 'itemController.getItems error', error });
      next(error);
    }
  };
}
