/* eslint-disable @typescript-eslint/naming-convention */
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import httpStatusCodes from 'http-status-codes';
import nock from 'nock';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { IApplication } from '../../../src/common/interfaces';
import { jfkAirport, losAngelesAirport, policeAirport } from './possibleObjects';
import { GeotextSearchRequestSender } from './helpers/requestSender';

describe('/query', function () {
  let requestSender: GeotextSearchRequestSender;

  beforeEach(async function () {
    const app = await getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new GeotextSearchRequestSender(app.app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the all available regions', async function () {
      const response = await requestSender.getRegions();

      expect(response.status).toBe(httpStatusCodes.OK);
      // expect(response).toSatisfyApiSpec();

      expect(response.body).toEqual(['USA']);
    });

    it('should return 200 status code and all airports', async function () {
      const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
        .post('', { tokens: ['airport'] })
        .reply(httpStatusCodes.OK, [
          {
            tokens: ['airport'],
            prediction: ['essence'],
          },
        ]);

      const response = await requestSender.getGeotextSearch({ query: 'airport', limit: 10 });

      expect(response.status).toBe(httpStatusCodes.OK);

      // expect(response).toSatisfyApiSpec();

      expect(response.body).toMatchObject({
        type: 'FeatureCollection',
        geocoding: {
          version: process.env.npm_package_version,
          query: {
            query: 'airport',
            limit: 10,
            name: '',
            placeTypes: ['transportation'],
            subPlaceTypes: ['airport'],
            hierarchies: [],
          },
          name: '',
        },
        features: [jfkAirport(1), policeAirport(2), losAngelesAirport(3)],
      });

      tokenTypesUrlScope.done();
    });
  });

  it('should return 200 and los angeles airport while checking the hierarchy system', async () => {
    const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
      .post('', { tokens: ['airport'] })
      .reply(httpStatusCodes.OK, [
        {
          tokens: ['airport'],
          prediction: ['essence'],
        },
      ]);

    const response = await requestSender.getGeotextSearch({ query: 'airport, los angeles', limit: 1 });

    expect(response.status).toBe(httpStatusCodes.OK);
    // expect(response).toSatisfyApiSpec();
    expect(response.body).toMatchObject({
      type: 'FeatureCollection',
      geocoding: {
        version: process.env.npm_package_version,
        query: {
          query: 'airport',
          limit: 1,
          name: '',
          placeTypes: ['transportation'],
          subPlaceTypes: ['airport'],
          hierarchies: [
            {
              geo_json: {
                coordinates: [
                  [
                    [-118.54430957638033, 34.07939240620722],
                    [-118.5350828996408, 33.695192367610986],
                    [-118.04596133238863, 33.47690745532634],
                    [-117.66265886139905, 33.379872950239346],
                    [-117.57145361502153, 33.63336904289318],
                    [-117.67279277766329, 34.23871934668085],
                    [-118.2605599209839, 34.28059749364003],
                    [-118.54430957638033, 34.07939240620722],
                  ],
                ],
                type: 'Polygon',
              },
              hierarchy: 'city',
              placetype: 'city',
              region: 'USA',
              text: 'Los Angeles',
              weight: 1.1,
            },
          ],
        },
        name: '',
      },
      features: [losAngelesAirport(1)],
    });

    tokenTypesUrlScope.done();
  });

  it('should retrun 200 and los angeles airport while checking the region from NLP analyser', async () => {
    const tokenTypesUrlScope = nock(config.get<IApplication>('application').services.tokenTypesUrl)
      .post('', { tokens: ['airport', 'los', 'angeles'] })
      .reply(httpStatusCodes.OK, [
        {
          tokens: ['airport', 'los', 'angeles'],
          prediction: ['essence', 'essence', 'name'],
        },
      ]);

    const response = await requestSender.getGeotextSearch({ query: 'airport los angeles', limit: 1 });

    expect(response.status).toBe(httpStatusCodes.OK);

    // expect(response).toSatisfyApiSpec();

    expect(response.body).toMatchObject({
      type: 'FeatureCollection',
      geocoding: {
        version: process.env.npm_package_version,
        query: {
          query: 'airport los angeles',
          limit: 1,
          name: 'angeles',
          placeTypes: ['transportation'],
          subPlaceTypes: ['airport'],
          hierarchies: [],
        },
        name: 'angeles',
      },
      features: [losAngelesAirport(1)],
    });

    tokenTypesUrlScope.done();
  });
  describe('Bad Path', function () {
    // All requests with status code of 400
  });
  describe('Sad Path', function () {
    // All requests with status code 4XX-5XX
  });
});
