import * as supertest from 'supertest';
import { GetItemsQueryParams } from '../../../../../src/control/item/controllers/itemController';

export class ItemRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getItems(queryParams?: GetItemsQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get('/search/control/items')
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
