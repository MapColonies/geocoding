/* eslint-disable @typescript-eslint/naming-convention */
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { DataSource } from 'typeorm';
import nock, { Body } from 'nock';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL } from '../../../src/latLon/DAL/latLonRepository';
import { cronLoadTileLatLonDataSymbol } from '../../../src/latLon/DAL/latLonDAL';
import { GetGeotextSearchParams, QueryResult } from '../../../src/location/interfaces';
import { GeoContextMode, IApplication } from '../../../src/common/interfaces';
import { LocationRequestSender } from './helpers/requestSender';
import {
  OSM_LA_PORT,
  GOOGLE_LA_PORT,
  LA_AIRPORT,
  NY_JFK_AIRPORT,
  NY_POLICE_AIRPORT,
  NY_HIERRARCHY,
  LA_HIERRARCHY,
  MockLocationQueryFeature,
  PARIS_WI_SCHOOL,
} from './mockObjects';
import { expectedResponse, hierarchiesWithAnyWieght } from './utils';

describe('/search/control/tiles', function () {
  let requestSender: LocationRequestSender;

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

    requestSender = new LocationRequestSender(app.app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and airports', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['airport'],
            prediction: ['essence'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();

      expect(response.body).toMatchObject<QueryResult>(
        expectedResponse(
          {
            ...requestParams,
            place_types: ['transportation'],
            sub_place_types: ['airport'],
            hierarchies: [],
          },
          [NY_JFK_AIRPORT, NY_POLICE_AIRPORT, LA_AIRPORT],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    it('should return 200 status code and airports filtered by geo_context (bbox)', async function () {
      const requestParams: GetGeotextSearchParams = {
        query: 'airport',
        geo_context: { bbox: [-75.81665, 39.597223, -72.575684, 41.352072] },
        geo_context_mode: GeoContextMode.FILTER,
        limit: 5,
        disable_fuzziness: true,
      };
      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['airport'],
            prediction: ['essence'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();

      expect(response.body).toMatchObject<QueryResult>(
        expectedResponse(
          {
            ...requestParams,
            place_types: ['transportation'],
            sub_place_types: ['airport'],
            hierarchies: [],
          },
          [NY_JFK_AIRPORT, NY_POLICE_AIRPORT],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    it('should return 200 status code and airports biased by geo_context (bbox)', async function () {
      const requestParams: GetGeotextSearchParams = {
        query: 'airport',
        geo_context: { bbox: [-75.81665, 39.597223, -72.575684, 41.352072] },
        geo_context_mode: GeoContextMode.BIAS,
        limit: 5,
        disable_fuzziness: true,
      };
      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['airport'],
            prediction: ['essence'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();

      expect(response.body).toMatchObject<QueryResult>(
        expectedResponse(
          {
            ...requestParams,
            place_types: ['transportation'],
            sub_place_types: ['airport'],
            hierarchies: [],
          },
          [NY_JFK_AIRPORT, NY_POLICE_AIRPORT, LA_AIRPORT],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    test.each<
      Pick<GetGeotextSearchParams, 'query'> & {
        hierarchies: QueryResult['geocoding']['query']['hierarchies'];
        returnedFeatures: MockLocationQueryFeature[];
      }
    >([
      {
        query: 'new york',
        hierarchies: hierarchiesWithAnyWieght([NY_HIERRARCHY], expect),
        returnedFeatures: [NY_JFK_AIRPORT, NY_POLICE_AIRPORT, LA_AIRPORT],
      },
      {
        query: 'los angeles',
        hierarchies: hierarchiesWithAnyWieght([LA_HIERRARCHY], expect),
        returnedFeatures: [LA_AIRPORT, NY_JFK_AIRPORT, NY_POLICE_AIRPORT],
      },
    ])('it should test airports response with hierrarchy in %s', async ({ query, hierarchies, returnedFeatures }) => {
      const requestParams: GetGeotextSearchParams = { query: `airport, ${query}`, limit: 5, disable_fuzziness: true };

      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: ['airport'] })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['airport'],
            prediction: ['essence'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();

      expect(response.body).toMatchObject<QueryResult>(
        expectedResponse(
          {
            ...requestParams,
            place_types: ['transportation'],
            sub_place_types: ['airport'],
            hierarchies,
          },
          returnedFeatures,
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    test.each<
      Pick<GetGeotextSearchParams, 'query'> & {
        place_types: QueryResult['geocoding']['query']['place_types'];
        sub_place_types: QueryResult['geocoding']['query']['sub_place_types'];
        returnedFeatures: MockLocationQueryFeature[];
      }
    >([
      {
        query: 'new york',
        returnedFeatures: [NY_JFK_AIRPORT, NY_POLICE_AIRPORT, LA_AIRPORT, OSM_LA_PORT, GOOGLE_LA_PORT],
        place_types: ['transportation', 'transportation'],
        sub_place_types: ['airport', 'port'],
      },
      {
        query: 'los angeles',
        place_types: ['transportation'],
        sub_place_types: ['airport'],
        returnedFeatures: [LA_AIRPORT, OSM_LA_PORT, GOOGLE_LA_PORT, NY_JFK_AIRPORT, NY_POLICE_AIRPORT],
      },
    ])('it should test airports response with NLP Analyzer in %s', async ({ query, place_types, sub_place_types, returnedFeatures }) => {
      const requestParams: GetGeotextSearchParams = { query: `airport ${query}`, limit: 5, disable_fuzziness: false };

      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: requestParams.query.split(' '),
            prediction: ['essence', 'name', 'name'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();

      expect(response.body).toMatchObject<QueryResult>(
        expectedResponse(
          {
            ...requestParams,
            name: query,
            place_types,
            sub_place_types,
            hierarchies: [],
          },
          returnedFeatures,
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    it('should return 200 status code and all regions', async function () {
      const response = await requestSender.getRegions();

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toEqual(expect.arrayContaining(['USA']));
      // expect(response).toSatisfyApiSpec();
    });

    it('should return 200 status code and all sources', async function () {
      const response = await requestSender.getSources();

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toEqual(expect.arrayContaining(['OSM', 'GOOGLE']));
      // expect(response).toSatisfyApiSpec();
    });

    it('should return 200 status code and ports from the corresponding source', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'port', source: ['google'], limit: 5, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['port'],
            prediction: ['essence'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();

      expect(response.body).toMatchObject<QueryResult>(
        expectedResponse(
          {
            ...requestParams,
            place_types: ['transportation'],
            sub_place_types: ['port'],
            hierarchies: [],
          },
          [GOOGLE_LA_PORT],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    it('should return 200 status code and schools in specified region', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'school', region: ['france'], limit: 5, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['school'],
            prediction: ['essence'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();

      expect(response.body).toMatchObject<QueryResult>(
        expectedResponse(
          {
            ...requestParams,
            place_types: ['education'],
            sub_place_types: ['school'],
            hierarchies: [],
          },
          [PARIS_WI_SCHOOL],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });
  });

  describe('Bad Path', function () {
    // All requests with status code 4XX-5XX
    test.each<Pick<GetGeotextSearchParams, 'geo_context' | 'geo_context_mode'>>([
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
      const badRequestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: true, ...requestParams };
      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: badRequestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['airport'],
            prediction: ['essence'],
          },
        ]);

      const response = await requestSender.getQuery(badRequestParams);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toMatchObject({
        message: '/location/geotextQuery: geo_context and geo_context_mode must be both defined or both undefined',
      });
      tokenTypesUrlScope.done();
    });
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
    it('should return 500 status code when the NLP Analyzer service is down due to network error', async function () {
      const errorMessage = 'NLP Analyzer service is down';
      const requestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: true };

      // Intercept the request and simulate a network error
      const nockScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('')
        .once()
        .replyWithError({ message: errorMessage, code: 'ECONNREFUSED' });

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body).toHaveProperty('message', `NLP analyser is not available - ${errorMessage}`);
      // expect(response).toSatisfyApiSpec();

      nockScope.done();
    });

    test.each<{ code: number; body: Body | undefined }>([
      { code: httpStatusCodes.OK, body: [] },
      { code: httpStatusCodes.OK, body: undefined },
      { code: httpStatusCodes.NO_CONTENT, body: { message: 'bad request' } },
    ])('should return 500 status code when the NLP Analyzer service not responding as expected', async function ({ code, body }) {
      const requestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: false };

      const nockScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .once()
        .reply(code, body);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.INTERNAL_SERVER_ERROR);

      expect(response.body).toHaveProperty('message', expect.stringContaining('NLP analyser unexpected response:'));

      // expect(response).toSatisfyApiSpec();

      nockScope.done();
    });

    it('should return 400 status code when NLP Analyzer returns no tokens or prediction', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: false };

      const nockScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .once()
        .reply(httpStatusCodes.OK, [{ tokens: [], prediction: [] }]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
      expect(response.body).toHaveProperty('message', 'No tokens or prediction');
      // expect(response).toSatisfyApiSpec();

      nockScope.done();
    });
  });
});
