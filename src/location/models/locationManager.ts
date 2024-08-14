import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { SERVICES, elasticConfigPath } from '../../common/constants';
import { GEOTEXT_REPOSITORY_SYMBOL, GeotextRepository } from '../DAL/locationRepository';
import { GetGeotextSearchParams, QueryResult, TextSearchParams } from '../interfaces';
import { convertResult, parseGeo } from '../utils';
import { IApplication } from '../../common/interfaces';
import { ElasticDbClientsConfig } from '../../common/elastic/interfaces';

@injectable()
export class GeotextSearchManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.APPLICATION) private readonly appConfig: IApplication,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(GEOTEXT_REPOSITORY_SYMBOL) private readonly geotextRepository: GeotextRepository
  ) {}

  public async search(params: GetGeotextSearchParams): Promise<QueryResult> {
    const extractNameEndpoint = this.appConfig.services.tokenTypesUrl;
    const {
      geotext: geotextIndex,
      placetypes: placetypesIndex,
      hierarchies: hierarchiesIndex,
    } = this.config.get<ElasticDbClientsConfig>(elasticConfigPath).geotext.properties.index as {
      [key: string]: string;
    };
    const hierarchyBoost = this.appConfig.elasticQueryBoosts.hierarchy;

    const [query, ...hierarchyQuery] = params.query.split(',');

    const promises = Promise.all([
      this.geotextRepository.extractName(extractNameEndpoint, query),
      this.geotextRepository.generatePlacetype(placetypesIndex, query),
      this.geotextRepository.extractHierarchy(hierarchiesIndex, hierarchyQuery.join(','), hierarchyBoost),
    ]);

    const [name, { placeTypes, subPlaceTypes }, hierarchies] = await promises;

    const searchParams: TextSearchParams = {
      query,
      limit: params.limit,
      sources: params.source ? (params.source instanceof Array ? params.source : [params.source]) : undefined,
      viewbox: params.viewbox ? parseGeo(params.viewbox) : undefined,
      boundary: params.boundary ? parseGeo(params.boundary) : undefined,
      name,
      placeTypes,
      subPlaceTypes,
      hierarchies,
      regions: params.region,
    };

    const esResult = await this.geotextRepository.geotextSearch(
      geotextIndex,
      searchParams,
      this.config.get<ElasticDbClientsConfig>(elasticConfigPath).geotext.properties.textTermLanguage,
      this.appConfig.elasticQueryBoosts
    );

    return convertResult(searchParams, esResult.hits.hits, {
      sources: this.appConfig.sources,
      regionCollection: this.appConfig.regions,
      nameKeys: this.appConfig.nameTranslationsKeys,
      mainLanguageRegex: this.appConfig.mainLanguageRegex,
    });
  }

  public regions(): string[] {
    return Object.keys(this.appConfig.regions ?? {});
  }
}
