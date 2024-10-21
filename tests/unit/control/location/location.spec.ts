/* eslint-disable @typescript-eslint/naming-convention */
import config from 'config';
import jsLogger from '@map-colonies/js-logger';
import { Feature } from 'geojson';
import { estypes } from '@elastic/elasticsearch';
import { GeotextRepository } from '../../../../src/location/DAL/locationRepository';
import { GeotextSearchManager } from '../../../../src/location/models/locationManager';
import { GenericGeocodingResponse, IApplication } from '../../../../src/common/interfaces';
import { ConvertSnakeToCamelCase } from '../../../../src/common/utils';
import { GetGeotextSearchParams } from '../../../../src/location/interfaces';
import { NY_JFK_AIRPORT } from '../../../mockObjects/locations';
import { convertCamelToSnakeCase } from '../../../../src/control/utils';
import { expectedResponse } from '../../../integration/location/utils';

let geotextSearchManager: GeotextSearchManager;
describe('#GeotextSearchManager', () => {
  const extractName = jest.fn();
  const generatePlacetype = jest.fn();
  const extractHierarchy = jest.fn();
  const geotextSearch = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();

    const repositry = {
      extractName,
      generatePlacetype,
      extractHierarchy,
      geotextSearch,
    } as unknown as GeotextRepository;

    geotextSearchManager = new GeotextSearchManager(jsLogger({ enabled: false }), config.get<IApplication>('application'), config, repositry);
  });
  it('should return location response', async () => {
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
              placetype: NY_JFK_AIRPORT.properties.placetype as string,
              sub_placetype: NY_JFK_AIRPORT.properties.sub_placetype as string,
              geo_json: NY_JFK_AIRPORT.geometry,
              region: [(NY_JFK_AIRPORT.properties.regions as { region: string }[])[0].region],
              sub_region: (NY_JFK_AIRPORT.properties.regions as { sub_region_names: string[] }[])[0].sub_region_names,
              name: NY_JFK_AIRPORT.properties.names.default[0],
              text: [NY_JFK_AIRPORT.properties.names.display],
              translated_text: NY_JFK_AIRPORT.properties.names.fr,
            },
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
          ...(convertCamelToSnakeCase(query as unknown as Record<string, unknown>) as unknown as GetGeotextSearchParams),
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
  });

  it('should return sources', () => {
    const response = geotextSearchManager.sources();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(response).toEqual(Object.keys(config.get<IApplication>('application').sources!));
  });
  it('should return regions', () => {
    const response = geotextSearchManager.regions();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(response).toEqual(Object.keys(config.get<IApplication>('application').regions!));
  });

  it('should return empty sources array', () => {
    geotextSearchManager = new GeotextSearchManager(
      jsLogger({ enabled: false }),
      {} as unknown as IApplication,
      config,
      {} as unknown as GeotextRepository
    );

    const response = geotextSearchManager.sources();
    expect(response).toEqual(Object.keys({}));
  });

  it('should return empty regions array', () => {
    geotextSearchManager = new GeotextSearchManager(
      jsLogger({ enabled: false }),
      {} as unknown as IApplication,
      config,
      {} as unknown as GeotextRepository
    );

    const response = geotextSearchManager.regions();
    expect(response).toEqual(Object.keys({}));
  });
});
