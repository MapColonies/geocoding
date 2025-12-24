/* eslint-disable @typescript-eslint/naming-convention */
import 'jest-openapi';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import httpStatusCodes from 'http-status-codes';
import { IConfig } from 'config';
import { RedisClient } from '@src/common/redis';
import { getApp } from '../../../src/app';
import { redisConfigPath, SERVICES } from '../../../src/common/constants';
import { LatLonDAL } from '../../../src/latLon/DAL/latLonDAL';
import { GenericGeocodingFeatureResponse } from '../../../src/common/interfaces';
import { LatLonRequestSender } from './helpers/requestSender';

describe('/lookup', function () {
  let requestSender: LatLonRequestSender;
  let depContainer: DependencyContainer;

  beforeEach(async function () {
    const [app, container] = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });

    depContainer = container;
    requestSender = new LatLonRequestSender(app);
  });

  afterAll(async function () {
    const cleanupRegistry = depContainer.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await cleanupRegistry.trigger();
    depContainer.reset();

    jest.clearAllTimers();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and tile from lat-lon', async function () {
      const response = await requestSender.convertCoordinatesToGrid({
        lat: 52.57326537485767,
        lon: 12.948781146422107,
        target_grid: 'control',
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingFeatureResponse>({
        type: 'Feature',
        geocoding: {
          version: expect.any(String) as string,
          query: {
            lat: 52.57326537485767,
            lon: 12.948781146422107,
            target_grid: 'control',
          },
          response: {
            max_score: 1,
            results_count: 1,
            match_latency_ms: 0,
          },
        },
        bbox: [12.93694771534361, 52.51211561266182, 13.080296161196031, 52.60444267653175],
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [12.93694771534361, 52.51211561266182],
              [12.93694771534361, 52.60444267653175],
              [13.080296161196031, 52.60444267653175],
              [13.080296161196031, 52.51211561266182],
              [12.93694771534361, 52.51211561266182],
            ],
          ],
        },
        properties: {
          matches: [
            {
              layer: 'convertionTable',
              source: 'mapcolonies',
              source_id: [],
            },
          ],
          names: {
            default: ['BRN'],
            display: 'BRN',
          },
          tileName: 'BRN',
          subTileNumber: ['06', '97', '97'],
        },
      });
    });

    it('should return 200 status code and MGRS from lat-lon', async function () {
      const response = await requestSender.convertCoordinatesToGrid({
        lat: 52.57326537485767,
        lon: 12.948781146422107,
        target_grid: 'MGRS',
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingFeatureResponse>({
        type: 'Feature',
        geocoding: {
          version: expect.any(String) as string,
          query: {
            lat: 52.57326537485767,
            lon: 12.948781146422107,
            target_grid: 'MGRS',
          },
          response: {
            max_score: 1,
            results_count: 1,
            match_latency_ms: 0,
          },
        },
        bbox: [12.948777289238832, 52.57325754975297, 12.948791616108007, 52.57326678960368],
        geometry: {
          type: 'Point',
          coordinates: [12.948781146422107, 52.57326537485767],
        },
        properties: {
          matches: [
            {
              layer: 'MGRS',
              source: 'npm/MGRS',
              source_id: [],
            },
          ],
          names: {
            default: ['33UUU6099626777'],
            display: '33UUU6099626777',
          },
          accuracy: '1m',
          mgrs: '33UUU6099626777',
          score: 1,
        },
      });
    });

    describe('Redis uses prefix key', () => {
      it('should return 200 status code and add key to Redis with prefix', async function () {
        const realConfig = depContainer.resolve<IConfig>(SERVICES.CONFIG);
        const prefix = 'test-prefix-latlon';

        const configWithPrefix: IConfig = {
          ...realConfig,
          get<T>(key: string): T {
            if (key === redisConfigPath) {
              const realRedisConfig = realConfig.get<RedisClient>(redisConfigPath);
              return { ...realRedisConfig, prefix } as T;
            }
            return realConfig.get<T>(key);
          },
        };

        const mockRegisterOptions = {
          override: [
            { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
            { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
            { token: SERVICES.CONFIG, provider: { useValue: configWithPrefix } },
          ],
          useChild: true,
        };

        const [mockApp, localContainer] = await getApp(mockRegisterOptions);
        const localRequestSender = new LatLonRequestSender(mockApp);

        const redisConnection = localContainer.resolve<RedisClient>(SERVICES.REDIS);

        const response = await localRequestSender.convertCoordinatesToGrid({
          lat: 52.57326537485767,
          lon: 12.948781146422107,
          target_grid: 'MGRS',
        });

        const keys = await redisConnection.keys(prefix + '*');
        expect(keys.length).toBeGreaterThanOrEqual(1);
        expect(response.status).toBe(httpStatusCodes.OK);
      });
    });
  });

  describe('Bad Path', function () {
    it('should retrun 400 status code when invalid lat lon', async function () {
      const response = await requestSender.convertCoordinatesToGrid({
        lat: 67.9435100890131,
        lon: -84.41903041752825,
        target_grid: 'control',
      });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual({
        message: "Invalid lat lon, check 'lat' and 'lon' keys exists and their values are legal",
      });
    });

    it('should return 400 status code when the coordinate is outside the grid extent', async function () {
      const response = await requestSender.convertCoordinatesToGrid({
        lat: 32.57326537485767,
        lon: 12.948781146422107,
        target_grid: 'control',
      });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      //   expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual({
        message: 'The coordinate is outside the grid extent',
      });
    });
  });

  describe('Sad Path', function () {
    it('should return 500 as isDataLoadError is true for control', async function () {
      const dataLoadErrorSpy = jest.spyOn(LatLonDAL.prototype, 'getIsDataLoadError').mockReturnValue(true);

      const response = await requestSender.convertCoordinatesToGrid({
        lat: 32.57326537485767,
        lon: 12.948781146422107,
        target_grid: 'control',
      });

      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
      //   expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual({
        message: 'Lat-lon to tile data currently not available',
        stacktrace: expect.any(String) as string,
      });

      dataLoadErrorSpy.mockRestore();
    });
  });

  it('should return error when cronPattern is not defined', async () => {
    try {
      await getApp({
        override: [
          { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
          { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
          { token: SERVICES.APPLICATION, provider: { useValue: {} } },
        ],
        useChild: true,
      });
      // If no error is thrown, fail the test
      throw new Error('Expected error was not thrown');
    } catch (error) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect((error as Error).message).toBe('cron pattern is not defined');
    }
  });
});
