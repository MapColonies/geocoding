/* eslint-disable @typescript-eslint/naming-convention */
import { QueryResult } from '../../../src/location/interfaces';
import { MockLocationQueryFeature } from './mockObjects';

const expectedObjectWithScore = (obj: MockLocationQueryFeature, expect: jest.Expect): QueryResult['features'][number] => ({
  ...obj,
  properties: {
    ...obj.properties,
    score: expect.any(Number) as number,
  },
});

const expectedGeocodingElasticResponseMetrics = (
  responseParams: Partial<QueryResult['geocoding']['response']>,
  resultsCount: number,
  expect: jest.Expect
): NonNullable<QueryResult['geocoding']>['response'] => ({
  results_count: resultsCount,
  max_score: expect.any(Number) as number,
  match_latency_ms: expect.any(Number) as number,
  ...responseParams,
});

export const expectedResponse = (
  requestParams: QueryResult['geocoding']['query'],
  responseParams: Partial<QueryResult['geocoding']['response']>,
  arr: MockLocationQueryFeature[],
  expect: jest.Expect
): QueryResult => ({
  type: 'FeatureCollection',
  geocoding: {
    version: process.env.npm_package_version,
    query: requestParams,
    response: expectedGeocodingElasticResponseMetrics(responseParams, arr.length, expect),
  },
  features: arr.map((item) => expectedObjectWithScore(item, expect)),
});

export const hierarchiesWithAnyWieght = (
  hierarchies: QueryResult['geocoding']['response']['hierarchies'],
  expect: jest.Expect
): QueryResult['geocoding']['response']['hierarchies'] => hierarchies?.map((hierarchy) => ({ ...hierarchy, weight: expect.any(Number) as number }));
