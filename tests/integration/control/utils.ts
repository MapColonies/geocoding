/* eslint-disable @typescript-eslint/naming-convention */
import { CommonRequestParameters } from '../../../src/common/interfaces';
import { ControlResponse } from '../../../src/control/interfaces';
import { GetItemsQueryParams } from '../../../src/control/item/controllers/itemController';
import { Item } from '../../../src/control/item/models/item';
import { GetRoutesQueryParams } from '../../../src/control/route/controllers/routeController';
import { Route } from '../../../src/control/route/models/route';
import { GetTilesQueryParams } from '../../../src/control/tile/controllers/tileController';
import { Tile } from '../../../src/control/tile/models/tile';

const expectedObjectWithScore = <T extends Tile | Item | Route>(obj: T, expect: jest.Expect): ControlResponse<T>['features'][number] => ({
  ...obj,
  score: expect.any(Number) as number,
});

const expectedGeocodingElasticResponseMetrics = <T extends Tile | Item | Route>(
  resultsCount: number,
  expect: jest.Expect
): NonNullable<ControlResponse<T>['geocoding']>['response'] => ({
  results_count: resultsCount,
  max_score: expect.any(Number) as number,
  match_latency_ms: expect.any(Number) as number,
});

export const expectedResponse = <T extends Tile | Item | Route, U extends GetTilesQueryParams | GetItemsQueryParams | GetRoutesQueryParams>(
  requestParams: U,
  arr: T[],
  expect: jest.Expect
): ControlResponse<T, Omit<U, keyof CommonRequestParameters>> => ({
  type: 'FeatureCollection',
  geocoding: {
    version: process.env.npm_package_version,
    query: requestParams,
    response: expectedGeocodingElasticResponseMetrics(arr.length, expect),
  },
  features: arr.map((item) => expectedObjectWithScore(item, expect)),
});
