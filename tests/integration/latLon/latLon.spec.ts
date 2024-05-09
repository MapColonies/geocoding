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

    it('should return 200 status code and tile from lat-lon', async function () {
      const reponse = await requestSender.getLatlonToTile({
        lat: 52.57326537485767,
        lon: 12.948781146422107,
      });

      expect(reponse.status).toBe(httpStatusCodes.OK);
      expect(reponse).toSatisfyApiSpec();
      expect(reponse.body).toMatchObject({
        tileName: 'BRN',
        subTileNumber: ['00', '00', '00'],
      });
    });

    it('should return 200 status code and lat-lon from tile', async function () {
      const reponse = await requestSender.getTileToLatLon({
        tile: 'BRN',
        sub_tile_number: [10, 10, 10],
      });

      expect(reponse.status).toBe(httpStatusCodes.OK);
      expect(reponse).toSatisfyApiSpec();
      expect(reponse.body).toMatchObject({
        geometry: {
          coordinates: [
            [
              [12.953293384350397, 52.512399536846765],
              [12.953440643865289, 52.512402084451686],
              [12.953436468347887, 52.51249192878939],
              [12.95328920853307, 52.512489381176245],
              [12.953293384350397, 52.512399536846765],
            ],
          ],
          type: 'Polygon',
        },
        type: 'Feature',
        properties: {
          TYPE: 'TILE',
          SUB_TILE_NUMBER: [10, 10, 10],
          TILE_NAME: 'BRN',
        },
      });
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    it('Check for missing required parameters', async function () {
      const arr = [
        {
          request: requestSender.getLatlonToMgrs(),
          missingProperties: ['lat', 'lon'],
        },
        {
          request: requestSender.getMgrsToLatlon(),
          missingProperties: ['mgrs'],
        },
        {
          request: requestSender.getLatlonToTile(),
          missingProperties: ['lat', 'lon'],
        },
        {
          request: requestSender.getTileToLatLon(),
          missingProperties: ['tile', 'sub_tile_number'],
        },
      ];

      for (const { request, missingProperties } of arr) {
        const message = 'request/query must have required property';

        const response: supertest.Response = await request;

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toMatchObject({ message: missingProperties.map((txt) => `${message} '${txt}'`).join(', ') });
        expect(response).toSatisfyApiSpec();
      }
    });

    it('abc', async function () {
      const parameter = 'test1234';
      const message = `Unknown query parameter '${parameter}'`;

      const arr = [
        {
          request: requestSender.getLatlonToMgrs({ [parameter]: parameter } as never),
        },
        {
          request: requestSender.getMgrsToLatlon({ [parameter]: parameter } as never),
        },
        {
          request: requestSender.getLatlonToTile({ [parameter]: parameter } as never),
        },
        {
          request: requestSender.getTileToLatLon({ [parameter]: parameter } as never),
        },
      ];

      for (const { request } of arr) {
        const response = await request;

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toMatchObject({ message });
        expect(response).toSatisfyApiSpec();
      }
    });
  });
  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
