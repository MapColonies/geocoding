import * as supertest from 'supertest';
import { GetGeotextSearchParams } from '../../../../src/geotextSearch/interfaces';

export class GeotextSearchRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getGeotextSearch(queryParams?: GetGeotextSearchParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get('/v1/query')
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }

  public async getRegions(): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get('/v1/query/regions')
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('x-user-id', 'abc123');
  }
}
