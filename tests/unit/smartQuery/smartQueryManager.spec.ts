/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import type { Feature } from 'geojson';
import { ConfigType, getConfig } from '../../../src/common/config';
import { IApplication, GenericGeocodingResponse } from '../../../src/common/interfaces';
import { SmartQueryManager } from '../../../src/smartQuery/models/smartQueryManager';
import type { SmartQueryRepository } from '../../../src/smartQuery/DAL/smartQueryRepository';
import type { GeotextSearchManager } from '../../../src/location/models/locationManager';
import type { TileManager } from '../../../src/control/tile/models/tileManager';

describe('#SmartQueryManager', () => {
  let manager: SmartQueryManager;
  let config: ConfigType;

  const searchControl = jest.fn();
  const geotextSearch = jest.fn();
  const getTiles = jest.fn();

  /** One TILE hit, in the shape `formatResponse` expects from the control index. */
  const controlHits = (names: string[]) => ({
    took: 2,
    hits: {
      total: { value: names.length },
      max_score: 3,
      hits: names.map((name, index) => ({
        _index: 'control_index',
        _score: 3 - index,
        _source: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { TYPE: 'TILE', TILE_NAME: name, LAYER_NAME: 'CONTROL.TILES', regions: [] },
        },
      })),
    },
  });

  const placesResponse = (names: string[]): GenericGeocodingResponse<Feature> =>
    ({
      type: 'FeatureCollection',
      geocoding: { version: '1', query: {}, response: {} },
      features: names.map((name, index) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { score: 9 - index, matches: [{ layer: 'osm', source: 'OSM', source_id: [] }], names: { default: [name] }, regions: [] },
      })),
      bbox: null,
    }) as unknown as GenericGeocodingResponse<Feature>;

  const params = (query: string, limit = 5) => ({ query, limit, disable_fuzziness: true });

  beforeAll(() => {
    config = getConfig();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    manager = new SmartQueryManager(
      jsLogger({ enabled: false }),
      config.get('application') as IApplication,
      config,
      { searchControl } as unknown as SmartQueryRepository,
      { search: geotextSearch } as unknown as GeotextSearchManager,
      { getTiles } as unknown as TileManager
    );
  });

  it('asks only the control index for a tile and a sub tile', async () => {
    searchControl.mockResolvedValue(controlHits(['RIT']));

    const response = await manager.search(params('RIT 66'));

    expect(geotextSearch).not.toHaveBeenCalled();
    expect(response.geocoding.response.sources_queried).toEqual(['control']);
  });

  it('short circuits an MGRS query to the tile lookup', async () => {
    getTiles.mockResolvedValue({ type: 'FeatureCollection', features: [], bbox: null });

    const response = await manager.search(params('33TTG958462'));

    expect(getTiles).toHaveBeenCalledWith(expect.objectContaining({ mgrs: '33TTG958462' }));
    expect(searchControl).not.toHaveBeenCalled();
    expect(geotextSearch).not.toHaveBeenCalled();
    expect(response.geocoding.response.sources_queried).toEqual(['mgrs']);
  });

  it('asks both backends for free text', async () => {
    searchControl.mockResolvedValue(controlHits(['ABC']));
    geotextSearch.mockResolvedValue(placesResponse(['Somewhere']));

    const response = await manager.search(params('via camillucciaA'));

    expect(searchControl).toHaveBeenCalledTimes(1);
    expect(geotextSearch).toHaveBeenCalledTimes(1);
    expect(response.geocoding.response.sources_queried).toEqual(['control', 'places']);
    expect(response.features).toHaveLength(2);
  });

  it('over-fetches per source so the merge has something to choose from', async () => {
    searchControl.mockResolvedValue(controlHits([]));
    geotextSearch.mockResolvedValue(placesResponse([]));

    await manager.search(params('via camillucciaA', 5));

    expect(searchControl).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
    expect(geotextSearch).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it('caps the over-fetch', async () => {
    searchControl.mockResolvedValue(controlHits([]));
    geotextSearch.mockResolvedValue(placesResponse([]));

    await manager.search(params('via camillucciaA', 15));

    expect(searchControl).toHaveBeenCalledWith(expect.objectContaining({ limit: 30 }));
  });

  it('answers with what survived when one backend fails', async () => {
    // allSettled, not all: a sick geotext client must not take down a query the control index
    // can answer perfectly well
    searchControl.mockResolvedValue(controlHits(['ABC']));
    geotextSearch.mockRejectedValue(new Error('geotext is down'));

    const response = await manager.search(params('via camillucciaA'));

    expect(response.features).toHaveLength(1);
    expect(response.geocoding.response.partial_failures).toEqual([{ source: 'places', message: 'geotext is down' }]);
  });

  it('reports a control failure the same way', async () => {
    searchControl.mockRejectedValue(new Error('control is down'));
    geotextSearch.mockResolvedValue(placesResponse(['Somewhere']));

    const response = await manager.search(params('via camillucciaA'));

    expect(response.geocoding.response.partial_failures).toEqual([{ source: 'control', message: 'control is down' }]);
  });

  it('fails only when every backend it asked failed', async () => {
    searchControl.mockRejectedValue(new Error('control is down'));
    geotextSearch.mockRejectedValue(new Error('geotext is down'));

    await expect(manager.search(params('via camillucciaA'))).rejects.toThrow('control is down');
  });

  it('omits partial_failures when nothing failed', async () => {
    searchControl.mockResolvedValue(controlHits(['ABC']));
    geotextSearch.mockResolvedValue(placesResponse(['Somewhere']));

    const response = await manager.search(params('via camillucciaA'));

    expect(response.geocoding.response).not.toHaveProperty('partial_failures');
  });

  it('echoes the caller parameters and never a derived one', async () => {
    searchControl.mockResolvedValue(controlHits(['RIT']));

    const response = await manager.search(params('RIT 66'));

    expect(response.geocoding.query).toEqual({
      query: 'RIT 66',
      limit: 5,
      disable_fuzziness: true,
      geo_context: undefined,
      geo_context_mode: undefined,
    });
  });

  it('reports the raw per source maxima separately, never merged', async () => {
    searchControl.mockResolvedValue(controlHits(['ABC']));
    geotextSearch.mockResolvedValue(placesResponse(['Somewhere']));

    const { response } = (await manager.search(params('via camillucciaA'))).geocoding;

    expect(response.control_max_score).toBe(3);
    expect(response.places_max_score).toBe(9);
    expect(response.merge_strategy).toBe('rrf');
  });
});
