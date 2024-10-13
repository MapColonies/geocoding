import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import * as mgrs from 'mgrs';
import { BBox } from 'geojson';
import { SERVICES } from '../../../common/constants';
import { TILE_REPOSITORY_SYMBOL, TileRepository } from '../DAL/tileRepository';
import { formatResponse } from '../../utils';
import { TileQueryParams } from '../DAL/queries';
import { FeatureCollection, IApplication } from '../../../common/interfaces';
import { BadRequestError } from '../../../common/errors';
import { Tile } from './tile';

@injectable()
export class TileManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.APPLICATION) private readonly application: IApplication,
    @inject(TILE_REPOSITORY_SYMBOL) private readonly tileRepository: TileRepository
  ) {}

  public async getTiles(tileQueryParams: TileQueryParams): Promise<FeatureCollection<Tile>> {
    if (
      (tileQueryParams.tile === undefined && tileQueryParams.mgrs === undefined) ||
      (tileQueryParams.tile !== undefined && tileQueryParams.mgrs !== undefined)
    ) {
      throw new BadRequestError("/control/tiles: only one of 'tile' or 'mgrs' query parameter must be defined");
    }

    let elasticResponse: estypes.SearchResponse<Tile> | undefined = undefined;

    if (tileQueryParams.mgrs !== undefined) {
      let bbox: BBox = [0, 0, 0, 0];
      try {
        bbox = mgrs.inverse(tileQueryParams.mgrs);
        bbox.forEach((coord) => {
          if (isNaN(coord)) {
            throw new Error('Invalid MGRS');
          }
        });
      } catch (error) {
        throw new BadRequestError(`Invalid MGRS: ${tileQueryParams.mgrs}`);
      }
      elasticResponse = await this.tileRepository.getTilesByBbox({ bbox, ...tileQueryParams });
    } else if (tileQueryParams.subTile ?? '') {
      elasticResponse = await this.tileRepository.getSubTiles(tileQueryParams as Required<TileQueryParams>);
    } else {
      elasticResponse = await this.tileRepository.getTiles(tileQueryParams as TileQueryParams & Required<Pick<TileQueryParams, 'tile'>>);
    }

    return formatResponse(elasticResponse, tileQueryParams, this.application.controlObjectDisplayNamePrefixes);
  }
}
