import * as supertest from 'supertest';
import { GetRoutesQueryParams } from '../../../../src/route/controllers/routeController';

export class RouteRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getRoutes(queryParams?: GetRoutesQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get('/v1/search/routes/')
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
