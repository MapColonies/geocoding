/* eslint-disable @typescript-eslint/naming-convention */
import { QueryResult } from '../../../src/location/interfaces';

const expectedObjectWithScore = (obj: Omit<QueryResult['features'][number], '_score'>, expect: jest.Expect): QueryResult['features'][number] => ({
  ...obj,
  _score: expect.any(Number) as number,
});

const expectedGeocodingElasticResponseMetrics = (resultsCount: number, expect: jest.Expect): NonNullable<QueryResult['geocoding']>['response'] => ({
  results_count: resultsCount,
  max_score: expect.any(Number) as number,
  match_latency_ms: expect.any(Number) as number,
});

export const expectedResponse = (
  requestParams: QueryResult['geocoding']['query'],
  arr: Omit<QueryResult['features'][number], '_score'>[],
  expect: jest.Expect
): QueryResult => ({
  type: 'FeatureCollection',
  geocoding: {
    version: process.env.npm_package_version,
    query: requestParams,
    response: expectedGeocodingElasticResponseMetrics(arr.length, expect),
  },
  features: arr.map((item) => expectedObjectWithScore(item, expect)),
});

export const hierarchiesWithAnyWieght = (
  hierarchies: QueryResult['geocoding']['query']['hierarchies'],
  expect: jest.Expect
): QueryResult['geocoding']['query']['hierarchies'] => hierarchies.map((hierarchy) => ({ ...hierarchy, weight: expect.any(Number) as number }));
