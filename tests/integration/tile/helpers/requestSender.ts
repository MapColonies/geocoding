import * as supertest from 'supertest';
import { GetTilesQueryParams } from '../../../../src/tile/controllers/tileController';

export class TileRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getTiles(queryParams?: GetTilesQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get('/v1/search/tiles/')
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
