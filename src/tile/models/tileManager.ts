import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { estypes } from '@elastic/elasticsearch';
import { SERVICES } from '../../common/constants';
import { TILE_REPOSITORY_SYMBOL, TileRepository } from '../DAL/tileRepository';
import { formatResponse } from '../../common/utils';
import { TileQueryParams } from '../DAL/queries';
import { FeatureCollection } from '../../common/interfaces';
import { Tile } from './tile';

@injectable()
export class TileManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(TILE_REPOSITORY_SYMBOL) private readonly tileRepository: TileRepository
  ) {}

  public async getTiles(tileQueryParams: TileQueryParams, reduceFuzzyMatch = false, size?: number): Promise<FeatureCollection<Tile>> {
    let elasticResponse: estypes.SearchResponse<Tile> | undefined = undefined;
    const numberOfResults = size ?? this.config.get<number>('db.elastic.properties.size');
    if (tileQueryParams.subTile ?? 0) {
      elasticResponse = await this.tileRepository.getSubTiles(tileQueryParams as Required<TileQueryParams>, numberOfResults);
    } else {
      elasticResponse = await this.tileRepository.getTiles(tileQueryParams, numberOfResults);
    }

    const formattedResponse = formatResponse(elasticResponse);

    if (reduceFuzzyMatch && formattedResponse.features.length > 0) {
      const filterFunction =
        tileQueryParams.subTile ?? 0
          ? (hit: Tile | undefined): hit is Tile =>
              hit?.properties?.SUB_TILE_ID === tileQueryParams.subTile && hit?.properties?.TILE_NAME === tileQueryParams.tile
          : (hit: Tile | undefined): hit is Tile => hit?.properties?.TILE_NAME === tileQueryParams.tile;
      formattedResponse.features = formattedResponse.features.filter(filterFunction);
    }

    return formattedResponse;
  }
}
