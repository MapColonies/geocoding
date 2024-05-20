/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/naming-convention */
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import nock from 'nock';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { QueryRequestSender } from './helpers/requestSender';

describe('/query', function () {
  let requestSender: QueryRequestSender;

  beforeEach(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new QueryRequestSender(app.app);
  }, 1020000);

  describe('Happy Path', function () {
    it('should return 200 status code and a response', async function () {
      const query = 'road ss223';

      const placeTypeEndpoint = config.get<string>('services.placeTypeUrl');
      const extractNameEndpoint = config.get<string>('services.tokenTypesUrl');
      const placeTypeScope = nock(placeTypeEndpoint)
        .filteringRequestBody(() => '*')
        .post('', '*')
        .reply(httpStatusCodes.OK, [{ placetype: 'roads-and-landmarks', confidence: 0.8 }]);

      const extractNameScope = nock(extractNameEndpoint)
        .filteringRequestBody(() => '*')
        .post('', '*')
        .reply(httpStatusCodes.OK, [{ tokens: ['ss223', 'road'], prediction: ['essence', 'name'] }]);

      const response = await requestSender.getLatlonToTile({
        query,
        limit: 10,
        viewbox: '9.687803687385893,41.73743156025994,14.05055873548689,44.361899834467614',
      });

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();
      expect(response.body).toMatchObject({
        type: 'FeatureCollection',
        geocoding: {
          query: 'road ss223',
          limit: 10,
          viewbox: {
            type: 'Polygon',
            coordinates: [
              [
                [9.687803687385893, 41.73743156025994],
                [9.687803687385893, 44.361899834467614],
                [14.05055873548689, 44.361899834467614],
                [14.05055873548689, 41.73743156025994],
                [9.687803687385893, 41.73743156025994],
              ],
            ],
          },
          name: 'road',
          placeType: {
            placetype: 'roads-and-landmarks',
            confidence: 0.8,
          },
        },
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [11.132174698047265, 42.79784500915852],
                [11.132207950899442, 42.82191000606011],
                [11.165897343847803, 42.85289908144955],
                [11.193519316958259, 42.86171629826666],
                [11.223695541997671, 42.88763619566484],
                [11.234044995927803, 42.887013268970605],
              ],
            },
            properties: {
              rank: 1,
              source: 'test',
              layer: 'test_roads',
              source_id: ['2154E3F9-DD19-4FDF-B7CC-81A497A1B49E'],
              name: {
                default: 'road italy ss223',
                primary: ['road italy ss223'],
              },
              highlight: {
                text: ['<em>road</em> italy <em>ss223</em>'],
              },
              placetype: 'roads-and-landmarks',
              sub_placetype: 'road type b',
              region: ['italy'],
              sub_region: [],
            },
          },
        ],
      });

      placeTypeScope.done();
      extractNameScope.done();
    });
  });
});
