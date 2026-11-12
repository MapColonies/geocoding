/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import type { Feature } from 'geojson';
import { estypes } from '@elastic/elasticsearch';
import { ConfigType, getConfig } from '../../../src/common/config';
import { GeotextRepository, GEOTEXT_REPOSITORY_SYMBOL } from '../../../src/location/DAL/locationRepository';
import { GeotextSearchManager } from '../../../src/location/models/locationManager';
import { registerDependencies } from '../../../src/common/dependencyRegistration';
import { SERVICES } from '../../../src/common/constants';
import { GenericGeocodingResponse, IApplication } from '../../../src/common/interfaces';
import { ConvertSnakeToCamelCase } from '../../../src/common/utils';
import { GetGeotextSearchParams, TextSearchParams } from '../../../src/location/interfaces';
import { NY_JFK_AIRPORT } from '../../mockObjects/locations';
import { convertCamelToSnakeCase } from '../../../src/control/utils';
import { expectedResponse } from '../../integration/location/utils';
import { BadRequestError } from '../../../src/common/errors';

let geotextSearchManager: GeotextSearchManager;
let config: ConfigType;

describe('#GeotextSearchManager', () => {
  const extractName = jest.fn();
  const generatePlacetype = jest.fn();
  const extractHierarchy = jest.fn();
  const findPlaceCandidates = jest.fn();
  const geotextSearch = jest.fn();
  const repositry: GeotextRepository = {
    extractName,
    generatePlacetype,
    extractHierarchy,
    findPlaceCandidates,
    geotextSearch,
  };

  const buildManager = async (application: Partial<IApplication>): Promise<GeotextSearchManager> => {
    const container = await registerDependencies(
      [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.APPLICATION, provider: { useValue: application } },
        { token: SERVICES.CONFIG, provider: { useValue: config } },
        { token: GEOTEXT_REPOSITORY_SYMBOL, provider: { useValue: repositry } },
      ],
      [],
      true
    );

    return container.resolve(GeotextSearchManager);
  };

  beforeAll(() => {
    config = getConfig();
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    // No gazetteer hit by default: most cases here are about response shaping, not place resolution.
    findPlaceCandidates.mockResolvedValue({ candidates: [], matchLatencyMs: 0 });

    geotextSearchManager = await buildManager(config.get('application') as IApplication);
  });

  test.each<string[] | undefined>([['<em>JFK</em> <em>International</em> Airport', 'John F Kennedy <em>International</em> Airport'], undefined])(
    'should return location response and highlight %s',
    async (highlight) => {
      const extractNameResolve = { name: '', latency: 7 };
      const generatePlacetypeResolve = {
        placeTypes: ['transportation'],
        subPlaceTypes: ['airport'],
        matchLatencyMs: 6,
      };
      const extractHierarchyResolve = {
        hierarchies: [],
        matchLatencyMs: 1,
      };

      extractName.mockResolvedValueOnce(extractNameResolve);
      generatePlacetype.mockResolvedValueOnce(generatePlacetypeResolve);
      extractHierarchy.mockResolvedValueOnce(extractHierarchyResolve);
      geotextSearch.mockResolvedValueOnce(<estypes.SearchResponse>{
        took: 2,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          total: { value: 3, relation: 'eq' },
          max_score: 1.2880917,
          hits: [
            {
              _index: expect.any(String) as string,
              _id: expect.any(String) as string,
              _score: 1.2880917,
              _source: {
                source: NY_JFK_AIRPORT.properties.matches[0].source,
                layer_name: NY_JFK_AIRPORT.properties.matches[0].layer,
                source_id: NY_JFK_AIRPORT.properties.matches[0].source_id,
                placetype: NY_JFK_AIRPORT.properties.placetype,
                sub_placetype: NY_JFK_AIRPORT.properties.sub_placetype,
                geo_json: NY_JFK_AIRPORT.geometry,
                region: [(NY_JFK_AIRPORT.properties.regions as { region: string }[])[0].region],
                sub_region: (NY_JFK_AIRPORT.properties.regions as { sub_region_names: string[] }[])[0].sub_region_names,
                name: NY_JFK_AIRPORT.properties.names.default[0],
                text: NY_JFK_AIRPORT.properties.names.en,
                translated_text: NY_JFK_AIRPORT.properties.names.fr,
              },
              highlight: highlight ? { text: highlight } : undefined,
            },
          ],
        },
      });

      const query: ConvertSnakeToCamelCase<GetGeotextSearchParams> = {
        query: 'airport',
        disableFuzziness: false,
        limit: 1,
      };

      const response = await geotextSearchManager.search(query);

      expect(response).toEqual<GenericGeocodingResponse<Feature>>(
        expectedResponse(
          {
            ...convertCamelToSnakeCase(query),
            geo_context: undefined,
            geo_context_mode: undefined,
            region: undefined,
            source: undefined,
          },
          {
            place_types: ['transportation'],
            sub_place_types: ['airport'],
            hierarchies: undefined,
            name: '',
          },
          [
            {
              ...NY_JFK_AIRPORT,
              properties: {
                ...NY_JFK_AIRPORT.properties,
                names: {
                  ...NY_JFK_AIRPORT.properties.names,
                  display: expect.stringContaining('JFK') as string,
                },
              },
            },
          ],
          expect
        )
      );
    }
  );

  it('should return location with source without name convertion', async () => {
    const extractNameResolve = { name: '', latency: 7 };
    const generatePlacetypeResolve = {
      placeTypes: ['transportation'],
      subPlaceTypes: ['airport'],
      matchLatencyMs: 6,
    };
    const extractHierarchyResolve = {
      hierarchies: [],
      matchLatencyMs: 1,
    };

    extractName.mockResolvedValueOnce(extractNameResolve);
    generatePlacetype.mockResolvedValueOnce(generatePlacetypeResolve);
    extractHierarchy.mockResolvedValueOnce(extractHierarchyResolve);
    geotextSearch.mockResolvedValueOnce(<estypes.SearchResponse>{
      took: 2,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        total: { value: 3, relation: 'eq' },
        max_score: 1.2880917,
        hits: [
          {
            _index: expect.any(String) as string,
            _id: expect.any(String) as string,
            _score: 1.2880917,
            _source: {
              source: null,
              layer_name: NY_JFK_AIRPORT.properties.matches[0].layer,
              source_id: NY_JFK_AIRPORT.properties.matches[0].source_id,
              placetype: NY_JFK_AIRPORT.properties.placetype,
              sub_placetype: NY_JFK_AIRPORT.properties.sub_placetype,
              geo_json: NY_JFK_AIRPORT.geometry,
              region: [(NY_JFK_AIRPORT.properties.regions as { region: string }[])[0].region],
              sub_region: (NY_JFK_AIRPORT.properties.regions as { sub_region_names: string[] }[])[0].sub_region_names,
              name: NY_JFK_AIRPORT.properties.names.default[0],
              text: NY_JFK_AIRPORT.properties.names.en,
              translated_text: NY_JFK_AIRPORT.properties.names.fr,
            },
            highlight: undefined,
          },
        ],
      },
    });

    const query: ConvertSnakeToCamelCase<GetGeotextSearchParams> = {
      query: 'airport',
      disableFuzziness: false,
      limit: 1,
    };

    const response = await geotextSearchManager.search(query);

    expect(response).toEqual<GenericGeocodingResponse<Feature>>(
      expectedResponse(
        {
          ...convertCamelToSnakeCase(query),
          geo_context: undefined,
          geo_context_mode: undefined,
          region: undefined,
          source: undefined,
        },
        {
          place_types: ['transportation'],
          sub_place_types: ['airport'],
          hierarchies: undefined,
          name: '',
        },
        [
          {
            ...NY_JFK_AIRPORT,
            properties: {
              ...NY_JFK_AIRPORT.properties,
              matches: [
                {
                  ...NY_JFK_AIRPORT.properties.matches[0],
                  source: null as never,
                },
              ],
              names: {
                ...NY_JFK_AIRPORT.properties.names,
                display: expect.stringContaining('JFK') as string,
              },
            },
          },
        ],
        expect
      )
    );
  });

  it('should return sources', () => {
    const response = geotextSearchManager.sources();

    expect(response).toEqual(Object.keys((config.get('application') as IApplication).sources!));
  });

  it('should throw BadRequestError when params.source contains invalid source', async () => {
    const params: ConvertSnakeToCamelCase<GetGeotextSearchParams> = {
      query: 'airport',
      disableFuzziness: false,
      limit: 1,
      source: ['invalidSource'],
    };
    const response = geotextSearchManager.search(params);

    await expect(response).rejects.toThrow(BadRequestError);
  });

  it('should return regions', () => {
    const response = geotextSearchManager.regions();

    expect(response).toEqual(Object.keys((config.get('application') as IApplication).regions!));
  });

  it('should return empty sources array', async () => {
    geotextSearchManager = await buildManager({});

    const response = geotextSearchManager.sources();
    expect(response).toEqual(Object.keys({}));
  });

  it('should return empty regions array', async () => {
    geotextSearchManager = await buildManager({});

    const response = geotextSearchManager.regions();
    expect(response).toEqual(Object.keys({}));
  });

  describe('place resolution', () => {
    const TEL_AVIV = {
      text: 'תל אביב',
      region: 'ISRAEL',
      hierarchy: 'city',
      placetype: 'city',
      geo_json: {
        type: 'Polygon',
        coordinates: [
          [
            [34.74, 32.14],
            [34.84, 32.14],
            [34.84, 32.03],
            [34.74, 32.03],
            [34.74, 32.14],
          ],
        ],
      },
    };

    const emptyHits = { took: 1, hits: { total: { value: 0 }, max_score: null, hits: [] } };
    const oneHit = {
      took: 1,
      hits: {
        total: { value: 1 },
        max_score: 1,
        hits: [
          {
            _score: 1,
            _source: {
              source: NY_JFK_AIRPORT.properties.matches[0].source,
              layer_name: NY_JFK_AIRPORT.properties.matches[0].layer,
              source_id: NY_JFK_AIRPORT.properties.matches[0].source_id,
              placetype: NY_JFK_AIRPORT.properties.placetype,
              sub_placetype: NY_JFK_AIRPORT.properties.sub_placetype,
              geo_json: NY_JFK_AIRPORT.geometry,
              region: [(NY_JFK_AIRPORT.properties.regions as { region: string }[])[0].region],
              sub_region: (NY_JFK_AIRPORT.properties.regions as { sub_region_names: string[] }[])[0].sub_region_names,
              name: NY_JFK_AIRPORT.properties.names.default[0],
              text: NY_JFK_AIRPORT.properties.names.en,
              translated_text: NY_JFK_AIRPORT.properties.names.fr,
            },
          },
        ],
      },
    };

    /** The parameters the manager handed to `geotextSearch` on a given call. */
    const searchParamsOfCall = (index: number): TextSearchParams => (geotextSearch.mock.calls[index] as unknown[])[1] as TextSearchParams;

    /** A gazetteer hit that matched the phrase clause of the span `tokenStart:length`. */
    const candidate = (spanId: string) => ({ hit: TEL_AVIV, score: 2, matchedQueries: [`p:${spanId}`] });

    beforeEach(() => {
      extractName.mockResolvedValue({ name: '', latency: 1 });
      generatePlacetype.mockResolvedValue({ placeTypes: [], subPlaceTypes: [], matchLatencyMs: 1 });
      extractHierarchy.mockResolvedValue({ hierarchies: [], matchLatencyMs: 1 });
    });

    it('applies a confident place as a filter and removes it from the searched text', async () => {
      findPlaceCandidates.mockResolvedValue({ candidates: [candidate('2:2')], matchLatencyMs: 1 });
      geotextSearch.mockResolvedValue(oneHit);

      await geotextSearchManager.search({ query: 'בית ספר תל אביב', limit: 5, disableFuzziness: true });

      expect(searchParamsOfCall(0).place?.mode).toBe('filter');
      expect(searchParamsOfCall(0).searchText).toBe('בית ספר');
    });

    it('keeps the original text when the query is nothing but the place', async () => {
      // geo_shape intersects means the place's own feature survives its own polygon
      findPlaceCandidates.mockResolvedValue({ candidates: [candidate('0:2')], matchLatencyMs: 1 });
      geotextSearch.mockResolvedValue(oneHit);

      await geotextSearchManager.search({ query: 'תל אביב', limit: 5, disableFuzziness: true });

      expect(searchParamsOfCall(0).searchText).toBe('תל אביב');
    });

    it('retries exactly once as a boost when the filter returns nothing', async () => {
      findPlaceCandidates.mockResolvedValue({ candidates: [candidate('0:2')], matchLatencyMs: 1 });
      geotextSearch.mockResolvedValueOnce(emptyHits).mockResolvedValueOnce(oneHit);

      const response = await geotextSearchManager.search({ query: 'תל אביב', limit: 5, disableFuzziness: true });

      expect(geotextSearch).toHaveBeenCalledTimes(2);
      expect(searchParamsOfCall(0).place?.mode).toBe('filter');
      expect(searchParamsOfCall(1).place?.mode).toBe('boost');
      expect(response.geocoding.response.place).toMatchObject({ mode: 'filter', fallback_applied: true });
    });

    it('does not retry when the filter already returned results', async () => {
      findPlaceCandidates.mockResolvedValue({ candidates: [candidate('0:2')], matchLatencyMs: 1 });
      geotextSearch.mockResolvedValue(oneHit);

      await geotextSearchManager.search({ query: 'תל אביב', limit: 5, disableFuzziness: true });

      expect(geotextSearch).toHaveBeenCalledTimes(1);
    });

    it('falls back to the legacy hierarchy lookup when the text after the comma resolves to nothing', async () => {
      findPlaceCandidates.mockResolvedValue({ candidates: [], matchLatencyMs: 1 });
      geotextSearch.mockResolvedValue(oneHit);

      await geotextSearchManager.search({ query: 'בית ספר, נוףכפר', limit: 5, disableFuzziness: true });

      expect(extractHierarchy).toHaveBeenCalledWith(expect.any(String), 'נוףכפר', expect.any(Number), true);
      expect(searchParamsOfCall(0).place).toBeUndefined();
    });

    it('searches only the head when the caller used the comma convention', async () => {
      findPlaceCandidates.mockResolvedValue({ candidates: [candidate('0:2')], matchLatencyMs: 1 });
      geotextSearch.mockResolvedValue(oneHit);

      await geotextSearchManager.search({ query: 'בית ספר, תל אביב', limit: 5, disableFuzziness: true });

      expect(searchParamsOfCall(0).searchText).toBe('בית ספר');
    });

    it('reuses the speculative placetype lookup when no place was removed', async () => {
      findPlaceCandidates.mockResolvedValue({ candidates: [], matchLatencyMs: 1 });
      geotextSearch.mockResolvedValue(oneHit);

      await geotextSearchManager.search({ query: 'airport', limit: 5, disableFuzziness: true });

      expect(generatePlacetype).toHaveBeenCalledTimes(1);
    });
  });
});
