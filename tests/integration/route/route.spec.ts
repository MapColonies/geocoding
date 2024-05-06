/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { GetRoutesQueryParams } from '../../../src/route/controllers/routeController';
import { RouteRequestSender } from './helpers/requestSender';

describe('/routes', function () {
  let requestSender: RouteRequestSender;

  beforeEach(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new RouteRequestSender(app.app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the route', async function () {
      const response = await requestSender.getRoutes({ command_name: 'abc' });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
    });
    it('should return 200 status code and empty response', async function () {
      const response = await requestSender.getRoutes({ command_name: '48054805' });

      expect(response.status).toBe(httpStatusCodes.OK);

      // expect(response).toSatisfyApiSpec(); // TODO:
      expect(response.body).toMatchObject({
        type: 'FeatureCollection',
        features: [],
      });
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    it('Should return 400 status code and meessage "request/query must have required property \'command_name\'"', async function () {
      const message = "request/query must have required property 'command_name'";

      const response = await requestSender.getRoutes();

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({ message });
      expect(response).toSatisfyApiSpec();
    });
    it('Should return 400 status code for unknown parameter', async function () {
      const parameter = 'test1234';
      const message = `Unknown query parameter '${parameter}'`;

      const response = await requestSender.getRoutes({ [parameter]: parameter } as unknown as GetRoutesQueryParams);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({ message });
      expect(response).toSatisfyApiSpec();
    });
  });
  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
