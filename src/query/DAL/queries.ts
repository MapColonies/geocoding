/* eslint-disable @typescript-eslint/naming-convention */
import { estypes } from '@elastic/elasticsearch';
import { TextSearchParams } from '../interfaces';

export const esQuery = ({ query, limit, name, placeType, viewbox, boundary, sources }: TextSearchParams): estypes.SearchRequest => ({
  query: {
    bool: {
      must: { match: { text: query } },
      should: [
        { match_phrase: { text: query } },
        {
          match: {
            text: {
              query,
              fuzziness: 'AUTO',
            },
          },
        },
        ...(name ?? '' ? [{ match: { text: name } }] : []),
        ...(placeType ? [{ term: { placetype: { value: placeType.placetype, boost: placeType.confidence } } }] : []),
        ...(viewbox ? [{ geo_shape: { geo_json: { shape: viewbox } } }] : []),
        ...(boundary ? [{ geo_shape: { geo_json: { shape: boundary } } }] : []),
        ...(sources ? [{ terms: { source: sources } }] : []),
      ],
      minimum_should_match: 0,
    },
  },
  highlight: {
    fields: {
      text: {},
    },
  },
  size: limit,
});
