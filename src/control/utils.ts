import { estypes } from '@elastic/elasticsearch';
import { parseGeo } from '../geotextSearch/utils';
import { FeatureCollection, GeoContext, GeoContextMode, IConfig } from '../common/interfaces';
import { BadRequestError } from '../common/errors';
import { elasticConfigPath } from '../common/constants';
import { ElasticDbClientsConfig } from '../common/elastic/interfaces';
import { Item } from '../control/item/models/item';
import { Tile } from '../control/tile/models/tile';
import { Route } from '../control/route/models/route';
import { CONTROL_FIELDS, ELASTIC_KEYWORDS } from './constants';

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}` ? `${T}${Capitalize<SnakeToCamelCase<U>>}` : S;

export type ConvertSnakeToCamelCase<T> = {
  [K in keyof T as SnakeToCamelCase<K & string>]: T[K];
};

export const formatResponse = <T extends Item | Tile | Route>(elasticResponse: estypes.SearchResponse<T>): FeatureCollection<T> => ({
  type: 'FeatureCollection',
  features: [
    ...(elasticResponse.hits.hits.map((item) => {
      const source = item._source;
      if (source?.properties) {
        Object.keys(source.properties).forEach((key) => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (source.properties !== null && source.properties[key as keyof typeof source.properties] == null) {
            delete source.properties[key as keyof typeof source.properties];
          }
        });
      }
      return source;
    }) as T[]),
  ],
});

export const geoContextQuery = (
  geoContext?: GeoContext,
  geoContextMode?: GeoContextMode
): { [key in 'filter' | 'should']?: estypes.QueryDslQueryContainer[] } => {
  if (geoContext === undefined && geoContextMode === undefined) {
    return {};
  }
  if ((geoContext !== undefined && geoContextMode === undefined) || (geoContext === undefined && geoContextMode !== undefined)) {
    throw new BadRequestError('/control/utils/geoContextQuery: geo_context and geo_context_mode must be both defined or both undefined');
  }

  return {
    [geoContextMode === GeoContextMode.FILTER ? 'filter' : 'should']: [
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        geo_shape: {
          [ELASTIC_KEYWORDS.geometry]: {
            shape: parseGeo(geoContext!),
          },
          boost: geoContextMode === GeoContextMode.BIAS ? 1.1 : 1, //TODO: change magic number
        },
      },
    ],
  };
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const additionalControlSearchProperties = (config: IConfig, size: number): { size: number; index: string; _source: string[] } => ({
  size,
  index: config.get<ElasticDbClientsConfig>(elasticConfigPath).control.properties.index as string,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _source: CONTROL_FIELDS,
});
