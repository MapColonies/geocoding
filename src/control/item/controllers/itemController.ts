/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../../common/constants';
import { ItemManager } from '../models/itemManager';
import { Item } from '../models/item';
import { CommonRequestParameters, FeatureCollection, GeoContext } from '../../../common/interfaces';

type GetItemsHandler = RequestHandler<undefined, FeatureCollection<Item>, undefined, GetItemsQueryParams>;

export interface GetItemsQueryParams extends CommonRequestParameters {
  command_name: string;
  tile?: string;
  sub_tile?: string;
}

@injectable()
export class ItemController {
  private readonly createdResourceCounter: BoundCounter;

  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(ItemManager) private readonly manager: ItemManager,
    @inject(SERVICES.METER) private readonly meter: Meter
  ) {
    this.createdResourceCounter = meter.createCounter('created_resource');
  }

  public getItems: GetItemsHandler = async (req, res, next) => {
    try {
      const { command_name: commandName, tile, sub_tile, geo_context, disable_fuzziness, limit } = req.query;
      const response = await this.manager.getItems({
        tile,
        subTile: sub_tile ? parseInt(sub_tile) : undefined,
        commandName,
        geo: geo_context,
        limit,
        disable_fuzziness,
      });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.warn('itemController.getItems Error:', error);
      next(error);
    }
  };
}
