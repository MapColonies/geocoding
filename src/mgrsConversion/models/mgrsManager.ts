/* eslint-disable @typescript-eslint/naming-convention */
import { Logger } from '@map-colonies/js-logger';
import type { BBox, Geometry } from 'geojson';
import { inject, injectable } from 'tsyringe';
import * as mgrs from 'mgrs';
import { SERVICES } from '../../common/constants';
import { GenericGeocodingFeatureResponse } from '../../common/interfaces';
import { GetTileQueryParams } from '../controllers/mgrsController';
import { BadRequestError } from '../../common/errors';
import { parseGeo } from '../../common/utils';
import { withSpanSync } from '../../common/tracing';
import { MgrsSpanName, MgrsAttributes } from '../tracing';

@injectable()
export class MgrsManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger) {}

  public getTile({ tile }: GetTileQueryParams): GenericGeocodingFeatureResponse {
    return withSpanSync(MgrsSpanName.MANAGER_GET_TILE, { attributes: { [MgrsAttributes.TILE]: tile } }, (): GenericGeocodingFeatureResponse => {
      let bbox: BBox | undefined;
      try {
        bbox = mgrs.inverse(tile);
      } catch (error) {
        this.logger.error({ msg: 'Failed to convert MGRS tile to bbox.', error });
        throw new BadRequestError(`Invalid MGRS tile. ${(error as Error).message}`);
      }

      const geometry = parseGeo({ bbox }) as Geometry;

      return {
        type: 'Feature',
        geocoding: {
          version: process.env.npm_package_version as string,
          query: {
            tile,
          },
          response: {
            max_score: 1,
            results_count: 1,
            match_latency_ms: 0,
          },
        },
        bbox,
        geometry,
        properties: {
          matches: [
            {
              layer: 'MGRS',
              source: 'npm/mgrs',
              source_id: [],
            },
          ],
          names: {
            default: [tile],
            display: tile,
          },
          score: 1,
        },
      };
    });
  }
}
