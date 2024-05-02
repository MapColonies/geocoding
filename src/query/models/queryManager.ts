import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { SERVICES } from '../../common/constants';
import { QUERY_REPOSITORY_SYMBOL, QueryRepository } from '../DAL/queryRepository';
import { GetQueryQueryParams, TextSearchParams } from '../interfaces';
import { convertResult, parseGeo } from '../utils';

@injectable()
export class QueryManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(QUERY_REPOSITORY_SYMBOL) private readonly itemRepository: QueryRepository
  ) {}

  public async query(params: GetQueryQueryParams) {
    const extractNameEndpoint = this.config.get<string>('services.tokenTypesUrl');
    const placeTypeEndpoint = this.config.get<string>('services.placeTypeUrl');

    const promises = Promise.all([
      this.itemRepository.extractName(extractNameEndpoint, params.query),
      this.itemRepository.getPlaceType(placeTypeEndpoint, params.query),
    ]);

    const [name, placeType] = await promises;

    const searchParams: TextSearchParams = {
      query: params.query,
      limit: params.limit,
      sources: params.sources ? (params.sources instanceof Array ? params.sources : [params.sources]) : undefined,
      viewbox: parseGeo(params.viewbox),
      boundary: parseGeo(params.boundary),
      name,
      placeType,
    };

    const esResult = await this.itemRepository.queryElastic(searchParams);

    return convertResult(searchParams, esResult.hits.hits);
  }
}
