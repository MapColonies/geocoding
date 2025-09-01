/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { estypes } from '@elastic/elasticsearch';
import type { BBox } from 'geojson';
import { RouteQueryParams } from '../../../../src/control/route/DAL/queries';
import { RouteRepository } from '../../../../src/control/route/DAL/routeRepository';
import { RouteManager } from '../../../../src/control/route/models/routeManager';
import { GenericGeocodingResponse, IApplication } from '../../../../src/common/interfaces';
import { Route } from '../../../../src/control/route/models/route';
import { convertCamelToSnakeCase } from '../../../../src/control/utils';
import { CONTROL_POINT_OLIMPIADE_111, ROUTE_VIA_CAMILLUCCIA_A } from '../../../mockObjects/routes';

let routeManager: RouteManager;

describe('#RouteManager', () => {
  const getRoutes = jest.fn();
  const getControlPointInRoute = jest.fn();
  const controlObjectDisplayNamePrefixes = { ROUTE: 'Route', CONTROL_POINT: 'Control Point' };
  beforeEach(() => {
    jest.resetAllMocks();

    const repository = {
      getRoutes,
      getControlPointInRoute,
    } as unknown as RouteRepository;

    routeManager = new RouteManager(
      jsLogger({ enabled: false }),
      {} as never,
      {
        controlObjectDisplayNamePrefixes,
      } as unknown as IApplication,
      repository
    );
  });

  test.each<{
    feature: Route;
    queryParams: RouteQueryParams;
    expectedNames: {
      default: string[];
      display: string;
    };
    mockFunction: jest.Mock;
  }>([
    {
      feature: ROUTE_VIA_CAMILLUCCIA_A,
      queryParams: {
        commandName: ROUTE_VIA_CAMILLUCCIA_A.properties.OBJECT_COMMAND_NAME,
        limit: 5,
        disableFuzziness: false,
      },
      expectedNames: {
        default: [ROUTE_VIA_CAMILLUCCIA_A.properties.OBJECT_COMMAND_NAME],
        display: `${controlObjectDisplayNamePrefixes.ROUTE} ${ROUTE_VIA_CAMILLUCCIA_A.properties.OBJECT_COMMAND_NAME}`,
      },
      mockFunction: getRoutes,
    },
    {
      feature: CONTROL_POINT_OLIMPIADE_111,
      queryParams: {
        commandName: CONTROL_POINT_OLIMPIADE_111.properties.TIED_TO as string,
        controlPoint: CONTROL_POINT_OLIMPIADE_111.properties.OBJECT_COMMAND_NAME,
        limit: 5,
        disableFuzziness: false,
      },
      expectedNames: {
        default: [CONTROL_POINT_OLIMPIADE_111.properties.OBJECT_COMMAND_NAME],
        display: `${controlObjectDisplayNamePrefixes.ROUTE} ${CONTROL_POINT_OLIMPIADE_111.properties.TIED_TO as string} ${
          controlObjectDisplayNamePrefixes.CONTROL_POINT
        } ${CONTROL_POINT_OLIMPIADE_111.properties.OBJECT_COMMAND_NAME}`,
      },
      mockFunction: getControlPointInRoute,
    },
  ])('should response with the right Geocoding GeoJSON', async ({ feature, queryParams, expectedNames, mockFunction }) => {
    const hit: estypes.SearchResponse<Route> = {
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

    const generated = await routeManager.getRoutes(queryParams);

    expect(generated).toEqual<GenericGeocodingResponse<Route>>({
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
