import type { Application } from 'express';
import supertest, { agent } from 'supertest';
import { GetGeotextSearchByCoordinatesParams, GetGeotextSearchParams } from '../../../../src/location/interfaces';

export class LocationRequestSender {
  private readonly pathPrefix = '/search/location';

  public constructor(private readonly app: Application) {}

  public async getQuery(queryParams?: GetGeotextSearchParams): Promise<supertest.Response> {
    return agent(this.app)
      .get(`${this.pathPrefix}/query`)
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }

  public async getRegions(): Promise<supertest.Response> {
    return agent(this.app)
      .get(`${this.pathPrefix}/regions`)
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123');
  }

  public async getSources(): Promise<supertest.Response> {
    return agent(this.app)
      .get(`${this.pathPrefix}/sources`)
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123');
  }

  public async getLocationByCoordinates(queryParams: GetGeotextSearchByCoordinatesParams): Promise<supertest.Response> {
    return agent(this.app)
      .get(`${this.pathPrefix}/coordinates`)
      .set('Content-Type', 'application/json')
      .set('x-api-key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams);
  }
}
