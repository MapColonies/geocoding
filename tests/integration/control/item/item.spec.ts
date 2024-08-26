/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { DataSource } from 'typeorm';
import { getApp } from '../../../../src/app';
import { SERVICES } from '../../../../src/common/constants';
import { GetItemsQueryParams } from '../../../../src/control/item/controllers/itemController';
import { Item } from '../../../../src/control/item/models/item';
import { ControlResponse } from '../../../../src/control/interfaces';
import { CommonRequestParameters, GeoContext, GeoContextMode } from '../../../../src/common/interfaces';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL } from '../../../../src/latLon/DAL/latLonRepository';
import { cronLoadTileLatLonDataSymbol } from '../../../../src/latLon/DAL/latLonDAL';
import { expectedResponse } from '../utils';
import { ItemRequestSender } from './helpers/requestSender';
import { ITEM_1234, ITEM_1235, ITEM_1236 } from './mockObjects';

describe('/search/control/items', function () {
  let requestSender: ItemRequestSender;

  beforeEach(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
        { token: LATLON_CUSTOM_REPOSITORY_SYMBOL, provider: { useValue: {} } },
        { token: DataSource, provider: { useValue: {} } },
        { token: cronLoadTileLatLonDataSymbol, provider: { useValue: {} } },
        { token: LATLON_CUSTOM_REPOSITORY_SYMBOL, provider: { useValue: {} } },
      ],
      useChild: true,
    });

    requestSender = new ItemRequestSender(app.app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and items', async function () {
      const requestParams: GetItemsQueryParams = { command_name: '123', limit: 5, disable_fuzziness: false };

      const response = await requestSender.getItems(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1234, ITEM_1235, ITEM_1236], expect)
      );
    });

    it('should return 200 status code and items in tile RIT', async function () {
      const requestParams: GetItemsQueryParams = { command_name: '123', tile: 'RIT', limit: 5, disable_fuzziness: false };

      const response = await requestSender.getItems(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1234, ITEM_1235, ITEM_1236], expect)
      );
    });

    it('should return 200 status code and no items in tile RIC', async function () {
      const requestParams: GetItemsQueryParams = { command_name: '123', tile: 'RIC', limit: 5, disable_fuzziness: false };

      const response = await requestSender.getItems(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [], expect)
      );
    });

    it('should return 200 status code and tiles biased by geo_context (bbox)', async function () {
      const requestParams: GetItemsQueryParams = {
        command_name: '123',
        geo_context: { bbox: [12.507611205446722, 41.90406708449768, 12.517586703397825, 41.90966573813128] },
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getItems(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1236, ITEM_1234, ITEM_1235], expect)
      );
    });

    it('should return 200 status code and tiles filtered by geo_context (bbox)', async function () {
      const requestParams: GetItemsQueryParams = {
        command_name: '123',
        geo_context: { bbox: [12.507611205446722, 41.90406708449768, 12.517586703397825, 41.90966573813128] },
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getItems(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1236], expect)
      );
    });

    it('should return 200 status code and tiles biased by geo_context (WGS84)', async function () {
      const geo_context = { lon: 12.512345456194254, lat: 41.90673389969385, radius: 10 };

      const requestParams: GetItemsQueryParams = {
        command_name: '123',
        geo_context,
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getItems({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetItemsQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1236, ITEM_1234, ITEM_1235], expect)
      );
    });

    it('should return 200 status code and tiles filtered by geo_context (WGS84)', async function () {
      const geo_context = { lon: 12.512345456194254, lat: 41.90673389969385, radius: 10 };
      const requestParams: GetItemsQueryParams = {
        command_name: '123',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getItems({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetItemsQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1236], expect)
      );
    });

    it('should return 200 status code and tiles biased by geo_context (UTM)', async function () {
      const geo_context = { x: 293671, y: 4642414, zone: 33, radius: 10 };
      const requestParams: GetItemsQueryParams = {
        command_name: '123',
        geo_context,
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getItems({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetItemsQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1236, ITEM_1234, ITEM_1235], expect)
      );
    });

    it('should return 200 status code and tiles filtered by geo_context (UTM)', async function () {
      const geo_context = { x: 293671, y: 4642414, zone: 33, radius: 10 };
      const requestParams: GetItemsQueryParams = {
        command_name: '123',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getItems({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetItemsQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1236], expect)
      );
    });

    it('should return 200 status code and send 1234 item as disable_fuzziness is true', async function () {
      const requestParams: GetItemsQueryParams = {
        command_name: '1234',
        limit: 5,
        disable_fuzziness: true,
      };
      const response = await requestSender.getItems(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1234], expect)
      );
    });

    it('should return 200 status code and no item as disable_fuzziness is true', async function () {
      const requestParams: GetItemsQueryParams = {
        command_name: '123',
        limit: 5,
        disable_fuzziness: true,
      };
      const response = await requestSender.getItems(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [], expect)
      );
    });

    it('should return 200 status code and items in sub_tile', async function () {
      const requestParams: GetItemsQueryParams = {
        command_name: '123',
        sub_tile: '37',
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getItems(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Item, Omit<GetItemsQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ITEM_1234, ITEM_1235], expect)
      );
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    it("should return 400 status code and error message when item's command_name", async function () {
      const response = await requestSender.getItems({} as unknown as GetItemsQueryParams);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: "request/query must have required property 'command_name'",
      });
    });

    it('should return 400 status code and error message when command_name value is empty', async function () {
      const response = await requestSender.getItems({ command_name: '', limit: 5, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: "Empty value found for query parameter 'command_name'",
      });
    });

    it('should return 400 status code and error message when tile value is invalid', async function () {
      let response = await requestSender.getItems({ command_name: '1234', tile: 'invalid', limit: 5, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: 'request/query/tile must NOT have more than 3 characters',
      });

      response = await requestSender.getItems({ command_name: '1234', tile: 'i', limit: 5, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: 'request/query/tile must NOT have fewer than 3 characters',
      });
    });

    test.each<string>(['invalid', '6a6', '06', '-11', '6 ', ' 6', ' ', ' 6 ', ''])(
      'should return 400 status code and error message when sub_tile value is invalid',
      async (sub_tile) => {
        const response = await requestSender.getItems({ command_name: '1234', tile: 'RIT', sub_tile, limit: 5, disable_fuzziness: false });

        const message = sub_tile ? 'request/query/sub_tile must match pattern "^[1-9][0-9]*$"' : "Empty value found for query parameter 'sub_tile'";

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toMatchObject({
          message,
        });
      }
    );

    test.each<Pick<GetItemsQueryParams, 'geo_context' | 'geo_context_mode'>>([
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
      const response = await requestSender.getItems({ command_name: '1234', limit: 5, disable_fuzziness: false, ...requestParams });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: '/control/utils/geoContextQuery: geo_context and geo_context_mode must be both defined or both undefined',
      });
    });

    test.each<Pick<GetItemsQueryParams, 'geo_context' | 'geo_context_mode'>>([
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
      const response = await requestSender.getItems({ command_name: '1234', limit: 5, disable_fuzziness: false, ...requestParams });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: '/control/utils/geoContextQuery: geo_context and geo_context_mode must be both defined or both undefined',
      });
    });

    test.each<Pick<GetItemsQueryParams, 'disable_fuzziness'>>([
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
      const response = await requestSender.getItems({ command_name: '1234', limit: 5, ...requestParams });

      const message =
        (requestParams.disable_fuzziness as unknown as string) === ''
          ? "Empty value found for query parameter 'disable_fuzziness'"
          : 'request/query/disable_fuzziness must be boolean';

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message,
      });
    });

    test.each<Pick<GetItemsQueryParams, 'limit'>>([
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
      const response = await requestSender.getItems({ command_name: '1234', disable_fuzziness: false, ...requestParams });

      const message =
        (requestParams.limit as unknown as string) === ''
          ? "Empty value found for query parameter 'limit'"
          : requestParams.limit < 1
          ? 'request/query/limit must be >= 1'
          : 'request/query/limit must be <= 15';

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
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
          const response = await requestSender.getItems({
            command_name: '1234',
            limit: 5,
            disable_fuzziness: false,
            geo_context: JSON.stringify(geo_context) as unknown as GetItemsQueryParams['geo_context'],
            geo_context_mode: GeoContextMode.BIAS,
          });

          expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
          expect(response.body).toMatchObject({
            message: 'geo_context validation: geo_context must contain one of the following: {bbox}, {lat, lon, radius}, or {x, y, zone, radius}',
          });
        }
      }
    );
  });
  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
