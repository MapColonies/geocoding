/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { DependencyContainer } from 'tsyringe';
import { Application } from 'express';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import httpStatusCodes from 'http-status-codes';
import { BBox } from 'geojson';
import { getApp } from '../../../../src/app';
import { SERVICES } from '../../../../src/common/constants';
import { GetTilesQueryParams } from '../../../../src/control/tile/controllers/tileController';
import { Tile } from '../../../../src/control/tile/models/tile';
import { CommonRequestParameters, GenericGeocodingResponse, GeoContext, GeoContextMode } from '../../../../src/common/interfaces';
import { S3_REPOSITORY_SYMBOL } from '../../../../src/common/s3/s3Repository';
import { cronLoadTileLatLonDataSymbol } from '../../../../src/latLon/DAL/latLonDAL';
import { expectedResponse } from '../utils';
import { RIC_TILE, RIT_TILE, SUB_TILE_65, SUB_TILE_66 } from '../../../mockObjects/tiles';
import { TileRequestSender } from './helpers/requestSender';

describe('/search/control/tiles', function () {
  let requestSender: TileRequestSender;
  let app: { app: Application; container: DependencyContainer };

  beforeEach(async function () {
    app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
        { token: S3_REPOSITORY_SYMBOL, provider: { useValue: {} } },
        { token: SERVICES.S3_CLIENT, provider: { useValue: {} } },
        { token: cronLoadTileLatLonDataSymbol, provider: { useValue: {} } },
      ],
      useChild: true,
    });

    requestSender = new TileRequestSender(app.app);
  });

  afterAll(async function () {
    const cleanupRegistry = app.container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await cleanupRegistry.trigger();
    app.container.reset();

    jest.clearAllTimers();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and tiles', async function () {
      const requestParams: GetTilesQueryParams = { tile: 'RIT', limit: 5, disable_fuzziness: false };

      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIT_TILE, RIC_TILE], expect)
      );
    });

    it('should return 200 status code and tiles biased by geo_context (bbox)', async function () {
      const requestParams: GetTilesQueryParams = {
        tile: 'RI',
        geo_context: { bbox: [12.554407132912445, 41.84962590648513, 12.652837919839953, 41.94545380230761] },
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIC_TILE, RIT_TILE], expect)
      );
    });

    it('should return 200 status code and tiles filtered by geo_context (bbox)', async function () {
      const requestParams: GetTilesQueryParams = {
        tile: 'RI',
        geo_context: { bbox: [12.554407132912445, 41.84962590648513, 12.652837919839953, 41.94545380230761] },
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIC_TILE], expect)
      );
    });

    it('should return 200 status code and tiles biased by geo_context (WGS84)', async function () {
      const geo_context = { lon: 12.598899687444742, lat: 41.90667824634701, radius: 10 };
      const requestParams: GetTilesQueryParams = {
        tile: 'RI',
        geo_context,
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetTilesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIC_TILE, RIT_TILE], expect)
      );
    });

    it('should return 200 status code and tiles filtered by geo_context (WGS84)', async function () {
      const geo_context = { lon: 12.598899687444742, lat: 41.90667824634701, radius: 10 };
      const requestParams: GetTilesQueryParams = {
        tile: 'RI',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetTilesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIC_TILE], expect)
      );
    });

    it('should return 200 status code and tiles biased by geo_context (UTM)', async function () {
      const geo_context = { x: 300850, y: 4642203, zone: 33, radius: 100 };
      const requestParams: GetTilesQueryParams = {
        tile: 'RI',
        geo_context,
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetTilesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIC_TILE, RIT_TILE], expect)
      );
    });

    it('should return 200 status code and tiles filtered by geo_context (UTM)', async function () {
      const geo_context = { x: 300850, y: 4642203, zone: 33, radius: 100 };
      const requestParams: GetTilesQueryParams = {
        tile: 'RI',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetTilesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIC_TILE], expect)
      );
    });

    it('should return 200 status code and send RIC tile as disable_fuzziness is true', async function () {
      const requestParams: GetTilesQueryParams = {
        tile: 'RIC',
        limit: 5,
        disable_fuzziness: true,
      };
      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIC_TILE], expect)
      );
    });

    it('should return 200 status code and no tile as disable_fuzziness is true', async function () {
      const requestParams: GetTilesQueryParams = {
        tile: 'RI',
        limit: 5,
        disable_fuzziness: true,
      };
      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [], expect)
      );
    });

    it('should return 200 status code and sub tiles', async function () {
      const requestParams: GetTilesQueryParams = {
        tile: 'RIT',
        sub_tile: '66',
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [SUB_TILE_66, SUB_TILE_65], expect)
      );
    });

    it('should return 200 status code and no sub tiles as disable_fuzziness: true', async function () {
      const requestParams: GetTilesQueryParams = {
        tile: 'RIT',
        sub_tile: '11',
        limit: 5,
        disable_fuzziness: true,
      };
      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [], expect)
      );
    });

    it('should return 200 status code and sub_tile "66" filtered by geo_context (UTM)', async function () {
      const geo_context = { x: 288240, y: 4645787, zone: 33, radius: 100 };
      const requestParams: GetTilesQueryParams = {
        tile: 'RIT',
        sub_tile: '66',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetTilesQueryParams['geo_context'],
      });

      // expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [SUB_TILE_66], expect)
      );
    });

    it('should return 200 status code and sub_tile "66" filtered by geo_context (WGS84)', async function () {
      const geo_context = { lon: 12.445715777842793, lat: 41.935651320498835, radius: 100 };
      const requestParams: GetTilesQueryParams = {
        tile: 'RIT',
        sub_tile: '66',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetTilesQueryParams['geo_context'],
      });

      // expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [SUB_TILE_66], expect)
      );
    });
    it('should return 200 status code and sub_tile "66" filtered by geo_context (bbox)', async function () {
      const requestParams: GetTilesQueryParams = {
        tile: 'RIT',
        sub_tile: '66',
        geo_context: { bbox: [12.442900073406776, 41.92988103633658, 12.450060653825801, 41.939618057332865] },
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [SUB_TILE_66], expect)
      );
    });

    it('should return 200 status code and control tiles by MGRS', async function () {
      const requestParams: GetTilesQueryParams = {
        mgrs: '33TTG958462',
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIT_TILE, RIC_TILE], expect)
      );
    });

    it('should return 200 status code and control tiles by MGRS and geo_context filter (WGS84)', async function () {
      const geo_context: { bbox: BBox } = { bbox: [12.593772987581218, 41.89988905812697, 12.593772987581218, 41.89988905812697] };
      const requestParams: GetTilesQueryParams = {
        mgrs: '33TTG958462',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetTilesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIC_TILE], expect)
      );
    });

    it('should return 200 status code and control tiles by MGRS and geo_context bias (WGS84)', async function () {
      const geo_context: { bbox: BBox } = { bbox: [12.593772987581218, 41.89988905812697, 12.593772987581218, 41.89988905812697] };
      const requestParams: GetTilesQueryParams = {
        mgrs: '33TTG958462',
        geo_context,
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getTiles({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetTilesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toEqual<GenericGeocodingResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [RIC_TILE, RIT_TILE], expect)
      );
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    it('should return 400 status code and error message when tile or mgrs is not defined', async function () {
      const response = await requestSender.getTiles({} as unknown as GetTilesQueryParams);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message: "/control/tiles: only one of 'tile' or 'mgrs' query parameter must be defined",
      });
    });

    it('should return 400 status code and error message when tile value is empty', async function () {
      const response = await requestSender.getTiles({ tile: '', limit: 5, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message: "Empty value found for query parameter 'tile'",
      });
    });

    it('should return 400 status code and error message when tile value is invalid', async function () {
      let response = await requestSender.getTiles({ tile: 'invalid', limit: 5, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message: 'request/query/tile must NOT have more than 3 characters',
      });

      response = await requestSender.getTiles({ tile: 'i', limit: 5, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message: 'request/query/tile must NOT have fewer than 2 characters',
      });
    });

    it('should return 400 status code and error message when mgrs value is invalid', async function () {
      let response = await requestSender.getTiles({ mgrs: '', limit: 5, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message: "Empty value found for query parameter 'mgrs'",
      });

      response = await requestSender.getTiles({ tile: 'i', limit: 5, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message: 'request/query/tile must NOT have fewer than 2 characters',
      });
    });

    test.each<string>(['{dsa}', '0', 'z', '000', '!321'])(
      'should return 400 status code and error message when mgrs tile is invalid',
      async (mgrs) => {
        const response = await requestSender.getTiles({ mgrs, limit: 5, disable_fuzziness: false });

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toEqual({
          message: `Invalid MGRS: ${mgrs}`,
        });
      }
    );

    test.each<number[][]>([[[1]], [[1, 1]], [[1, 1, 1]], [[1, 1, 1, 1, 1]]])(
      'should return 400 status code and error message when bbox not containing 4 or 6 values',
      async function (bbox) {
        const response = await requestSender.getTiles({
          tile: 'RIT',
          limit: 5,
          disable_fuzziness: false,
          geo_context: { bbox: bbox as BBox },
          geo_context_mode: GeoContextMode.FILTER,
        });

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toEqual({
          message:
            'geo_context validation: geo_context must contain one of the following: {"bbox": [number,number,number,number] | [number,number,number,number,number,number]}, {"lat": number, "lon": number, "radius": number}, or {"x": number, "y": number, "zone": number, "radius": number}',
        });
      }
    );

    test.each<string>(['invalid', '6a6', '06', '-11', '6 ', ' 6', ' ', ' 6 ', ''])(
      'should return 400 status code and error message when sub_tile value is invalid',
      async (sub_tile) => {
        const response = await requestSender.getTiles({ tile: 'RIT', sub_tile, limit: 5, disable_fuzziness: false });

        const message = sub_tile ? 'request/query/sub_tile must match pattern "^[1-9][0-9]*$"' : "Empty value found for query parameter 'sub_tile'";

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toEqual({
          message,
        });
      }
    );

    test.each<Pick<GetTilesQueryParams, 'geo_context' | 'geo_context_mode'>>([
      {
        geo_context: { x: 300850, y: 4642203, zone: 33, radius: 100 },
      },
      {
        geo_context: { lon: 12.598899687444742, lat: 41.90667824634701, radius: 10 },
      },
      {
        geo_context: { bbox: [12.554407132912445, 41.84962590648513, 12.652837919839953, 41.94545380230761] },
      },
      {
        geo_context_mode: GeoContextMode.BIAS,
      },
      {
        geo_context_mode: GeoContextMode.FILTER,
      },
    ])('should return 400 and message that geo_context and geo_context_mode must be both defined or both undefined', async function (requestParams) {
      const response = await requestSender.getTiles({ tile: 'RIT', limit: 5, disable_fuzziness: false, ...requestParams });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message: '/control/utils/geoContextQuery: geo_context and geo_context_mode must be both defined or both undefined',
      });
    });

    test.each<Pick<GetTilesQueryParams, 'disable_fuzziness'>>([
      {
        disable_fuzziness: '' as unknown as boolean,
      },
      {
        disable_fuzziness: 'True' as unknown as boolean,
      },
      {
        disable_fuzziness: 'False' as unknown as boolean,
      },
    ])('should return 400 status code and error message when disable_fuzziness value is invalid', async function (requestParams) {
      const response = await requestSender.getTiles({ tile: 'RIT', limit: 5, ...requestParams });

      const message =
        (requestParams.disable_fuzziness as unknown as string) === ''
          ? "Empty value found for query parameter 'disable_fuzziness'"
          : 'request/query/disable_fuzziness must be boolean';

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message,
      });
    });

    test.each<Pick<GetTilesQueryParams, 'limit'>>([
      {
        limit: '' as unknown as number,
      },
      {
        limit: 0,
      },
      {
        limit: 101,
      },
    ])('should return 400 status code and error message when limit value is invalid', async function (requestParams) {
      const response = await requestSender.getTiles({ tile: 'RIT', disable_fuzziness: false, ...requestParams });

      const message =
        (requestParams.limit as unknown as string) === ''
          ? "Empty value found for query parameter 'limit'"
          : requestParams.limit < 1
          ? 'request/query/limit must be >= 1'
          : 'request/query/limit must be <= 15';

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toEqual({
        message,
      });
    });

    test.each<(keyof GeoContext)[][]>([[['lat', 'lon', 'radius']], [['x', 'y', 'zone', 'radius']]])(
      'should return 400 for all invalid geo_context object for the keys %s',
      async function (keys) {
        function generateCombinations(keys: (keyof GeoContext)[]): GeoContext[] {
          const combinations: object[] = [];

          function backtrack(current: object, remainingKeys: string[]): void {
            if (remainingKeys.length === 0) {
              combinations.push(current);
              return;
            }

            const key = remainingKeys[0];
            const remaining = remainingKeys.slice(1);

            backtrack({ ...current, [key]: 1 }, remaining);
            backtrack(current, remaining);
          }

          backtrack({}, keys);

          return combinations;
        }

        const geoContexts = generateCombinations(keys);

        for (const geo_context of geoContexts) {
          if (Object.keys(geo_context).length === keys.length) {
            continue;
          }
          const response = await requestSender.getTiles({
            tile: 'RIT',
            limit: 5,
            disable_fuzziness: false,
            geo_context: JSON.stringify(geo_context) as unknown as GetTilesQueryParams['geo_context'],
            geo_context_mode: GeoContextMode.BIAS,
          });

          expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
          expect(response.body).toEqual({
            message:
              'geo_context validation: geo_context must contain one of the following: {"bbox": [number,number,number,number] | [number,number,number,number,number,number]}, {"lat": number, "lon": number, "radius": number}, or {"x": number, "y": number, "zone": number, "radius": number}',
          });
        }
      }
    );
  });
  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
