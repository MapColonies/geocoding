/* eslint-disable @typescript-eslint/naming-convention */
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import { DataSource } from 'typeorm';
import nock from 'nock';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { LATLON_CUSTOM_REPOSITORY_SYMBOL } from '../../../src/latLon/DAL/latLonRepository';
import { cronLoadTileLatLonDataSymbol } from '../../../src/latLon/DAL/latLonDAL';
import { GetGeotextSearchParams, QueryResult } from '../../../src/location/interfaces';
import { LocationRequestSender } from './helpers/requestSender';
import {
  OSM_LA_PORT,
  GOOGLE_LA_PORT,
  LA_AIRPORT,
  LA_WHITE_POINT_SCHOOL,
  NY_JFK_AIRPORT,
  NY_POLICE_AIRPORT,
  NY_HIERRARCHY,
  LA_HIERRARCHY,
} from './mockObjects';
import { expectedResponse, hierarchiesWithAnyWieght } from './utils';
import { IApplication } from '../../../src/common/interfaces';

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
      ],
      useChild: true,
    });

    requestSender = new LocationRequestSender(app.app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and airports', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: false };

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
    });

    test.each<
      Pick<GetGeotextSearchParams, 'query'> & {
        hierarchies: QueryResult['geocoding']['query']['hierarchies'];
        returnedFeatures: QueryResult['features'];
      }
    >([
      {
        query: 'new york',
        hierarchies: hierarchiesWithAnyWieght([NY_HIERRARCHY], expect),
        returnedFeatures: [NY_JFK_AIRPORT, NY_POLICE_AIRPORT, LA_AIRPORT],
      },
      {
        query: 'los angeles',
        hierarchies: hierarchiesWithAnyWieght([NY_HIERRARCHY], expect),
        returnedFeatures: [LA_AIRPORT, NY_JFK_AIRPORT, NY_POLICE_AIRPORT],
      },
    ])('it should test airports response with hierrarchy in %s', async ({ query, hierarchies, returnedFeatures }) => {
      const requestParams: GetGeotextSearchParams = { query: `airport, ${query}`, limit: 5, disable_fuzziness: false };

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
    });

    test.each<
      Pick<GetGeotextSearchParams, 'query'> & {
        place_types: QueryResult['geocoding']['query']['place_types'];
        sub_place_types: QueryResult['geocoding']['query']['sub_place_types'];
        returnedFeatures: QueryResult['features'];
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
  });
  describe('Bad Path', function () {
    // All requests with status code 4XX-5XX
  });

  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
