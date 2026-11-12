/* eslint-disable @typescript-eslint/naming-convention */
import { DependencyContainer } from 'tsyringe';
import type { Feature } from 'geojson';
import type { Application } from 'express';
import { CleanupRegistry } from '@map-colonies/cleanup-registry';
import httpStatusCodes from 'http-status-codes';
import nock from 'nock';
import { getApp } from '../../../src/app';
import { ConfigType, getConfig } from '../../../src/common/config';
import { SERVICES } from '../../../src/common/constants';
import { GEOTEXT_REPOSITORY_SYMBOL } from '../../../src/location/DAL/locationRepository';
import { SMART_QUERY_REPOSITORY_SYMBOL } from '../../../src/smartQuery/DAL/smartQueryRepository';
import { GenericGeocodingResponse } from '../../../src/common/interfaces';
import { SmartQueryRequestSender } from './helpers/requestSender';
import { getBaseRegisterOptions } from './helpers';

type SmartResponse = GenericGeocodingResponse<Feature>;

const namesOf = (body: unknown): string[] => (body as SmartResponse).features.map((feature) => feature.properties.names.default[0]);
const sourcesOf = (body: unknown): string[] =>
  (body as SmartResponse).features.map((feature) => (feature.properties as unknown as { match_source: string }).match_source);

describe('/search/query', function () {
  let requestSender: SmartQueryRequestSender;
  let depContainer: DependencyContainer;
  let config: ConfigType;

  /** The analyser is only reached on the places path; a query that short-circuits needs no nock. */
  const nockNlp = (tokens: string[], prediction: string[]): nock.Scope =>
    nock(config.get('application').services.tokenTypesUrl).post('', { tokens }).reply(httpStatusCodes.OK, [{ tokens, prediction }]);

  beforeAll(() => {
    config = getConfig();
  });

  beforeEach(async function () {
    const [app, container] = await getApp(getBaseRegisterOptions());
    depContainer = container;
    requestSender = new SmartQueryRequestSender(app);
  });

  afterAll(async function () {
    const cleanupRegistry = depContainer.resolve<CleanupRegistry>(SERVICES.CLEANUP_REGISTRY);
    await cleanupRegistry.trigger();
    // eslint-disable-next-line import-x/no-named-as-default-member
    nock.cleanAll();
    depContainer.reset();
    jest.clearAllTimers();
  });

  describe('control only queries', function () {
    it('ranks a tile above places for a short letter token', async function () {
      // A 2-3 letter token is probably a tile but could still be a short place name, so both
      // backends are asked. The intent weights are what keep tiles on top, not a quota.
      const response = await requestSender.getQuery({ query: 'RIT', limit: 5, disable_fuzziness: true });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.sources_queried', ['control', 'places']);
      expect(namesOf(response.body)).toContain('RIT');
      expect(sourcesOf(response.body)[0]).toBe('control');
    });

    it('reads a tile and sub tile together', async function () {
      const response = await requestSender.getQuery({ query: 'RIT 66', limit: 5, disable_fuzziness: true });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(namesOf(response.body)[0]).toBe('66');
      expect(response.body).toHaveProperty('geocoding.response.intents.0.kind', 'SUB_TILE');
    });

    it('answers a numeric control item without ever asking for a place', async function () {
      // Digits cannot be a place name, so the places backend is not queried at all. No NLP nock
      // is registered either - this is the query that proves the short circuit.
      const response = await requestSender.getQuery({ query: '1234', limit: 5, disable_fuzziness: true });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(namesOf(response.body)).toContain('1234');
      expect(response.body).toHaveProperty('geocoding.response.sources_queried', ['control']);
    });

    it('converts an MGRS string to tiles', async function () {
      const response = await requestSender.getQuery({ query: '33TTG958462', limit: 5, disable_fuzziness: true });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.sources_queried', ['mgrs']);
      expect(response.body).toHaveProperty('geocoding.response.intents.0.kind', 'MGRS');
    });
  });

  describe('the ambiguous case', function () {
    it('returns both a control route and places for free text, exact match first', async function () {
      const scope = nockNlp(['olimpiade'], ['essence']);

      const response = await requestSender.getQuery({ query: 'olimpiade', limit: 10, disable_fuzziness: true });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.sources_queried', ['control', 'places']);
      // the control object's command name is exactly the query, so the gate lifts it to the top
      expect(sourcesOf(response.body)[0]).toBe('control');
      expect(namesOf(response.body)[0]).toBe('olimpiade');
      expect((response.body as SmartResponse).features[0].properties.exact_match).toBe(true);

      scope.done();
    });

    it('reports how it read the query at equal confidence for both readings', async function () {
      const scope = nockNlp(['olimpiade'], ['essence']);

      const response = await requestSender.getQuery({ query: 'olimpiade', limit: 10, disable_fuzziness: true });

      const intents = (response.body as SmartResponse).geocoding.response.intents as { kind: string; confidence: number }[];
      expect(intents.map((intent) => intent.kind).sort()).toEqual(['CONTROL_NAME', 'PLACE']);
      expect(intents[0].confidence).toBe(intents[1].confidence);

      scope.done();
    });

    it('answers a places only query through the geotext backend', async function () {
      const scope = nockNlp(['airport'], ['essence']);

      const response = await requestSender.getQuery({ query: 'airport', limit: 10, disable_fuzziness: true });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(sourcesOf(response.body).every((source) => source === 'places')).toBe(true);

      scope.done();
    });
  });

  describe('parameters', function () {
    it.each([1, 5])('respects limit=%s', async function (limit) {
      const response = await requestSender.getQuery({ query: 'RIT', limit, disable_fuzziness: false });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect((response.body as SmartResponse).features.length).toBeLessThanOrEqual(limit);
      expect(response.body).toHaveProperty('geocoding.response.results_count', (response.body as SmartResponse).features.length);
    });

    it('echoes only the parameters the caller sent, never derived ones', async function () {
      const response = await requestSender.getQuery({ query: 'RIT', limit: 5, disable_fuzziness: true });

      const query = (response.body as SmartResponse).geocoding.query as Record<string, unknown>;
      expect(query).toEqual({ query: 'RIT', limit: 5, disable_fuzziness: true, geo_context: undefined, geo_context_mode: undefined });
      expect(query).not.toHaveProperty('tile');
      expect(query).not.toHaveProperty('place_types');
    });

    it('applies geo_context as a filter to every backend it asked', async function () {
      const unfiltered = await requestSender.getQuery({ query: 'RIT 66', limit: 5, disable_fuzziness: false });
      expect((unfiltered.body as SmartResponse).features.length).toBeGreaterThan(0);

      // a bounding box in the South Atlantic, far from every fixture
      const filtered = await requestSender.getQuery({
        query: 'RIT 66',
        limit: 5,
        disable_fuzziness: false,
        geo_context: { bbox: [-30, -30, -29, -29] },
        geo_context_mode: 'filter',
      } as never);

      expect(filtered.status).toBe(httpStatusCodes.OK);
      expect((filtered.body as SmartResponse).features).toHaveLength(0);
      expect(filtered.body).toHaveProperty('bbox', null);
    });

    it('rejects a query shorter than the spec allows', async function () {
      const response = await requestSender.getQuery({ query: 'ab', limit: 5, disable_fuzziness: true });

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });

    it('rejects a geo_context without a mode', async function () {
      const response = await requestSender.getQuery({
        query: 'RIT',
        limit: 5,
        disable_fuzziness: true,
        geo_context: { bbox: [10, 10, 11, 11] },
      } as never);

      expect(response.status).toBe(httpStatusCodes.BAD_REQUEST);
    });
  });

  describe('resilience', function () {
    it('still answers when the places backend is down', async function () {
      const [app, container]: [Application, DependencyContainer] = await getApp(
        getBaseRegisterOptions([
          {
            token: GEOTEXT_REPOSITORY_SYMBOL,
            provider: { useValue: { findPlaceCandidates: jest.fn().mockRejectedValue(new Error('geotext is down')) } },
          },
        ])
      );
      depContainer = container;

      const response = await new SmartQueryRequestSender(app).getQuery({ query: 'olimpiade', limit: 10, disable_fuzziness: true });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(sourcesOf(response.body).every((source) => source === 'control')).toBe(true);
      expect(response.body).toHaveProperty('geocoding.response.partial_failures.0.source', 'places');
    });

    it('still answers when the control backend is down', async function () {
      const scope = nockNlp(['olimpiade'], ['essence']);
      const [app, container]: [Application, DependencyContainer] = await getApp(
        getBaseRegisterOptions([
          {
            token: SMART_QUERY_REPOSITORY_SYMBOL,
            provider: { useValue: { searchControl: jest.fn().mockRejectedValue(new Error('control is down')) } },
          },
        ])
      );
      depContainer = container;

      const response = await new SmartQueryRequestSender(app).getQuery({ query: 'olimpiade', limit: 10, disable_fuzziness: true });

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.body).toHaveProperty('geocoding.response.partial_failures.0.source', 'control');

      scope.done();
    });
  });
});
