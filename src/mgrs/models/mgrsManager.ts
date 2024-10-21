/* eslint-disable @typescript-eslint/naming-convention */
import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { BBox, Geometry } from 'geojson';
import { inject, injectable } from 'tsyringe';
import * as mgrs from 'mgrs';
import { SERVICES } from '../../common/constants';
import { GenericGeocodingFeatureResponse, IApplication } from '../../common/interfaces';
import { GetTileQueryParams } from '../controllers/mgrsController';
import { BadRequestError } from '../../common/errors';
import { parseGeo } from '../../common/utils';

@injectable()
export class MgrsManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.APPLICATION) private readonly application: IApplication
  ) {}

  public getTile({ tile }: GetTileQueryParams): GenericGeocodingFeatureResponse {
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
        score: 1,
      },
    };
  }
}
