import type { Application } from 'express';
import supertest, { agent } from 'supertest';
import { GetTilesQueryParams } from '../../../../../src/control/tile/controllers/tileController';

export class TileRequestSender {
  public constructor(private readonly app: Application) {}

  public async getTiles(queryParams?: GetTilesQueryParams): Promise<supertest.Response> {
    return agent(this.app)
      .get('/search/control/tiles')
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
