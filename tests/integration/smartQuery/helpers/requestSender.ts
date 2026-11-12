import type { Application } from 'express';
import supertest, { agent } from 'supertest';
import type { GetSmartQueryParams } from '../../../../src/smartQuery/interfaces';

export class SmartQueryRequestSender {
  private readonly pathPrefix = '/search';

  public constructor(private readonly app: Application) {}

  public async getQuery(queryParams?: Partial<GetSmartQueryParams>): Promise<supertest.Response> {
    return agent(this.app)
      .get(`${this.pathPrefix}/query`)
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
