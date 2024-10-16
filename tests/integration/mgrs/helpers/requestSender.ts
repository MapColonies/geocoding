import * as supertest from 'supertest';
import { GetTileQueryParams } from '../../../../src/mgrs/controllers/mgrsController';

export class MgrsRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getTile(queryParams?: GetTileQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get('/search/MGRS/tiles')
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
