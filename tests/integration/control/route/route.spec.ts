/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { DataSource } from 'typeorm';
import { getApp } from '../../../../src/app';
import { SERVICES } from '../../../../src/common/constants';
import { GetRoutesQueryParams } from '../../../../src/control/route/controllers/routeController';
import { Route } from '../../../../src/control/route/models/route';
import { ControlResponse } from '../../../../src/control/interfaces';
import { CommonRequestParameters, GeoContext, GeoContextMode } from '../../../../src/common/interfaces';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL } from '../../../../src/latLon/DAL/latLonRepository';
import { cronLoadTileLatLonDataSymbol } from '../../../../src/latLon/DAL/latLonDAL';
import { expectedResponse } from '../utils';
import { RouteRequestSender } from './helpers/requestSender';
import { ROUTE_VIA_CAMILLUCCIA_A, ROUTE_VIA_CAMILLUCCIA_B, CONTROL_POINT_OLIMPIADE_111, CONTROL_POINT_OLIMPIADE_112 } from './mockObjects';

describe('/search/control/route', function () {
  let requestSender: RouteRequestSender;

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

    requestSender = new RouteRequestSender(app.app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and routes', async function () {
      const requestParams: GetRoutesQueryParams = { command_name: 'via camilluccia', limit: 5, disable_fuzziness: false };

      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ROUTE_VIA_CAMILLUCCIA_A, ROUTE_VIA_CAMILLUCCIA_B], expect)
      );
    });

    it('should return 200 status code and routes biased by geo_context (bbox)', async function () {
      const requestParams: GetRoutesQueryParams = {
        command_name: 'via camilluccia',
        geo_context: { bbox: [12.445945519411595, 41.92899524904075, 12.446385440853476, 41.9292587345808] },
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ROUTE_VIA_CAMILLUCCIA_B, ROUTE_VIA_CAMILLUCCIA_A], expect)
      );
    });

    it('should return 200 status code and routes filtered by geo_context (bbox)', async function () {
      const requestParams: GetRoutesQueryParams = {
        command_name: 'via camilluccia',
        geo_context: { bbox: [12.445945519411595, 41.92899524904075, 12.446385440853476, 41.9292587345808] },
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ROUTE_VIA_CAMILLUCCIA_B], expect)
      );
    });

    it('should return 200 status code and routes biased by geo_context (WGS84)', async function () {
      const geo_context = { lon: 12.446085277848027, lat: 41.928658505847835, radius: 10 };
      const requestParams: GetRoutesQueryParams = {
        command_name: 'via camilluccia',
        geo_context,
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetRoutesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ROUTE_VIA_CAMILLUCCIA_B, ROUTE_VIA_CAMILLUCCIA_A], expect)
      );
    });

    it('should return 200 status code and routes filtered by geo_context (WGS84)', async function () {
      const geo_context = { lon: 12.446085277848027, lat: 41.928658505847835, radius: 10 };
      const requestParams: GetRoutesQueryParams = {
        command_name: 'via camilluccia',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetRoutesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ROUTE_VIA_CAMILLUCCIA_B], expect)
      );
    });

    it('should return 200 status code and routes biased by geo_context (UTM)', async function () {
      const geo_context = { x: 288247, y: 4645010, zone: 33, radius: 10 };
      const requestParams: GetRoutesQueryParams = {
        command_name: 'via camilluccia',
        geo_context,
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetRoutesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ROUTE_VIA_CAMILLUCCIA_B, ROUTE_VIA_CAMILLUCCIA_A], expect)
      );
    });

    it('should return 200 status code and routes filtered by geo_context (UTM)', async function () {
      const geo_context = { x: 288247, y: 4645010, zone: 33, radius: 10 };
      const requestParams: GetRoutesQueryParams = {
        command_name: 'via camilluccia',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetRoutesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ROUTE_VIA_CAMILLUCCIA_B], expect)
      );
    });

    it('should return 200 status code and send via camillucciaB route as disable_fuzziness is true', async function () {
      const requestParams: GetRoutesQueryParams = {
        command_name: 'via camillucciaB',
        limit: 5,
        disable_fuzziness: true,
      };
      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [ROUTE_VIA_CAMILLUCCIA_B], expect)
      );
    });

    it('should return 200 status code and no route as disable_fuzziness is true', async function () {
      const requestParams: GetRoutesQueryParams = {
        command_name: 'via camilluccia',
        limit: 5,
        disable_fuzziness: true,
      };
      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [], expect)
      );
    });

    it('should return 200 status code and control points biased by geo_context (bbox)', async function () {
      const requestParams: GetRoutesQueryParams = {
        command_name: 'olimpiade',
        control_point: '11',
        geo_context: { bbox: [12.473743746822265, 41.93195262135879, 12.474626229200709, 41.93249150688004] },
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [CONTROL_POINT_OLIMPIADE_112, CONTROL_POINT_OLIMPIADE_111], expect)
      );
    });

    it('should return 200 status code and control points filtered by geo_context (bbox)', async function () {
      const requestParams: GetRoutesQueryParams = {
        command_name: 'olimpiade',
        control_point: '11',
        geo_context: { bbox: [12.473743746822265, 41.93195262135879, 12.474626229200709, 41.93249150688004] },
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [CONTROL_POINT_OLIMPIADE_112], expect)
      );
    });

    it('should return 200 status code and control points biased by geo_context (WGS84)', async function () {
      const geo_context = { lon: 12.474175672012962, lat: 41.932217551210556, radius: 10 };
      const requestParams: GetRoutesQueryParams = {
        command_name: 'olimpiade',
        control_point: '11',
        geo_context,
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetRoutesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [CONTROL_POINT_OLIMPIADE_112, CONTROL_POINT_OLIMPIADE_111], expect)
      );
    });

    it('should return 200 status code and control points filtered by geo_context (WGS84)', async function () {
      const geo_context = { lon: 12.474175672012962, lat: 41.932217551210556, radius: 10 };
      const requestParams: GetRoutesQueryParams = {
        command_name: 'olimpiade',
        control_point: '11',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetRoutesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [CONTROL_POINT_OLIMPIADE_112], expect)
      );
    });

    it('should return 200 status code and control points biased by geo_context (UTM)', async function () {
      const geo_context = { x: 290588, y: 4645336, zone: 33, radius: 10 };
      const requestParams: GetRoutesQueryParams = {
        command_name: 'olimpiade',
        control_point: '11',
        geo_context,
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetRoutesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [CONTROL_POINT_OLIMPIADE_112, CONTROL_POINT_OLIMPIADE_111], expect)
      );
    });

    it('should return 200 status code and control points filtered by geo_context (UTM)', async function () {
      const geo_context = { x: 290588, y: 4645336, zone: 33, radius: 10 };
      const requestParams: GetRoutesQueryParams = {
        command_name: 'olimpiade',
        control_point: '11',
        geo_context,
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes({
        ...requestParams,
        geo_context: JSON.stringify(geo_context) as unknown as GetRoutesQueryParams['geo_context'],
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [CONTROL_POINT_OLIMPIADE_112], expect)
      );
    });

    it('should return 200 status code and control points', async function () {
      const requestParams: GetRoutesQueryParams = {
        command_name: 'olimpiade',
        control_point: '111',
        limit: 5,
        disable_fuzziness: false,
      };
      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [CONTROL_POINT_OLIMPIADE_111, CONTROL_POINT_OLIMPIADE_112], expect)
      );
    });

    it('should return 200 status code and 111 control_point with disable_fuzziness true', async function () {
      const requestParams: GetRoutesQueryParams = {
        command_name: 'olimpiade',
        control_point: '111',
        limit: 5,
        disable_fuzziness: true,
      };
      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [CONTROL_POINT_OLIMPIADE_111], expect)
      );
    });

    it('should return 200 status code and return no control points as no control points with disable_fuzziness true', async function () {
      const requestParams: GetRoutesQueryParams = {
        command_name: 'camilluccia',
        control_point: '111',
        limit: 5,
        disable_fuzziness: true,
      };
      const response = await requestSender.getRoutes(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject<ControlResponse<Route, Omit<GetRoutesQueryParams, keyof CommonRequestParameters>>>(
        expectedResponse(requestParams, [], expect)
      );
    });
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
    it('should return 400 status code and error message when empty object is passed', async function () {
      const response = await requestSender.getRoutes({} as unknown as GetRoutesQueryParams);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: "request/query must have required property 'command_name'",
      });
    });

    it('should return 400 status code and error message when command_name is empty', async function () {
      const response = await requestSender.getRoutes({ command_name: '', limit: 5, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: "Empty value found for query parameter 'command_name'",
      });
    });

    test.each<string>(['invalid', '6a6', '06', '-11', '6 ', ' 6', ' ', ' 6 ', ''])(
      'should return 400 status code and error message when value: "%s" for control_point value is invalid',
      async (control_point) => {
        const response = await requestSender.getRoutes({ command_name: 'olimpiade', control_point, limit: 5, disable_fuzziness: false });

        const message = control_point
          ? 'request/query/control_point must match pattern "^[1-9][0-9]*$"'
          : "Empty value found for query parameter 'control_point'";

        expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
        expect(response.body).toMatchObject({
          message,
        });
      }
    );

    test.each<Pick<GetRoutesQueryParams, 'geo_context' | 'geo_context_mode'>>([
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
      const response = await requestSender.getRoutes({ command_name: '1234', limit: 5, disable_fuzziness: false, ...requestParams });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: '/control/utils/geoContextQuery: geo_context and geo_context_mode must be both defined or both undefined',
      });
    });

    test.each<Pick<GetRoutesQueryParams, 'geo_context' | 'geo_context_mode'>>([
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
      const response = await requestSender.getRoutes({ command_name: '1234', limit: 5, disable_fuzziness: false, ...requestParams });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: '/control/utils/geoContextQuery: geo_context and geo_context_mode must be both defined or both undefined',
      });
    });

    test.each<Pick<GetRoutesQueryParams, 'disable_fuzziness'>>([
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
      const response = await requestSender.getRoutes({ command_name: '1234', limit: 5, ...requestParams });

      const message =
        (requestParams.disable_fuzziness as unknown as string) === ''
          ? "Empty value found for query parameter 'disable_fuzziness'"
          : 'request/query/disable_fuzziness must be boolean';

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message,
      });
    });

    test.each<Pick<GetRoutesQueryParams, 'limit'>>([
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
      const response = await requestSender.getRoutes({ command_name: '1234', disable_fuzziness: false, ...requestParams });

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
          const response = await requestSender.getRoutes({
            command_name: '1234',
            limit: 5,
            disable_fuzziness: false,
            geo_context: JSON.stringify(geo_context) as unknown as GetRoutesQueryParams['geo_context'],
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
