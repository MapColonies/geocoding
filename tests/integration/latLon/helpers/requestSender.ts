import * as supertest from 'supertest';
import {
  GetLatLonToTileQueryParams,
  GetTileToLatLonQueryParams,
  GetLatLonToMgrsQueryParams,
  GetMgrsToLatLonQueryParams,
} from '../../../../src/latLon/controllers/latLonController';

const PREFIX = '/v1/lookup';

export class LatLonRequestSender {
  public constructor(private readonly app: Express.Application) {}

  public async getLatlonToTile(queryParams?: GetLatLonToTileQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get(`${PREFIX}/latlonToTile`)
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }

  public async getTileToLatLon(queryParams?: GetTileToLatLonQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get(`${PREFIX}/tileToLatLon`)
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }

  public async getLatlonToMgrs(queryParams?: GetLatLonToMgrsQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get(`${PREFIX}/latlonToMgrs`)
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }

  public async getMgrsToLatlon(queryParams?: GetMgrsToLatLonQueryParams): Promise<supertest.Response> {
    return supertest
      .agent(this.app)
      .get(`${PREFIX}/mgrsToLatLon`)
      .set('Content-Type', 'application/json')
      .set('X-API-Key', 'abc123')
      .set('x-user-id', 'abc123')
      .query(queryParams ?? {});
  }
}
