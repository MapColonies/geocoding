/* eslint-disable @typescript-eslint/naming-convention */
import config from 'config';
import { DependencyContainer } from 'tsyringe';
import { Application } from 'express';
import { Feature } from 'geojson';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import nock, { Body } from 'nock';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { S3_REPOSITORY_SYMBOL } from '../../../src/common/s3/s3Repository';
import { cronLoadTileLatLonDataSymbol } from '../../../src/latLon/DAL/latLonDAL';
import { GetGeotextSearchParams } from '../../../src/location/interfaces';
import { GenericGeocodingResponse, GeoContext, GeoContextMode, IApplication } from '../../../src/common/interfaces';
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
  NY_JFK_AIRPORT_DISPLAY_NAMES,
  CHIANG_MAI_CITY,
  CHIANG_MAI_HOTEL,
} from '../../mockObjects/locations';
import { LocationRequestSender } from './helpers/requestSender';
import { expectedResponse, hierarchiesWithAnyWieght } from './utils';

describe('/search/location', function () {
  let requestSender: LocationRequestSender;
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

    requestSender = new LocationRequestSender(app.app);
  });

  afterAll(async function () {
    const cleanupRegistry = app.container.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await cleanupRegistry.trigger();
    nock.cleanAll();
    app.container.reset();

    jest.clearAllTimers();
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

      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          {
            ...requestParams,
          },
          {
            place_types: ['transportation'],
            sub_place_types: ['airport'],
          },
          [
            {
              ...NY_JFK_AIRPORT,
              properties: {
                ...NY_JFK_AIRPORT.properties,
                names: {
                  ...NY_JFK_AIRPORT.properties.names,
                  display: NY_JFK_AIRPORT_DISPLAY_NAMES[0],
                },
              },
            },
            NY_POLICE_AIRPORT,
            LA_AIRPORT,
          ],
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

      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          requestParams,
          {
            place_types: ['transportation'],
            sub_place_types: ['airport'],
          },
          [
            {
              ...NY_JFK_AIRPORT,
              properties: {
                ...NY_JFK_AIRPORT.properties,
                names: {
                  ...NY_JFK_AIRPORT.properties.names,
                  display: NY_JFK_AIRPORT_DISPLAY_NAMES[0],
                },
              },
            },
            NY_POLICE_AIRPORT,
          ],
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

      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          {
            ...requestParams,
          },
          {
            place_types: ['transportation'],
            sub_place_types: ['airport'],
          },
          [
            {
              ...NY_JFK_AIRPORT,
              properties: {
                ...NY_JFK_AIRPORT.properties,
                names: {
                  ...NY_JFK_AIRPORT.properties.names,
                  display: NY_JFK_AIRPORT_DISPLAY_NAMES[0],
                },
              },
            },
            NY_POLICE_AIRPORT,
            LA_AIRPORT,
          ],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    test.each<
      Pick<GetGeotextSearchParams, 'query'> & {
        hierarchies: GenericGeocodingResponse<Feature>['geocoding']['response']['hierarchies'];
        returnedFeatures: MockLocationQueryFeature[];
      }
    >([
      {
        query: 'new york',
        hierarchies: hierarchiesWithAnyWieght([NY_HIERRARCHY], expect),
        returnedFeatures: [
          {
            ...NY_JFK_AIRPORT,
            properties: {
              ...NY_JFK_AIRPORT.properties,
              names: {
                ...NY_JFK_AIRPORT.properties.names,
                display: NY_JFK_AIRPORT_DISPLAY_NAMES[0],
              },
            },
          },
          NY_POLICE_AIRPORT,
          LA_AIRPORT,
        ],
      },
      {
        query: 'los angeles',
        hierarchies: hierarchiesWithAnyWieght([LA_HIERRARCHY], expect),
        returnedFeatures: [
          LA_AIRPORT,
          {
            ...NY_JFK_AIRPORT,
            properties: {
              ...NY_JFK_AIRPORT.properties,
              names: {
                ...NY_JFK_AIRPORT.properties.names,
                display: NY_JFK_AIRPORT_DISPLAY_NAMES[0],
              },
            },
          },
          NY_POLICE_AIRPORT,
        ],
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

      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          {
            ...requestParams,
          },
          {
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
        place_types: GenericGeocodingResponse<Feature>['geocoding']['response']['place_types'];
        sub_place_types: GenericGeocodingResponse<Feature>['geocoding']['response']['sub_place_types'];
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

      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          requestParams,
          {
            name: query,
            place_types,
            sub_place_types,
          },
          returnedFeatures,
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    it('should return 200 status code and chiang mai city before chiang mai hotel', async function () {
      const requestParams: GetGeotextSearchParams = {
        query: 'Chiang Mai',
        limit: 5,
        disable_fuzziness: true,
      };

      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: requestParams.query.split(' '),
            prediction: ['name', 'name'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          requestParams,
          {
            name: 'Chiang Mai',
            place_types: [],
            sub_place_types: [],
          },
          [CHIANG_MAI_CITY, CHIANG_MAI_HOTEL],
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
      expect(response.body).toEqual(expect.arrayContaining(['osm', 'google']));
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

      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          requestParams,
          {
            place_types: ['transportation'],
            sub_place_types: ['port'],
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

      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          requestParams,
          {
            place_types: ['education'],
            sub_place_types: ['school'],
          },
          [PARIS_WI_SCHOOL],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    it('should return 200 status code and no results', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'shfdsfdsfddfsd', limit: 5, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: [requestParams.query],
            prediction: ['essence'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect((response.body as GenericGeocodingResponse<Feature>).features).toHaveLength(0);
      expect((response.body as GenericGeocodingResponse<Feature>).bbox).toBeNull();

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
      expect(response.body).toEqual({
        message: '/location/geotextQuery: geo_context and geo_context_mode must be both defined or both undefined',
      });
      tokenTypesUrlScope.done();
    });

    it('should return 400 and message that source is not available', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'airport', source: ['notAvailable'], limit: 5, disable_fuzziness: true };

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
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
          const query = 'airport';
          const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
            .post('', { tokens: query.split(' ') })
            .reply(httpStatusCodes.OK, [
              {
                tokens: ['port'],
                prediction: ['essence'],
              },
            ]);

          const response = await requestSender.getQuery({
            query,
            limit: 5,
            disable_fuzziness: false,
            geo_context: JSON.stringify(geo_context) as unknown as GetGeotextSearchParams['geo_context'],
            geo_context_mode: GeoContextMode.BIAS,
          });

          expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
          expect(response.body).toEqual({
            message:
              'geo_context validation: geo_context must contain one of the following: {"bbox": [number,number,number,number] | [number,number,number,number,number,number]}, {"lat": number, "lon": number, "radius": number}, or {"x": number, "y": number, "zone": number, "radius": number}',
          });

          tokenTypesUrlScope.done();
        }
      }
    );
  });
});
