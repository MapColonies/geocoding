/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { estypes } from '@elastic/elasticsearch';
import { BBox } from 'geojson';
import { ItemQueryParams } from '../../../../src/control/item/DAL/queries';
import { ItemRepository } from '../../../../src/control/item/DAL/itemRepository';
import { ItemManager } from '../../../../src/control/item/models/itemManager';
import { GenericGeocodingResponse, IApplication } from '../../../../src/common/interfaces';
import { Item } from '../../../../src/control/item/models/item';
import { convertCamelToSnakeCase } from '../../../../src/control/utils';
import { ITEM_1234 } from '../../../mockObjects/items';

let itemManager: ItemManager;

describe('#ItemManager', () => {
  const getItems = jest.fn();
  const controlObjectDisplayNamePrefixes = { ITEM: 'Item' };
  beforeEach(() => {
    jest.resetAllMocks();

    const repository = {
      getItems,
    } as unknown as ItemRepository;

    itemManager = new ItemManager(
      jsLogger({ enabled: false }),
      {} as never,
      {
        controlObjectDisplayNamePrefixes,
      } as unknown as IApplication,
      repository
    );
  });

  test.each<{
    feature: Item;
    queryParams: ItemQueryParams;
    expectedNames: {
      default: string[];
      display: string;
    };
    mockFunction: jest.Mock;
  }>([
    {
      feature: ITEM_1234,
      queryParams: {
        commandName: ITEM_1234.properties.OBJECT_COMMAND_NAME,
        limit: 5,
        disableFuzziness: false,
      },
      expectedNames: {
        default: [ITEM_1234.properties.OBJECT_COMMAND_NAME],
        display: `${controlObjectDisplayNamePrefixes.ITEM} ${ITEM_1234.properties.OBJECT_COMMAND_NAME}`,
      },
      mockFunction: getItems,
    },
  ])('should response with the right Geocoding GeoJSON', async ({ feature, queryParams, expectedNames, mockFunction }) => {
    const hit: estypes.SearchResponse<Item> = {
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
    };

    mockFunction.mockResolvedValue(hit);

    const generated = await itemManager.getItems(queryParams);

    expect(generated).toEqual<GenericGeocodingResponse<Item>>({
      type: 'FeatureCollection',
      geocoding: {
        version: process.env.npm_package_version as string,
        query: convertCamelToSnakeCase(queryParams as unknown as Record<string, unknown>),
        response: {
          results_count: 1,
          max_score: expect.any(Number) as number,
          match_latency_ms: expect.any(Number) as number,
        },
      },
      bbox: expect.any(Array) as BBox,
      features: [
        {
          type: 'Feature',
          properties: {
            ...feature.properties,
            matches: [
              {
                layer: feature.properties.LAYER_NAME,
                source: hit.hits.hits[0]._index,
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
