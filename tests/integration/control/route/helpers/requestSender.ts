import type { Application } from 'express';
import supertest, { agent } from 'supertest';
import { GetRoutesQueryParams } from '../../../../../src/control/route/controllers/routeController';

export class RouteRequestSender {
  public constructor(private readonly app: Application) {}

  public async getRoutes(queryParams?: GetRoutesQueryParams): Promise<supertest.Response> {
    return agent(this.app)
      .get('/search/control/routes')
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
