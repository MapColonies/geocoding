/* eslint-disable @typescript-eslint/naming-convention */
import type { BBox } from 'geojson';
import { CommonRequestParameters, GenericGeocodingResponse } from '../../../src/common/interfaces';
import { GetItemsQueryParams } from '../../../src/control/item/controllers/itemController';
import { Item } from '../../../src/control/item/models/item';
import { GetRoutesQueryParams } from '../../../src/control/route/controllers/routeController';
import { Route } from '../../../src/control/route/models/route';
import { GetTilesQueryParams } from '../../../src/control/tile/controllers/tileController';
import { Tile } from '../../../src/control/tile/models/tile';

const expectedObjectWithScore = <T extends Tile | Item | Route>(source: T, expect: jest.Expect): GenericGeocodingResponse<T>['features'][number] => ({
  ...source,
  properties: {
    ...source.properties,
    score: expect.any(Number) as number,
    matches: [
      {
        layer: expect.any(String) as string,
        source: expect.any(String) as string,
        source_id: [],
      },
    ],
    names: {
      default: [expect.any(String) as string],
      display: expect.any(String) as string,
    },
  },
});

const expectedGeocodingElasticResponseMetrics = <T extends Tile | Item | Route>(
  resultsCount: number,
  expect: jest.Expect
): NonNullable<GenericGeocodingResponse<T>['geocoding']>['response'] => ({
  results_count: resultsCount,
  max_score: expect.any(Number) as number,
  match_latency_ms: expect.any(Number) as number,
});

export const expectedResponse = <T extends Tile | Item | Route, U extends GetTilesQueryParams | GetItemsQueryParams | GetRoutesQueryParams>(
  requestParams: U,
  arr: T[],
  expect: jest.Expect
): GenericGeocodingResponse<T, Omit<U, keyof CommonRequestParameters>> => ({
  type: 'FeatureCollection',
  geocoding: {
    version: process.env.npm_package_version as string,
    query: requestParams,
    response: expectedGeocodingElasticResponseMetrics(arr.length, expect),
  },
  features: arr.map((item) => expectedObjectWithScore(item, expect)),
  bbox: expect.any(Array) as BBox,
});
