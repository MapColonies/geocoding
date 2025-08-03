import type { Application } from 'express';
import supertest, { agent } from 'supertest';
import { GetCoordinatesRequestParams } from '../../../../src/latLon/controllers/latLonController';

export class LatLonRequestSender {
  public constructor(private readonly app: Application) {}

  public async convertCoordinatesToGrid(queryParams?: GetCoordinatesRequestParams): Promise<supertest.Response> {
    return agent(this.app)
      .get(`/lookup/coordinates`)
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
