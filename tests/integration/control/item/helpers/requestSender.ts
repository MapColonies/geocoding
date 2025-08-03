import type { Application } from 'express';
import supertest, { agent } from 'supertest';
import { GetItemsQueryParams } from '../../../../../src/control/item/controllers/itemController';

export class ItemRequestSender {
  public constructor(private readonly app: Application) {}

  public async getItems(queryParams?: GetItemsQueryParams): Promise<supertest.Response> {
    return agent(this.app)
      .get('/search/control/items')
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
