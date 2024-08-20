/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { DataSource } from 'typeorm';
import { getApp } from '../../../../src/app';
import { SERVICES } from '../../../../src/common/constants';
import { GetTilesQueryParams } from '../../../../src/control/tile/controllers/tileController';
import { Tile } from '../../../../src/control/tile/models/tile';
import { ControlResponse } from '../../../../src/control/interfaces';
import { CommonRequestParameters, GeoContextMode } from '../../../../src/common/interfaces';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL } from '../../../../src/latLon/DAL/latLonRepository';
import { cronLoadTileLatLonDataSymbol } from '../../../../src/latLon/DAL/latLonDAL';
import { TileRequestSender } from './helpers/requestSender';
import { RIC_TILE, RIT_TILE, SUB_TILE_65, SUB_TILE_66, expectedResponse } from './utils';

describe('/tiles', function () {
  let requestSender: TileRequestSender;

  beforeEach(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
        { token: LATLON_CUSTOM_REPOSITORY_SYMBOL, provider: { useValue: {} } },
        { token: DataSource, provider: { useValue: {} } },
        { token: cronLoadTileLatLonDataSymbol, provider: { useValue: {} } },
      ],
      useChild: true,
    });

    requestSender = new TileRequestSender(app.app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and tiles', async function () {
      const requestParams: GetTilesQueryParams = { tile: 'RIT', limit: 5, disable_fuzziness: false };

      const response = await requestSender.getTiles(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [SUB_TILE_66, SUB_TILE_65], expect)
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
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
      expect(response.body).toMatchObject<ControlResponse<Tile, Omit<GetTilesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [SUB_TILE_66], expect)
      );
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
  });
  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
