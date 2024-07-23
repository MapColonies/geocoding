/* eslint-disable @typescript-eslint/naming-convention */
import WKT, { GeoJSONPolygon } from 'wellknown';
import { estypes } from '@elastic/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { TextSearchParams } from '../interfaces';
import { IApplication } from '../../common/interfaces';

const TEXT_FIELD = 'text';
const PLACETYPE_FIELD = 'placetype.keyword';
const SUB_PLACETYPE_FIELD = 'sub_placetype.keyword';
const GEOJSON_FIELD = 'geo_json';
const SOURCE_FIELD = 'source';
const REGION_FIELD = 'region';
const HIERARCHY_FIELD = 'heirarchy';
const PLACETYPE_SEARCH_FIELD = 'sub_placetype_keyword';

export const geotextQuery = (
  { query, limit: size, name, placeTypes, subPlaceTypes, hierarchies, regions, viewbox, boundary, sources }: TextSearchParams,
  textLanguage: string,
  boosts: IApplication['elasticQueryBoosts']
): estypes.SearchRequest => {
  const esQuery: estypes.SearchRequest = {
    query: {
      function_score: {
        functions: [],
        query: {
          bool: {
            must: [],
            filter: [],
          },
        },
      },
    },
    highlight: {
      fields: {},
    },
    size,
  };

  if (!name && subPlaceTypes?.length) {
    (esQuery.query?.function_score?.query?.bool?.must as QueryDslQueryContainer[]).push({
      terms: {
        [SUB_PLACETYPE_FIELD]: subPlaceTypes,
      },
    });

    (esQuery.query?.function_score?.query?.bool?.must as QueryDslQueryContainer[]).push({
      term: {
        text_language: textLanguage,
      },
    });
  } else {
    (esQuery.query?.function_score?.query?.bool?.must as QueryDslQueryContainer[]).push({
      match: {
        [TEXT_FIELD]: {
          query,
          fuzziness: 'AUTO:3,4',
        },
      },
    });
  }

  boundary &&
    (esQuery.query?.function_score?.query?.bool?.must as QueryDslQueryContainer[]).push({
      geo_shape: {
        [GEOJSON_FIELD]: {
          shape: boundary,
        },
      },
    });

  sources?.length &&
    (esQuery.query?.function_score?.query?.bool?.must as QueryDslQueryContainer[]).push({
      terms: {
        [SOURCE_FIELD]: sources,
      },
    });

  regions?.length &&
    (esQuery.query?.function_score?.query?.bool?.must as QueryDslQueryContainer[]).push({
      terms: {
        [REGION_FIELD]: regions,
      },
    });

  name &&
    esQuery.query?.function_score?.functions?.push({
      weight: boosts.name,
      filter: {
        match: {
          [TEXT_FIELD]: name,
        },
      },
    });

  placeTypes?.length &&
    esQuery.query?.function_score?.functions?.push({
      weight: boosts.placeType,
      filter: {
        terms: {
          [PLACETYPE_FIELD]: placeTypes,
        },
      },
    });

  subPlaceTypes?.length &&
    esQuery.query?.function_score?.functions?.push({
      weight: boosts.subPlaceType,
      filter: {
        terms: {
          [SUB_PLACETYPE_FIELD]: subPlaceTypes,
        },
      },
    });

  viewbox &&
    esQuery.query?.function_score?.functions?.push({
      weight: boosts.viewbox,
      filter: {
        geo_shape: {
          [GEOJSON_FIELD]: {
            shape: viewbox,
          },
        },
      },
    });

  hierarchies.forEach((hierarchy) => {
    const hierarchyGeoJSON = WKT.parse(hierarchy.geo_json);
    const hierarchyShape = {
      type: hierarchyGeoJSON!.type.toLowerCase(),
      coordinates: (hierarchyGeoJSON as GeoJSONPolygon).coordinates,
    };

    esQuery.query?.function_score?.functions?.push({
      weight: hierarchy.weight,
      filter: {
        geo_shape: {
          [GEOJSON_FIELD]: {
            shape: hierarchyShape,
          },
        },
      },
    });
  });

  esQuery.highlight!.fields = { [TEXT_FIELD]: {} };

  return esQuery;
};

export const placetypeQuery = (query: string): estypes.SearchRequest => ({
  query: {
    bool: {
      should: {
        match: {
          [PLACETYPE_SEARCH_FIELD]: {
            query,
            fuzziness: 'AUTO:3,4',
          },
        },
      },
    },
  },
  size: 2,
});

export const hierarchyQuery = (query: string): estypes.SearchRequest => ({
  query: {
    function_score: {
      functions: [
        {
          weight: 1.1,
          filter: {
            match: {
              [HIERARCHY_FIELD]: {
                query,
                fuzziness: 'AUTO:3,4',
              },
            },
          },
        },
      ],
      query: {
        bool: {
          must: {
            match: {
              text: {
                query,
                fuzziness: 'AUTO:3,4',
              },
            },
          },
        },
      },
    },
  },
});
