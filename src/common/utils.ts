import config from 'config';
import { estypes } from '@elastic/elasticsearch';
import { Item } from '../item/models/item';
import { Tile } from '../tile/models/tile';
import { Route } from '../route/models/route';
import { FIELDS } from './constants';

export const formatResponse = <T extends Item | Tile | Route>(
  elasticResponse: estypes.SearchResponse<T>
): {
  type: string;
  features: (T | undefined)[];
} => ({
  type: 'FeatureCollection',
  features: [
    ...elasticResponse.hits.hits.map((item) => {
      const source = item._source;
      if (source) {
        Object.keys(source.properties).forEach((key) => {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (source.properties[key as keyof typeof source.properties] == null) {
            delete source.properties[key as keyof typeof source.properties];
          }
        });
      }
      return source;
    }),
  ],
});

/* eslint-disable @typescript-eslint/naming-convention */
export const additionalSearchProperties = (size: number): { size: number; index: string; _source: string[] } => ({
  size,
  index: config.get<string>('db.elastic.properties.index'),
  _source: FIELDS,
});
/* eslint-enable @typescript-eslint/naming-convention */
