/* eslint-disable @typescript-eslint/naming-convention */
import config from 'config';
import { DependencyContainer } from 'tsyringe';
import { Application } from 'express';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { S3_REPOSITORY_SYMBOL } from '../../../src/common/s3/s3Repository';
import { cronLoadTileLatLonDataSymbol } from '../../../src/latLon/DAL/latLonDAL';
import { GetGeotextSearchParams, QueryResult } from '../../../src/location/interfaces';
import { GeoContextMode, IApplication } from '../../../src/common/interfaces';
import { MgrsRequestSender } from './helpers/requestSender';

describe('/search/MGRS', function () {
  let requestSender: MgrsRequestSender;
  let app: { app: Application; container: DependencyContainer };

  beforeEach(async function () {
    app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
        { token: S3_REPOSITORY_SYMBOL, provider: { useValue: {} } },
        { token: SERVICES.S3_CLIENT, provider: { useValue: {} } },
        { token: cronLoadTileLatLonDataSymbol, provider: { useValue: {} } },
        { token: SERVICES.ELASTIC_CLIENTS, provider: { useValue: {} } },
      ],
      useChild: true,
    });

    requestSender = new MgrsRequestSender(app.app);
  });

  afterAll(async function () {
    const cleanupRegistry = app.container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await cleanupRegistry.trigger();
    app.container.reset();

    jest.clearAllTimers();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and MGRS in geojson', async function () {
      const response = await requestSender.getTile({ tile: '18SUJ2339007393' });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toMatchObject({
        type: 'Feature',
        geocoding: {
          query: {
            tile: '18SUJ2339007393',
          },
          response: {
            max_score: 1,
            results_count: 1,
            match_latency_ms: 0,
          },
        },
        bbox: [-77.03654883669269, 38.89767541638445, -77.03653756947197, 38.897684623284015],
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-77.03654883669269, 38.89767541638445],
              [-77.03654883669269, 38.897684623284015],
              [-77.03653756947197, 38.897684623284015],
              [-77.03653756947197, 38.89767541638445],
              [-77.03654883669269, 38.89767541638445],
            ],
          ],
        },
        properties: {
          score: 1,
        },
      });
    });
  });

  describe('Bad Path', function () {
    it('should return 400 status code when MGRS is invalid', async function () {
      const response = await requestSender.getTile({ tile: 'ABC{}' });

      expect(response.body).toMatchObject({
        message: 'Invalid MGRS tile',
      });
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });

    it('should return 400 status code when MGRS is missing', async function () {
      const response = await requestSender.getTile();

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: "request/query must have required property 'tile'",
      });
    });
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
    it('should return 500 status code when MGRSPoint zone letter A not handled', async function () {
      const response = await requestSender.getTile({ tile: '{ABC}' });

      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body).toMatchObject({
        message: 'MGRSPoint zone letter A not handled: {ABC}',
      });
    });
  });
});
