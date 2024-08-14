import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import { SERVICES } from '../../../common/constants';
import { TILE_REPOSITORY_SYMBOL, TileRepository } from '../DAL/tileRepository';
import { formatResponse } from '../../utils';
import { TileQueryParams } from '../DAL/queries';
import { FeatureCollection } from '../../../common/interfaces';
import { BadRequestError, NotImplementedError } from '../../../common/errors';
import { Tile } from './tile';

@injectable()
export class TileManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(TILE_REPOSITORY_SYMBOL) private readonly tileRepository: TileRepository
  ) {}

  public async getTiles(tileQueryParams: TileQueryParams): Promise<FeatureCollection<Tile>> {
    const { limit } = tileQueryParams;

    if (
      (tileQueryParams.tile === undefined && tileQueryParams.mgrs === undefined) ||
      (tileQueryParams.tile !== undefined && tileQueryParams.mgrs !== undefined)
    ) {
      throw new BadRequestError("/control/tiles/queryForTiles: only one of 'tile' or 'mgrs' query parameter must be defined");
    }

    //TODO: Handle MGRS query
    if (tileQueryParams.mgrs !== undefined) {
      throw new NotImplementedError('MGRS query is not implemented yet');
    }

    let elasticResponse: estypes.SearchResponse<Tile> | undefined = undefined;
    if (tileQueryParams.tile === undefined) {
      throw new BadRequestError('/control/tiles/queryForTiles: tile must be defined');
    }

    if (tileQueryParams.subTile ?? 0) {
      elasticResponse = await this.tileRepository.getSubTiles(tileQueryParams as Required<TileQueryParams>, limit);
    } else {
      elasticResponse = await this.tileRepository.getTiles(tileQueryParams as TileQueryParams & Required<Pick<TileQueryParams, 'tile'>>, limit);
    }

    return formatResponse(elasticResponse, tileQueryParams);
  }
}
