/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { LatLonManager } from '../../../src/latLon/models/latLonManager';
import { LatLonDAL } from '../../../src/latLon/DAL/latLonDAL';
import { GenericGeocodingFeatureResponse, WGS84Coordinate } from '../../../src/common/interfaces';
import { convertCamelToSnakeCase } from '../../../src/control/utils';
import { BadRequestError } from '../../../src/common/errors';
import * as CommonUtils from '../../../src/common/utils';

type QueryParams = WGS84Coordinate & { targetGrid: 'control' | 'MGRS' };

let latLonManager: LatLonManager;
describe('#LatLonManager', () => {
  const latLonToTile = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    const repositry = { latLonToTile } as unknown as LatLonDAL;
    latLonManager = new LatLonManager(jsLogger({ enabled: false }), repositry, {} as never);
  });

  describe('happy path', () => {
    it('should return control tile', async () => {
      latLonToTile.mockResolvedValueOnce({
        tile_name: 'BRN',
        zone: '33',
        min_x: '360000',
        min_y: '5820000',
        ext_min_x: 360000,
        ext_min_y: 5820000,
        ext_max_x: 370000,
        ext_max_y: 5830000,
      });
      const queryParams: QueryParams = {
        lat: 52.57326537485767,
        lon: 12.948781146422107,
        targetGrid: 'control',
      };

      const response = await latLonManager.latLonToTile(queryParams);
      const minLongitude = 12.93694771534361,
        minLatitude = 52.51211561266182,
        maxLongitude = 13.080296161196031,
        maxLatitude = 52.60444267653175;

      expect(response).toEqual<GenericGeocodingFeatureResponse>({
        type: 'Feature',
        geocoding: {
          version: process.env.npm_package_version as string,
          query: convertCamelToSnakeCase(queryParams as unknown as Record<string, unknown>),
          response: {
            max_score: 1,
            results_count: 1,
            match_latency_ms: expect.any(Number) as number,
          },
        },
        bbox: [minLongitude, minLatitude, maxLongitude, maxLatitude],
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [minLongitude, minLatitude],
              [minLongitude, maxLatitude],
              [maxLongitude, maxLatitude],
              [maxLongitude, minLatitude],
              [minLongitude, minLatitude],
            ],
          ],
        },
        properties: {
          matches: [
            {
              layer: 'convertionTable',
              source: 'mapcolonies',
              source_id: [],
            },
          ],
          names: {
            default: ['BRN'],
            display: 'BRN',
          },
          tileName: 'BRN',
          subTileNumber: ['06', '97', '97'],
        },
      });
    });

    it('should return MGRS tile', () => {
      const queryParams: QueryParams = {
        lat: 52.57326537485767,
        lon: 12.948781146422107,
        targetGrid: 'MGRS',
      };

      const response = latLonManager.latLonToMGRS(queryParams);

      expect(response).toEqual<GenericGeocodingFeatureResponse>({
        type: 'Feature',
        geocoding: {
          version: process.env.npm_package_version as string,
          query: convertCamelToSnakeCase(queryParams as unknown as Record<string, unknown>),
          response: {
            max_score: 1,
            results_count: 1,
            match_latency_ms: expect.any(Number) as number,
          },
        },
        bbox: [12.948777289238832, 52.57325754975297, 12.948791616108007, 52.57326678960368],
        geometry: {
          type: 'Point',
          coordinates: [12.948781146422107, 52.57326537485767],
        },
        properties: {
          matches: [
            {
              layer: 'MGRS',
              source: 'npm/MGRS',
              source_id: [],
            },
          ],
          names: {
            default: ['33UUU6099626777'],
            display: '33UUU6099626777',
          },
          accuracy: '1m',
          mgrs: '33UUU6099626777',
          score: 1,
        },
      });
    });
  });

  describe('sad path', () => {
    it('should throw BadRequestError when invalid coordiantes are being provided', async () => {
      const queryParams: QueryParams = {
        lat: 100,
        lon: 200,
        targetGrid: 'control',
      };

      await expect(latLonManager.latLonToTile(queryParams)).rejects.toThrow(
        new BadRequestError("Invalid lat lon, check 'lat' and 'lon' keys exists and their values are legal")
      );
    });

    it('should throw BadRequestError when the coordinate is outside the grid extent', async () => {
      latLonToTile.mockResolvedValueOnce(null);
      const queryParams: QueryParams = {
        lat: 52.57326537485767,
        lon: 12.948781146422107,
        targetGrid: 'control',
      };

      await expect(latLonManager.latLonToTile(queryParams)).rejects.toThrow(new BadRequestError('The coordinate is outside the grid extent'));
    });

    it('should throw BadRequestError when convertWgs84ToUTM resolves as a string', async () => {
      const spy = jest.spyOn(CommonUtils, 'convertWgs84ToUTM');
      spy.mockReturnValueOnce('abc');

      const queryParams: QueryParams = {
        lat: 52.57326537485767,
        lon: 12.948781146422107,
        targetGrid: 'control',
      };

      await expect(latLonManager.latLonToTile(queryParams)).rejects.toThrow(new BadRequestError('utm is string'));

      spy.mockClear();
    });
  });
});
