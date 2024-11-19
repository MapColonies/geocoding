import { IConfig } from 'config';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { Feature } from 'geojson';
import { SERVICES, elasticConfigPath } from '../../common/constants';
import { GEOTEXT_REPOSITORY_SYMBOL, GeotextRepository } from '../DAL/locationRepository';
import { GetGeotextSearchParams, TextSearchParams } from '../interfaces';
import { convertResult } from '../utils';
import { GenericGeocodingResponse, IApplication } from '../../common/interfaces';
import { ElasticDbClientsConfig } from '../../common/elastic/interfaces';
import { ConvertSnakeToCamelCase } from '../../common/utils';
import { BadRequestError } from '../../common/errors';

@injectable()
export class GeotextSearchManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.APPLICATION) private readonly appConfig: IApplication,
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(GEOTEXT_REPOSITORY_SYMBOL) private readonly geotextRepository: GeotextRepository
  ) {}

  public async search(params: ConvertSnakeToCamelCase<GetGeotextSearchParams>): Promise<GenericGeocodingResponse<Feature>> {
    if (this.appConfig.sources && params.source && params.source.some((source) => !this.appConfig.sources![source])) {
      throw new BadRequestError(`Invalid source. Available sources are ${Object.keys(this.appConfig.sources).toString()}`);
    }

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
      this.geotextRepository.generatePlacetype(placetypesIndex, query, params.disableFuzziness),
      this.geotextRepository.extractHierarchy(hierarchiesIndex, hierarchyQuery.join(','), hierarchyBoost, params.disableFuzziness),
    ]);

    const [
      { name, latency: nlpAnalyserLatency },
      { placeTypes, subPlaceTypes, matchLatencyMs: placeTypeMatchLatencyMs },
      { hierarchies, matchLatencyMs: hierarchiesMatchLatencyMs },
    ] = await promises;

    const searchParams: TextSearchParams = {
      ...params,
      name,
      placeTypes,
      subPlaceTypes,
      hierarchies,
    };

    const esResult = await this.geotextRepository.geotextSearch(
      geotextIndex,
      searchParams,
      this.config.get<ElasticDbClientsConfig>(elasticConfigPath).geotext.properties.textTermLanguage,
      this.appConfig.elasticQueryBoosts,
      this.appConfig.geotextCitiesLayer
    );

    return convertResult(searchParams, esResult, {
      sources: this.appConfig.sources,
      regionCollection: this.appConfig.regions,
      nameKeys: this.appConfig.nameTranslationsKeys,
      mainLanguageRegex: this.appConfig.mainLanguageRegex,
      externalResourcesLatency: {
        query: esResult.took,
        placeType: placeTypeMatchLatencyMs,
        hierarchies: hierarchiesMatchLatencyMs,
        nlpAnalyser: nlpAnalyserLatency,
      },
    });
  }

  public regions(): string[] {
    return Object.keys(this.appConfig.regions ?? {});
  }

  public sources(): string[] {
    return Object.keys(this.appConfig.sources ?? {});
  }
}
