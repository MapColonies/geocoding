/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { GetTilesQueryParams } from '../../../src/tile/controllers/tileController';
import { TileRequestSender } from './helpers/requestSender';

describe('/tiles', function () {
  let requestSender: TileRequestSender;

  beforeEach(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new TileRequestSender(app.app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the tile', async function () {
      const response = await requestSender.getTiles({ tile: 'RIT' });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              coordinates: [
                [
                  [12.539507865186607, 41.851751203650096],
                  [12.536787075186538, 41.94185043165008],
                  [12.42879133518656, 41.93952837265009],
                  [12.431625055186686, 41.84943698365008],
                  [12.539507865186607, 41.851751203650096],
                ],
              ],
              type: 'Polygon',
            },
            properties: {
              TILE_NAME: 'RIT',
              TYPE: 'TILE',
            },
          },
        ],
      });
    });

    it('should return 200 status code and the subtile', async function () {
      const response = await requestSender.getTiles({ tile: 'GRC', sub_tile: '65' });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              coordinates: [
                [
                  [27.149158174343427, 35.63159611670335],
                  [27.149274355343437, 35.64061707270338],
                  [27.138786228343463, 35.640716597703374],
                  [27.13867103934342, 35.631695606703374],
                  [27.149158174343427, 35.63159611670335],
                ],
              ],
              type: 'Polygon',
            },
            properties: {
              SUB_TILE_ID: '65',
              TILE_NAME: 'GRC',
              TYPE: 'SUB_TILE',
            },
          },
        ],
      });
    });

    it('should return 200 status code and response empty array', async function () {
      const response = await requestSender.getTiles({ tile: 'xyz' });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject({
        type: 'FeatureCollection',
        features: [],
      });
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    it('Should return 400 status code and meessage "request/query must have required property \'tile\'"', async function () {
      const message = "request/query must have required property 'tile'";

      const response = await requestSender.getTiles();

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({ message });
      expect(response).toSatisfyApiSpec();
    });
    it('Should return 400 status code for unknown parameter', async function () {
      const parameter = 'test1234';
      const message = `Unknown query parameter '${parameter}'`;

      const response = await requestSender.getTiles({ [parameter]: parameter } as unknown as GetTilesQueryParams);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({ message });
      expect(response).toSatisfyApiSpec();
    });
  });
  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
