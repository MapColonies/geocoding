/* eslint-disable @typescript-eslint/naming-convention */
import config from 'config';
import { estypes } from '@elastic/elasticsearch';
import { IApplication } from '../../../src/common/interfaces';
import { ItemQueryParams } from '../../../src/control/item/DAL/queries';
import { Item } from '../../../src/control/item/models/item';
import { RouteQueryParams } from '../../../src/control/route/DAL/queries';
import { Route } from '../../../src/control/route/models/route';
import { TileQueryParams } from '../../../src/control/tile/DAL/queries';
import { Tile } from '../../../src/control/tile/models/tile';
import { additionalControlSearchProperties, convertCamelToSnakeCase, formatResponse } from '../../../src/control/utils';
import { ITEM_1234 } from '../../mockObjects/items';
import { CONTROL_POINT_OLIMPIADE_111, ROUTE_VIA_CAMILLUCCIA_A } from '../../mockObjects/routes';
import { RIC_TILE, SUB_TILE_66 } from '../../mockObjects/tiles';
import { elasticConfigPath } from '../../../src/common/constants';
import { ElasticDbClientsConfig } from '../../../src/common/elastic/interfaces';
import { CONTROL_FIELDS } from '../../../src/control/constants';

describe('#convertCamelToSnakeCase', () => {
  it('should convert camel case to snake case', () => {
    const camelCase = {
      camelCaseKey: 'value',
      anotherCamelCaseKey: 'anotherValue',
    };

    const snakeCase = {
      camel_case_key: 'value',
      another_camel_case_key: 'anotherValue',
    };

    expect(convertCamelToSnakeCase(camelCase)).toEqual(snakeCase);
  });
});

type ControlTypesQueryParams = TileQueryParams | ItemQueryParams | RouteQueryParams;
describe('#formatResponse', () => {
  test.each<{
    feature: Tile | Item | Route;
    partialQuery: Partial<ControlTypesQueryParams>;
    expectedNames: {
      default: string[];
      display: string;
    };
  }>([
    {
      feature: RIC_TILE,
      partialQuery: { tile: 'RIC' },
      expectedNames: {
        default: ['RIC'],
        display: 'Tile RIC',
      },
    },
    {
      feature: SUB_TILE_66,
      partialQuery: { tile: 'RIC', subTile: '66' },
      expectedNames: {
        default: ['66'],
        display: 'Tile RIT Sub Tile 66',
      },
    },
    {
      feature: ROUTE_VIA_CAMILLUCCIA_A,
      partialQuery: { commandName: 'via camillucciaA' },
      expectedNames: {
        default: ['via camillucciaA'],
        display: 'Route via camillucciaA',
      },
    },
    {
      feature: CONTROL_POINT_OLIMPIADE_111,
      partialQuery: { commandName: 'olimpiade', controlPoint: '111' },
      expectedNames: {
        default: ['111'],
        display: 'Route olimpiade Control Point 111',
      },
    },
    {
      feature: ITEM_1234,
      partialQuery: { commandName: '1234' },
      expectedNames: {
        default: ['1234'],
        display: 'Item 1234',
      },
    },
  ])('should format elastic response to geocoding response', ({ partialQuery, feature, expectedNames }) => {
    const displayNamePrefixes: IApplication['controlObjectDisplayNamePrefixes'] = {
      TILE: 'Tile',
      SUB_TILE: 'Sub Tile',
      ROUTE: 'Route',
      ITEM: 'Item',
      CONTROL_POINT: 'Control Point',
    };

    const query: ControlTypesQueryParams = { disableFuzziness: true, limit: 5, ...partialQuery };

    const generated = formatResponse(
      {
        took: 3,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 3.5145261,
          hits: [
            {
              _index: 'control_gil_v5',
              _id: expect.any(String) as string,
              _score: expect.any(Number) as number,
              _source: feature,
            },
          ],
        },
      },
      query,
      displayNamePrefixes
    );

    expect(generated).toEqual({
      type: 'FeatureCollection',
      geocoding: {
        version: process.env.npm_package_version as string,
        query: convertCamelToSnakeCase(query as unknown as Record<string, unknown>),
        response: {
          results_count: 1,
          max_score: expect.any(Number) as number,
          match_latency_ms: expect.any(Number) as number,
        },
      },
      features: [
        {
          type: 'Feature',
          properties: {
            ...feature.properties,
            matches: [
              {
                layer: feature.properties.LAYER_NAME,
                source: 'control_gil_v5',
                source_id: [],
              },
            ],
            names: expectedNames,
            score: expect.any(Number) as number,
          },
          geometry: feature.geometry,
        },
      ],
    });
  });
});

describe('#additionalControlSearchProperties', () => {
  it('should return additional control search properties', () => {
    const size = 5;
    const searchProperties = additionalControlSearchProperties(config, size);

    expect(searchProperties).toEqual<Pick<estypes.SearchRequest, 'size' | 'index' | '_source'>>({
      size,
      index: config.get<ElasticDbClientsConfig>(elasticConfigPath).control.properties.index as string,
      _source: CONTROL_FIELDS,
    });
  });
});
