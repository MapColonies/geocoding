/* eslint-disable @typescript-eslint/naming-convention */
import 'jest-openapi';
import { DependencyContainer } from 'tsyringe';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import httpStatusCodes from 'http-status-codes';
import { IConfig } from 'config';
import { RedisClient } from '@src/common/redis';
import { getApp } from '../../../src/app';
import { redisConfigPath, SERVICES } from '../../../src/common/constants';
import { GenericGeocodingFeatureResponse } from '../../../src/common/interfaces';
import { MgrsRequestSender } from './helpers/requestSender';
import { getBaseRegisterOptions } from './helpers';

describe('/search/MGRS', function () {
  let requestSender: MgrsRequestSender;
  let depContainer: DependencyContainer;

  beforeEach(async function () {
    const [app, container] = await getApp(getBaseRegisterOptions());

    depContainer = container;
    requestSender = new MgrsRequestSender(app);
  });

  afterAll(async function () {
    const cleanupRegistry = depContainer.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await cleanupRegistry.trigger();
    depContainer.reset();

    jest.clearAllTimers();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and MGRS in geojson', async function () {
      const response = await requestSender.getTile({ tile: '18SUJ2339007393' });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingFeatureResponse>({
        type: 'Feature',
        geocoding: {
          version: process.env.npm_package_version as string,
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
          matches: [
            {
              layer: 'MGRS',
              source: 'npm/mgrs',
              source_id: [],
            },
          ],
          names: {
            default: ['18SUJ2339007393'],
            display: '18SUJ2339007393',
          },
          score: 1,
        },
      });
    });

    describe('Redis uses prefix key', () => {
      it('should return 200 status code and add key to Redis with prefix', async function () {
        const realConfig = depContainer.resolve<IConfig>(SERVICES.CONFIG);
        const prefix = 'test-prefix-mgrs';

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

        const mockRegisterOptions = getBaseRegisterOptions([
          {
            token: SERVICES.CONFIG,
            provider: { useValue: configWithPrefix },
          },
        ]);

        const [mockApp, localContainer] = await getApp(mockRegisterOptions);
        const localRequestSender = new MgrsRequestSender(mockApp);

        const redisConnection = localContainer.resolve<RedisClient>(SERVICES.REDIS);

        const response = await localRequestSender.getTile({ tile: '18SUJ2339007393' });

        const keys = await redisConnection.keys(prefix + '*');
        expect(keys.length).toBeGreaterThanOrEqual(1);
        expect(response.status).toBe(httpStatusCodes.OK);
      });
    });
  });

  describe('Bad Path', function () {
    it('should return 400 status code when MGRS is invalid', async function () {
      const response = await requestSender.getTile({ tile: 'ABC{}' });

      expect(response.body).toEqual({
        message: 'Invalid MGRS tile. MGRSPoint bad conversion from ABC{}',
      });
      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });

    it('should return 400 status code when MGRS is missing', async function () {
      const response = await requestSender.getTile();

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message: "request/query must have required property 'tile'",
      });
    });

    it('should return 500 status code when MGRSPoint zone letter A not handled', async function () {
      const response = await requestSender.getTile({ tile: '{ABC}' });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message: 'Invalid MGRS tile. MGRSPoint zone letter A not handled: {ABC}',
      });
    });
  });
});
