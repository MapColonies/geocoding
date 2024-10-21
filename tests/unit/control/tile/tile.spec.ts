/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { estypes } from '@elastic/elasticsearch';
import { TileQueryParams } from '../../../../src/control/tile/DAL/queries';
import { TileRepository } from '../../../../src/control/tile/DAL/tileRepository';
import { TileManager } from '../../../../src/control/tile/models/tileManager';
import { GenericGeocodingResponse, IApplication } from '../../../../src/common/interfaces';
import { Tile } from '../../../../src/control/tile/models/tile';
import { RIC_TILE, SUB_TILE_66 } from '../../../mockObjects/tiles';
import { convertCamelToSnakeCase } from '../../../../src/control/utils';
import { BadRequestError } from '../../../../src/common/errors';

let tileManager: TileManager;

describe('#TileManager', () => {
  const getTiles = jest.fn();
  const getSubTiles = jest.fn();
  const getTilesByBbox = jest.fn();
  const controlObjectDisplayNamePrefixes = { TILE: 'Tile', SUB_TILE: 'Sub Tile' };
  beforeEach(() => {
    jest.resetAllMocks();

    const repository = {
      getTiles,
      getSubTiles,
      getTilesByBbox,
    } as unknown as TileRepository;

    tileManager = new TileManager(
      jsLogger({ enabled: false }),
      {} as never,
      {
        controlObjectDisplayNamePrefixes,
      } as unknown as IApplication,
      repository
    );
  });

  test.each<{
    feature: Tile;
    queryParams: TileQueryParams;
    expectedNames: {
      default: string[];
      display: string;
    };
    mockFunction: jest.Mock;
  }>([
    {
      feature: RIC_TILE,
      queryParams: {
        tile: RIC_TILE.properties.TILE_NAME,
        limit: 5,
        disableFuzziness: false,
      },
      expectedNames: {
        default: [RIC_TILE.properties.TILE_NAME as string],
        display: `${controlObjectDisplayNamePrefixes.TILE} ${RIC_TILE.properties.TILE_NAME as string}`,
      },
      mockFunction: getTiles,
    },
    {
      feature: SUB_TILE_66,
      queryParams: {
        tile: SUB_TILE_66.properties.TILE_NAME,
        subTile: SUB_TILE_66.properties.SUB_TILE_ID,
        limit: 5,
        disableFuzziness: false,
      },
      expectedNames: {
        default: [SUB_TILE_66.properties.SUB_TILE_ID as string],
        display: `${controlObjectDisplayNamePrefixes.TILE} ${SUB_TILE_66.properties.TILE_NAME as string} ${
          controlObjectDisplayNamePrefixes.SUB_TILE
        } ${SUB_TILE_66.properties.SUB_TILE_ID as string}`,
      },
      mockFunction: getSubTiles,
    },
    {
      feature: RIC_TILE,
      queryParams: {
        mgrs: '33TTG958462',
        limit: 5,
        disableFuzziness: false,
      },
      expectedNames: {
        default: [RIC_TILE.properties.TILE_NAME as string],
        display: `${controlObjectDisplayNamePrefixes.TILE} ${RIC_TILE.properties.TILE_NAME as string}`,
      },
      mockFunction: getTilesByBbox,
    },
  ])('should response with the right Geocoding GeoJSON', async ({ feature, queryParams, expectedNames, mockFunction }) => {
    const hit: estypes.SearchResponse<Tile> = {
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

    const generated = await tileManager.getTiles(queryParams);

    expect(generated).toEqual<GenericGeocodingResponse<Tile>>({
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
      features: [
        {
          type: 'Feature',
          properties: {
            ...feature.properties,
            matches: [
              {
                layer: feature.properties.LAYER_NAME as string,
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

  it('should throw BadRequestError if both tile and mgrs are provided', async () => {
    const queryParams = {
      tile: RIC_TILE.properties.TILE_NAME,
      mgrs: '33TTG958462',
      limit: 5,
      disableFuzziness: false,
    };

    await expect(tileManager.getTiles(queryParams)).rejects.toThrow(
      new BadRequestError("/control/tiles: only one of 'tile' or 'mgrs' query parameter must be defined")
    );
  });

  describe('Bad Path', () => {
    // All requests with status code of 400
    it('should throw BadRequestError if both tile and mgrs are provided', async () => {
      const queryParams = {
        tile: RIC_TILE.properties.TILE_NAME,
        mgrs: '33TTG958462',
        limit: 5,
        disableFuzziness: false,
      };

      await expect(tileManager.getTiles(queryParams)).rejects.toThrow(
        new BadRequestError("/control/tiles: only one of 'tile' or 'mgrs' query parameter must be defined")
      );
    });

    it('should throw BadRequestError if invalid MGRS tile is provided', async () => {
      const queryParams = {
        mgrs: 'ABC{}',
        limit: 5,
        disableFuzziness: false,
      };

      await expect(tileManager.getTiles(queryParams)).rejects.toThrow(new BadRequestError(`Invalid MGRS: ${queryParams.mgrs}`));
    });
  });
});
