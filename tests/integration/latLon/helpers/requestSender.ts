import * as supertest from 'supertest';
import { GetCoordinatesRequestParams } from '../../../../src/latLon/controllers/latLonController';

export class LatLonRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async convertCoordinatesToGrid(queryParams?: GetCoordinatesRequestParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get(`/lookup/coordinates`)
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
