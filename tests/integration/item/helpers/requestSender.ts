import * as supertest from 'supertest';
import { GetItemsQueryParams } from '../../../../src/item/controllers/itemController';

export class ItemRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getItems(queryParams?: GetItemsQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get('/v1/search/items/')
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
