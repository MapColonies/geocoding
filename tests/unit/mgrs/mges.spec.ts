/* eslint-disable @typescript-eslint/naming-convention */
import jsLogger from '@map-colonies/js-logger';
import { MgrsManager } from '../../../src/mgrs/models/mgrsManager';
import { GetTileQueryParams } from '../../../src/mgrs/controllers/mgrsController';
import { GenericGeocodingFeatureResponse } from '../../../src/common/interfaces';
import { BadRequestError } from '../../../src/common/errors';

let mgrsManager: MgrsManager;
describe('#MgrsManager', () => {
  beforeEach(() => {
    mgrsManager = new MgrsManager(jsLogger({ enabled: false }), {} as never, {} as never);
  });

  describe('happy path', () => {
    it('should return mgrs tile in its GeoJSON Representation', () => {
      const queryParams: GetTileQueryParams = {
        tile: '18SUJ2339007393',
      };

      const response = mgrsManager.getTile(queryParams);

      expect(response).toEqual<GenericGeocodingFeatureResponse>({
        type: 'Feature',
        geocoding: {
          version: process.env.npm_package_version as string,
          query: {
            tile: queryParams.tile,
          },
          response: {
            max_score: 1,
            results_count: 1,
            match_latency_ms: expect.any(Number) as number,
          },
        },
        bbox: [-77.03654883669269, 38.89767541638445, -77.03653756947197, 38.897684623284015],
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-77.03654883669269, 38.89767541638445],
              [-77.03654883669269, 38.897684623284015],
              [-77.03653756947197, 38.897684623284015],
              [-77.03653756947197, 38.89767541638445],
              [-77.03654883669269, 38.89767541638445],
            ],
          ],
        },
        properties: {
          matches: [
            {
              layer: 'MGRS',
              source: 'npm/mgrs',
              source_id: [],
            },
          ],
          names: {
            default: ['18SUJ2339007393'],
            display: '18SUJ2339007393',
          },
          score: 1,
        },
      });
    });
  });
  describe('sad path', () => {
    it('should throw a BadRequestError for invalid MGRS tile', () => {
      const queryParams: GetTileQueryParams = {
        tile: 'ABC{}',
      };

      expect(() => mgrsManager.getTile(queryParams)).toThrow(new BadRequestError('Invalid MGRS tile. MGRSPoint bad conversion from ABC{}'));
    });
  });

  describe('bad path', () => {
    it('should throw an error for invalid MGRS tile', () => {
      const queryParams: GetTileQueryParams = {
        tile: '{ABC}',
      };

      expect(() => mgrsManager.getTile(queryParams)).toThrow(new BadRequestError('Invalid MGRS tile. MGRSPoint zone letter A not handled: {ABC}'));
    });
  });
});
