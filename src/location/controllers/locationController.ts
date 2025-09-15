import { Logger } from '@map-colonies/js-logger';
import { type Registry } from 'prom-client';
import { RequestHandler } from 'express';
import httpStatus from 'http-status-codes';
import type { Feature } from 'geojson';
import { injectable, inject } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { GeotextSearchManager } from '../models/locationManager';
import { GetGeotextSearchByCoordinatesParams, GetGeotextSearchParams } from '../interfaces';
import { GenericGeocodingResponse } from '../../common/interfaces';

type GetGeotextSearchHandler = RequestHandler<
  unknown,
  GenericGeocodingResponse<Feature> | { message: string; error: string },
  undefined,
  GetGeotextSearchParams
>;

type GetGeotextSearchByCoordinatesHandler = RequestHandler<
  unknown,
  GenericGeocodingResponse<Feature> | { message: string; error: string },
  undefined,
  GetGeotextSearchByCoordinatesParams
>;

type GetRegionshHandler = RequestHandler<unknown, string[], undefined, undefined>;

type GetSourcesHandler = RequestHandler<unknown, string[], undefined, undefined>;

@injectable()
export class GeotextSearchController {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(GeotextSearchManager) private readonly manager: GeotextSearchManager,
    @inject(SERVICES.METRICS) private readonly metricsRegistry: Registry
  ) {}

  public getGeotextSearch: GetGeotextSearchHandler = async (req, res, next) => {
    const {
      disable_fuzziness: disableFuzziness,
      geo_context: geoContext,
      geo_context_mode: geoContextMode,
      query,
      region,
      source,
      limit,
    } = req.query;

    try {
      const response = await this.manager.search({
        query,
        region: region?.map((r) => r.toLowerCase()),
        source: source?.map((s) => s.toLowerCase()),
        disableFuzziness,
        geoContext,
        geoContextMode,
        limit,
      });
      return res.status(httpStatus.OK).json(response);
    } catch (error: unknown) {
      this.logger.error({ msg: 'Error in getGeotextSearch', error });
      next(error);
    }
  };

  public getGeotextSearchByCoordinates: GetGeotextSearchByCoordinatesHandler = async (req, res, next) => {
    try {
      const { lat, lon, limit, source, relation } = req.query;

      const response = await this.manager.searchByCoordinates({
        lat,
        lon,
        limit,
        source: source?.map((s) => s.toLowerCase()),
        relation,
      });

      return res.status(httpStatus.OK).json(response);
    } catch (error) {
      this.logger.error({ msg: 'Error in getGeotextSearchByCoordinates', error });
      next(error);
    }
  };

  public getRegions: GetRegionshHandler = (req, res) => {
    return res.status(httpStatus.OK).json(this.manager.regions());
  };

  public getSources: GetSourcesHandler = (req, res) => {
    return res.status(httpStatus.OK).json(this.manager.sources());
  };
}
