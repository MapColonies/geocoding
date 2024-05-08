/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import supertest from 'supertest';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { LatLonRequestSender } from './helpers/requestSender';

describe('/latLon', function () {
  let requestSender: LatLonRequestSender;

  beforeEach(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new LatLonRequestSender(app.app);
  }, 20000);

  describe('Happy Path', function () {
    it('should return 200 status code and lat-lon from mgrs', async function () {
      const response = await requestSender.getMgrsToLatlon({ mgrs: '18TWL8565011369' });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject({
        lat: 40.74882151233783,
        lon: -73.98543192220956,
      });
    });

    it('should return 200 status code and mgrs from lat-lon', async function () {
      const reponse = await requestSender.getLatlonToMgrs({
        lat: 40.74882151233783,
        lon: -73.98543192220956,
      });

      expect(reponse.status).toBe(httpStatusCodes.OK);
      expect(reponse).toSatisfyApiSpec();
      expect(reponse.body).toMatchObject({
        mgrs: '18TWL8565011369',
      });
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    // describe('Check for missing required parameters', () => {
    //   test.each([
    //     [requestSender.getLatlonToMgrs, ['lat', 'lon']],
    //     [requestSender.getMgrsToLatlon, ['mgrs']],
    //     [requestSender.getLatlonToTile, ['lat', 'lon']],
    //     [requestSender.getTileToLatLon, ['tile', 'sub_tile_number']],
    //   ])(
    //     'Should return 400 status code and meessage "request/query must have required property \'%s\'"',
    //     async function (request, missingProperties) {
    //       const message = 'request/query must have required property';

    //       const response = await request();

    //       expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    //       expect(response.body).toMatchObject({ message: missingProperties.map((txt) => `${message} '${txt}'`).join(', ') });
    //       expect(response).toSatisfyApiSpec();
    //     }
    //   );
    // });

    it('abc', async function () {
      const arr = [
        {
          request: requestSender.getLatlonToMgrs,
          missingProperties: ['lat', 'lon'],
        },
        {
          request: requestSender.getMgrsToLatlon,
          missingProperties: ['mgrs'],
        },
        {
          request: requestSender.getLatlonToTile,
          missingProperties: ['lat', 'lon'],
        },
        {
          request: requestSender.getTileToLatLon,
          missingProperties: ['tile', 'sub_tile_number'],
        },
      ];

      for (const { request, missingProperties } of arr) {
        const message = 'request/query must have required property';

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        const response: supertest.Response = await request();

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toMatchObject({ message: missingProperties.map((txt) => `${message} '${txt}'`).join(', ') });
        expect(response).toSatisfyApiSpec();
      }
    });

    // describe('Check for invalid parameters', () => {
    //   test.each([[requestSender.getLatlonToMgrs], [requestSender.getMgrsToLatlon], [requestSender.getLatlonToTile], [requestSender.getTileToLatLon]])(
    //     'Should return 400 status code for unknown parameter',
    //     async function (request) {
    //       const parameter = 'test1234';
    //       const message = `Unknown query parameter '${parameter}'`;

    //       const response = await request({ [parameter]: parameter } as never);

    //       expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    //       expect(response.body).toMatchObject({ message });
    //       expect(response).toSatisfyApiSpec();
    //     }
    //   );
    // });
  });
  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
