/* eslint-disable @typescript-eslint/naming-convention */
import { DependencyContainer } from 'tsyringe';
import type { Feature } from 'geojson';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import httpStatusCodes from 'http-status-codes';
import nock, { Body } from 'nock';
import { IConfig } from 'config';
import { RedisClient } from '@src/common/redis';
import { getApp } from '../../../src/app';
import { ConfigType, getConfig } from '../../../src/common/config';
import { redisConfigPath, SERVICES } from '../../../src/common/constants';
import { GetGeotextSearchParams } from '../../../src/location/interfaces';
import { NLP_UNAVAILABLE_LATENCY } from '../../../src/location/DAL/locationRepository';
import { GenericGeocodingResponse, GeoContext, GeoContextMode } from '../../../src/common/interfaces';
import {
  LA_AIRPORT,
  GOOGLE_LA_PORT,
  NY_JFK_AIRPORT,
  NY_POLICE_AIRPORT,
  NY_HIERRARCHY,
  LA_HIERRARCHY,
  MockLocationQueryFeature,
  PARIS_WI_SCHOOL,
  NY_JFK_AIRPORT_DISPLAY_NAMES,
  CHIANG_MAI_CITY,
  CHIANG_MAI_HOTEL,
  LA_ROAD,
} from '../../mockObjects/locations';
import { LocationRequestSender } from './helpers/requestSender';
import { expectedResponse, expectedResponseUnordered, hierarchiesWithAnyWieght, resolvedPlace } from './utils';
import { getBaseRegisterOptions } from './helpers';

let config: ConfigType;

describe('/search/location', function () {
  let requestSender: LocationRequestSender;
  let depContainer: DependencyContainer;

  beforeAll(() => {
    config = getConfig();
  });

  beforeEach(async function () {
    const [app, container] = await getApp(getBaseRegisterOptions());

    depContainer = container;
    requestSender = new LocationRequestSender(app);
  });

  afterAll(async function () {
    const cleanupRegistry = depContainer.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await cleanupRegistry.trigger();
    // eslint-disable-next-line import-x/no-named-as-default-member
    nock.cleanAll();
    depContainer.reset();

    jest.clearAllTimers();
  });

  describe('Happy Path', function () {
    it('should return 200 status code and airports', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
        expectedResponseUnordered(
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
                  display: NY_JFK_AIRPORT_DISPLAY_NAMES[1],
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
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
        expectedResponseUnordered(
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
                  display: NY_JFK_AIRPORT_DISPLAY_NAMES[1],
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
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
        expectedResponseUnordered(
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
                  display: NY_JFK_AIRPORT_DISPLAY_NAMES[1],
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
        place: Record<string, unknown>;
        returnedFeatures: MockLocationQueryFeature[];
      }
    >([
      // Before the place became a real filter, both of these returned the *same* features -
      // a search for New York airports listed Los Angeles ones. That is what is fixed here.
      {
        query: 'new york',
        hierarchies: hierarchiesWithAnyWieght([NY_HIERRARCHY], expect),
        place: resolvedPlace('new york', 'filter', 0.917),
        returnedFeatures: [
          {
            ...NY_JFK_AIRPORT,
            properties: {
              ...NY_JFK_AIRPORT.properties,
              names: {
                ...NY_JFK_AIRPORT.properties.names,
                display: NY_JFK_AIRPORT_DISPLAY_NAMES[1],
              },
            },
          },
          NY_POLICE_AIRPORT,
        ],
      },
      {
        query: 'los angeles',
        hierarchies: hierarchiesWithAnyWieght([LA_HIERRARCHY], expect),
        place: resolvedPlace('los angeles', 'filter', 0.917),
        // The two LA ports are gone for a second reason: `port` is no longer accepted as a
        // placetype for the query "airport" - three edits apart, it was a fuzzy accident.
        returnedFeatures: [LA_AIRPORT],
      },
    ])('it should test airports response with hierrarchy in %s', async ({ query, hierarchies, place, returnedFeatures }) => {
      const requestParams: GetGeotextSearchParams = { query: `airport, ${query}`, limit: 5, disable_fuzziness: true };

      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
        expectedResponseUnordered(
          {
            ...requestParams,
          },
          {
            place_types: ['transportation'],
            sub_place_types: ['airport'],
            hierarchies,
            place,
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
        place: Record<string, unknown>;
        hierarchies: GenericGeocodingResponse<Feature>['geocoding']['response']['hierarchies'];
        returnedFeatures: MockLocationQueryFeature[];
      }
    >([
      {
        query: 'new york',
        // The place is resolved without a comma now, so the Los Angeles features are excluded.
        returnedFeatures: [NY_JFK_AIRPORT, NY_POLICE_AIRPORT],
        place_types: ['transportation'],
        sub_place_types: ['airport'],
        place: resolvedPlace('new york', 'filter', 0.867),
        hierarchies: hierarchiesWithAnyWieght([NY_HIERRARCHY], expect),
      },
      {
        query: 'los angeles',
        place_types: ['transportation'],
        sub_place_types: ['airport'],
        place: resolvedPlace('los angeles', 'filter', 0.867),
        hierarchies: hierarchiesWithAnyWieght([LA_HIERRARCHY], expect),
        returnedFeatures: [LA_AIRPORT],
      },
    ])(
      'it should test airports response with NLP Analyzer in %s',
      async ({ query, place_types, sub_place_types, place, hierarchies, returnedFeatures }) => {
        const requestParams: GetGeotextSearchParams = { query: `airport ${query}`, limit: 5, disable_fuzziness: false };

        const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
          expectedResponseUnordered(
            requestParams,
            {
              name: query,
              place_types,
              sub_place_types,
              place,
              hierarchies,
            },
            returnedFeatures,
            expect
          )
        );

        tokenTypesUrlScope.done();
      }
    );

    it('should return 200 status code and chiang mai city before chiang mai hotel', async function () {
      const requestParams: GetGeotextSearchParams = {
        query: 'Chiang Mai',
        limit: 5,
        disable_fuzziness: true,
      };

      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
        expectedResponseUnordered(
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
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
        expectedResponseUnordered(
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
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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

    it('should return 200 and for query "los angeles" return LA Airport', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'los angeles', limit: 1, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
            name: 'los angeles',
            place_types: [],
            sub_place_types: [],
            place: resolvedPlace('los angeles', 'filter', 0.917),
            hierarchies: hierarchiesWithAnyWieght([LA_HIERRARCHY], expect),
          },
          [LA_AIRPORT],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    // The analyser is a RoBERTa token classifier, so it returns SentencePiece sub-word pieces,
    // not words. The piece lists below are the measured output of xlm-roberta-base.
    // Before sub-word aggregation this produced name: "\u2581los \u2581angel es".
    it('should rebuild a whole name from the sub-word pieces the analyser returns', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'los angeles', limit: 1, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['\u2581los', '\u2581angel', 'es'],
            prediction: ['name', 'name', 'name'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.name', 'los angeles');
      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          requestParams,
          {
            name: 'los angeles',
            place_types: [],
            sub_place_types: [],
            place: resolvedPlace('los angeles', 'filter', 0.917),
            hierarchies: hierarchiesWithAnyWieght([LA_HIERRARCHY], expect),
          },
          [LA_AIRPORT],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    it('should take only the contiguous run of name pieces, never a fragment', async function () {
      // 'airport los angeles' -> ['\u2581airport', '\u2581los', '\u2581angel', 'es'].
      // A label on the trailing piece alone used to yield name: "es".
      const requestParams: GetGeotextSearchParams = { query: 'airport los angeles', limit: 1, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['\u2581airport', '\u2581los', '\u2581angel', 'es'],
            prediction: ['essence', 'name', 'name', 'name'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.name', 'los angeles');

      tokenTypesUrlScope.done();
    });

    it('should drop the name hint when the analyser tokens do not reconstruct the query', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'los angeles', limit: 1, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            // a tokeniser that silently swallowed characters
            tokens: ['\u2581los', '\u2581ang'],
            prediction: ['name', 'name'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.name', '');

      tokenTypesUrlScope.done();
    });

    it('should drop the name hint when tokens and predictions are misaligned', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'los angeles', limit: 1, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['\u2581los', '\u2581angel', 'es'],
            prediction: ['name', 'name'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.name', '');

      tokenTypesUrlScope.done();
    });

    it('should fall back to the legacy hierarchy lookup when the text after the comma resolves to nothing', async function () {
      // Keeps the new behaviour a strict superset of the old comma handling.
      const requestParams: GetGeotextSearchParams = { query: 'airport, nowherecity', limit: 5, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: ['airport'] })
        .reply(httpStatusCodes.OK, [{ tokens: ['airport'], prediction: ['essence'] }]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).not.toHaveProperty('geocoding.response.place');
      // No spatial constraint was applied, so airports from every city come back
      expect((response.body as GenericGeocodingResponse<Feature>).features.length).toBeGreaterThan(1);

      tokenTypesUrlScope.done();
    });

    it('should boost rather than filter when only the fuzzy clause matched the gazetteer', async function () {
      // "los angelos" reaches "Los Angeles" through the fuzzy clause only, which caps exactness
      // at 0.5 and puts the confidence in the boost band.
      const requestParams: GetGeotextSearchParams = { query: 'los angelos', limit: 5, disable_fuzziness: false };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: ['los', 'angelos'] })
        .reply(httpStatusCodes.OK, [{ tokens: ['los', 'angelos'], prediction: ['name', 'name'] }]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.place.mode', 'boost');
      expect(response.body).toHaveProperty('geocoding.response.place.confidence', 0.617);

      tokenTypesUrlScope.done();
    });

    it('should keep a second, non overlapping place as a boost only hierarchy', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'new york los angeles', limit: 5, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: ['new', 'york', 'los', 'angeles'] })
        .reply(httpStatusCodes.OK, [{ tokens: ['new', 'york', 'los', 'angeles'], prediction: ['name', 'name', 'name', 'name'] }]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      // the later span wins and filters; the earlier one survives as a weight
      expect(response.body).toHaveProperty('geocoding.response.place.text', 'los angeles');
      const { hierarchies } = (response.body as GenericGeocodingResponse<Feature>).geocoding.response;
      expect((hierarchies as { text: string }[]).map((h) => h.text)).toEqual(['Los Angeles', 'New York']);

      tokenTypesUrlScope.done();
    });

    // Hebrew. The repository had no Hebrew characters at all before this, so the RTL path was
    // never exercised against real data.
    it('should resolve a Hebrew place name without a comma and filter by its polygon', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'תל אביב', limit: 5, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: ['תל', 'אביב'] })
        .reply(httpStatusCodes.OK, [{ tokens: ['\u2581תל', '\u2581אביב'], prediction: ['name', 'name'] }]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.name', 'תל אביב');
      expect(response.body).toHaveProperty('geocoding.response.place.text', 'תל אביב');
      expect(response.body).toHaveProperty('geocoding.response.place.mode', 'filter');
      expect(response.body).toHaveProperty('geocoding.response.place.confidence', 0.917);

      const names = (response.body as GenericGeocodingResponse<Feature>).features.map((f) => f.properties.names.default[0]);
      expect(names).toContain('נמל תל אביב');
      expect(names).not.toContain('בית ספר חיפה');

      tokenTypesUrlScope.done();
    });

    it('should exclude a feature outside the resolved Hebrew polygon', async function () {
      // Both schools match the residual text "בית ספר"; only the Tel Aviv one is inside the polygon.
      const requestParams: GetGeotextSearchParams = { query: 'בית ספר תל אביב', limit: 5, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: ['בית', 'ספר', 'תל', 'אביב'] })
        .reply(httpStatusCodes.OK, [
          { tokens: ['\u2581בית', '\u2581ספר', '\u2581תל', '\u2581אביב'], prediction: ['essence', 'essence', 'name', 'name'] },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.place.confidence', 0.842);

      const names = (response.body as GenericGeocodingResponse<Feature>).features.map((f) => f.properties.names.default[0]);
      expect(names).toContain('בית ספר תיכון תל אביב');
      expect(names).not.toContain('בית ספר חיפה');

      tokenTypesUrlScope.done();
    });

    it('should return 200 and for query "road los angeles" return LA Road', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'road los angeles', limit: 1, disable_fuzziness: true };
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .reply(httpStatusCodes.OK, [
          {
            tokens: requestParams.query.split(' '),
            prediction: ['essence', 'name', 'name'],
          },
        ]);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponseUnordered(
          requestParams,
          {
            name: 'los angeles',
            place_types: ['road'],
            sub_place_types: ['road'],
            place: resolvedPlace('los angeles', 'filter', 0.867),
            hierarchies: hierarchiesWithAnyWieght([LA_HIERRARCHY], expect),
          },
          [LA_ROAD],
          expect
        )
      );

      tokenTypesUrlScope.done();
    });

    describe('Redis uses prefix key', () => {
      it('should return 200 status code and add key to Redis with prefix', async function () {
        const realConfig = depContainer.resolve<IConfig>(SERVICES.CONFIG);
        const prefix = 'test-prefix-location';

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
        const localRequestSender = new LocationRequestSender(mockApp);

        const redisConnection = localContainer.resolve<RedisClient>(SERVICES.REDIS);

        const response = await localRequestSender.getRegions();

        const keys = await redisConnection.keys(prefix + '*');
        expect(keys.length).toBeGreaterThanOrEqual(1);
        expect(response.status).toBe(httpStatusCodes.OK);

        await localContainer.dispose();
      });
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
      const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
    // The NLP analyser supplies a ranking hint, not a requirement. Elasticsearch holds the data,
    // so an analyser outage must degrade the ranking, never fail the search. A latency of -1 is
    // the signal that the hint was unavailable.
    it('should still answer the search when the NLP Analyzer is down due to network error', async function () {
      const errorMessage = 'NLP Analyzer service is down';
      const requestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: true };

      // Intercept the request and simulate a network error
      const nockScope = nock(config.get('application').services.tokenTypesUrl)
        .post('')
        .once()
        .replyWithError({ message: errorMessage, code: 'ECONNREFUSED' });

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.nlp_anlyser_latency_ms', NLP_UNAVAILABLE_LATENCY);
      expect(response.body).toHaveProperty('geocoding.response.name', '');
      expect((response.body as GenericGeocodingResponse<Feature>).features.length).toBeGreaterThan(0);

      nockScope.done();
    });

    test.each<{ code: number; body: Body | undefined }>([
      { code: httpStatusCodes.OK, body: [] },
      { code: httpStatusCodes.OK, body: undefined },
      { code: httpStatusCodes.NO_CONTENT, body: { message: 'bad request' } },
    ])('should still answer the search when the NLP Analyzer responds unexpectedly', async function ({ code, body }) {
      const requestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: false };

      const nockScope = nock(config.get('application').services.tokenTypesUrl)
        .post('', { tokens: requestParams.query.split(' ') })
        .once()
        .reply(code, body);

      const response = await requestSender.getQuery(requestParams);

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.nlp_anlyser_latency_ms', NLP_UNAVAILABLE_LATENCY);
      expect(response.body).toHaveProperty('geocoding.response.name', '');
      expect((response.body as GenericGeocodingResponse<Feature>).features.length).toBeGreaterThan(0);

      nockScope.done();
    });

    it('should return 400 status code when NLP Analyzer returns no tokens or prediction', async function () {
      const requestParams: GetGeotextSearchParams = { query: 'airport', limit: 5, disable_fuzziness: false };

      const nockScope = nock(config.get('application').services.tokenTypesUrl)
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
          const tokenTypesUrlScope = nock(config.get('application').services.tokenTypesUrl)
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
