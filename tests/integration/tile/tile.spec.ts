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
      const response = await requestSender.getTiles({ tile: 'abc' });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
    });
    it('should return 200 status code and the subtile', async function () {
      const response = await requestSender.getTiles({ tile: 'abc', sub_tile: '65' });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
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
