/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import { BoundCounter, Meter } from '@opentelemetry/api-metrics';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';

import { ItemManager } from '../models/itemManager';
import { Item } from '../models/item';
import { GeoContext } from '../../common/interfaces';

type GetResourceHandler = RequestHandler<
  undefined,
  {
    type: string;
    features: (Item | undefined)[];
  },
  undefined,
  {
    command_name: string;
    tile?: string;
    sub_tile?: string;
    geo_context?: string;
    reduce_fuzzy_match?: string;
    size?: string;
  }
>;

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

  public getItems: GetResourceHandler = async (req, res) => {
    const { command_name: commandName, tile, sub_tile, geo_context, reduce_fuzzy_match, size } = req.query;
    const response = await this.manager.getItems(
      {
        commandName,
        tile,
        subTile: sub_tile ? parseInt(sub_tile) : undefined,
        geo: geo_context ? (JSON.parse(geo_context) as GeoContext) : undefined,
      },
      reduce_fuzzy_match == 'true',
      size ? parseInt(size) : undefined
    );
    return res.status(httpStatus.OK).json(response);
  };
}
