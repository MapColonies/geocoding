/* eslint-disable @typescript-eslint/naming-convention */
import type { BBox, Feature } from 'geojson';
import { GetGeotextSearchByCoordinatesParams, GetGeotextSearchParams } from '../../../src/location/interfaces';
import { GenericGeocodingResponse } from '../../../src/common/interfaces';
import { MockLocationQueryFeature } from '../../mockObjects/locations';

const expectedObjectWithScore = (obj: MockLocationQueryFeature, expect: jest.Expect): GenericGeocodingResponse<Feature>['features'][number] =>
  ({
    ...obj,
    properties: {
      ...obj.properties,
      score: expect.any(Number) as number,
    },
  }) as GenericGeocodingResponse<Feature>['features'][number];

const expectedGeocodingElasticResponseMetrics = (
  responseParams: Partial<GenericGeocodingResponse<Feature>['geocoding']['response']>,
  resultsCount: number,
  queryLatencyStats: {
    match_latency_ms: number;
    nlp_anlyser_latency_ms?: number;
    place_type_latency_ms?: number;
    hierarchies_latency_ms?: number;
  },
  expect: jest.Expect
): NonNullable<GenericGeocodingResponse<Feature>['geocoding']>['response'] => ({
  results_count: resultsCount,
  max_score: expect.any(Number) as number,
  ...queryLatencyStats,
  ...responseParams,
});

export const expectedResponse = (
  requestParams: GetGeotextSearchParams | GetGeotextSearchByCoordinatesParams,
  responseParams: Partial<GenericGeocodingResponse<Feature>['geocoding']['response']>,
  arr: MockLocationQueryFeature[],
  expect: jest.Expect,
  disableExtraLatencyStats = false
): GenericGeocodingResponse<Feature> => ({
  type: 'FeatureCollection',
  geocoding: {
    version: process.env.npm_package_version as string,
    query: requestParams,
    response: expectedGeocodingElasticResponseMetrics(
      responseParams,
      arr.length,
      {
        match_latency_ms: expect.any(Number) as number,
        ...(disableExtraLatencyStats
          ? {}
          : {
              nlp_anlyser_latency_ms: expect.any(Number) as number,
              place_type_latency_ms: expect.any(Number) as number,
              hierarchies_latency_ms: expect.any(Number) as number,
            }),
      },
      expect
    ),
  },
  features: arr.map((item) => expectedObjectWithScore(item, expect)),
  bbox: expect.any(Array) as BBox,
});

export const hierarchiesWithAnyWieght = (
  hierarchies: GenericGeocodingResponse<Feature>['geocoding']['response']['hierarchies'],
  expect: jest.Expect
): GenericGeocodingResponse<Feature>['geocoding']['response']['hierarchies'] =>
  (hierarchies as { hierarchy: string }[] | undefined)?.map((hierarchy) => ({ ...hierarchy, weight: expect.any(Number) as number }));
