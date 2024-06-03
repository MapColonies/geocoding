import * as supertest from 'supertest';
import { GetQueryQueryParams } from '../../../../src/query/interfaces';

export class QueryRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getQuery(queryParams?: GetQueryQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get('/query')
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('X-User-ID', 'abc123')
      .query(queryParams ?? {});
  }
}
