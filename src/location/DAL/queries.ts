/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import WKT, { GeoJSONPolygon } from 'wellknown';
import { estypes } from '@elastic/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { TextSearchParams } from '../interfaces';
import { GeoContextMode, IApplication } from '../../common/interfaces';
import { BadRequestError } from '../../common/errors';
import { geoContextQuery } from '../../common/utils';

const TEXT_FIELD = 'text';
const PLACETYPE_FIELD = 'placetype.keyword';
const SUB_PLACETYPE_FIELD = 'sub_placetype.keyword';
const GEOJSON_FIELD = 'geo_json';
const SOURCE_FIELD = 'source';
const REGION_FIELD = 'region';
const HIERARCHY_FIELD = 'heirarchy';
const LAYER_NAME_FIELD = 'layer_name';
const PLACETYPE_SEARCH_FIELD = 'sub_placetype_keyword';

export const geotextQuery = (
  {
    query,
    limit: size,
    name,
    placeTypes,
    subPlaceTypes,
    hierarchies,
    region,
    source,
    geoContext,
    geoContextMode,
    disableFuzziness,
  }: TextSearchParams,
  textLanguage: string,
  boosts: IApplication['elasticQueryBoosts'],
  geotextLayerName?: { geotextCitiesLayer?: IApplication['geotextCitiesLayer']; roadPlaceTypes?: IApplication['roadPlaceTypes'] }
): estypes.SearchRequest => {
  if ((geoContext !== undefined && geoContextMode === undefined) || (geoContext === undefined && geoContextMode !== undefined)) {
    throw new BadRequestError('/location/geotextQuery: geo_context and geo_context_mode must be both defined or both undefined');
  }

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

  if (geoContext && geoContextMode) {
    const geoContextQueryFilter = geoContextQuery(geoContext, GeoContextMode.FILTER, GEOJSON_FIELD).filter![0];

    if (geoContextMode === GeoContextMode.FILTER) {
      (esQuery.query?.function_score?.query?.bool?.filter as QueryDslQueryContainer[]).push(geoContextQueryFilter);
    } else {
      esQuery.query?.function_score?.functions?.push({
        weight: boosts.viewbox,
        filter: geoContextQueryFilter,
      });
    }
  }

  if (!name && subPlaceTypes?.length) {
    (esQuery.query?.function_score?.query?.bool?.must as QueryDslQueryContainer[]).push(
      ...[
        {
          terms: {
            [SUB_PLACETYPE_FIELD]: subPlaceTypes,
          },
        },
        {
          term: {
            text_language: textLanguage,
          },
        },
      ]
    );
  } else {
    (esQuery.query?.function_score?.query?.bool?.must as QueryDslQueryContainer[]).push({
      match: {
        [TEXT_FIELD]: {
          query,
          fuzziness: disableFuzziness ? undefined : 'AUTO:3,4',
        },
      },
    });
  }

  source?.length &&
    (esQuery.query?.function_score?.query?.bool?.filter as QueryDslQueryContainer[]).push({
      terms: {
        [SOURCE_FIELD]: source,
      },
    });

  region?.length &&
    (esQuery.query?.function_score?.query?.bool?.filter as QueryDslQueryContainer[]).push({
      terms: {
        [REGION_FIELD]: region,
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

  if (placeTypes?.length) {
    esQuery.query?.function_score?.functions?.push({
      weight: boosts.placeType,
      filter: {
        terms: {
          [PLACETYPE_FIELD]: placeTypes,
        },
      },
    });

    esQuery.query?.function_score?.functions?.push({
      weight: boosts.subPlaceType,
      filter: {
        terms: {
          [SUB_PLACETYPE_FIELD]: subPlaceTypes!,
        },
      },
    });
  } else {
    geotextLayerName?.geotextCitiesLayer &&
      esQuery.query?.function_score?.functions?.push({
        weight: boosts.geotextCitiesLayer,
        filter: {
          term: {
            [LAYER_NAME_FIELD]: geotextLayerName.geotextCitiesLayer,
          },
        },
      });
  }

  geotextLayerName?.roadPlaceTypes !== undefined &&
    !placeTypes?.some((pt) => geotextLayerName.roadPlaceTypes!.includes(pt)) &&
    (esQuery.query?.function_score?.query?.bool?.filter as QueryDslQueryContainer[]).push({
      bool: {
        must_not: {
          terms: {
            [PLACETYPE_FIELD]: geotextLayerName.roadPlaceTypes,
          },
        },
      },
    });

  hierarchies.forEach((hierarchy) => {
    // eslint-disable-next-line import-x/no-named-as-default-member
    const hierarchyShape = typeof hierarchy.geo_json === 'string' ? WKT.parse(hierarchy.geo_json) : hierarchy.geo_json;
    esQuery.query?.function_score?.functions?.push({
      weight: hierarchy.weight,
      filter: {
        geo_shape: {
          [GEOJSON_FIELD]: {
            shape: {
              type: hierarchyShape?.type,
              coordinates: (hierarchyShape as GeoJSONPolygon).coordinates,
            },
          },
        },
      },
    });
  });

  esQuery.highlight!.fields = { [TEXT_FIELD]: {} };

  return esQuery;
};

export const placetypeQuery = (query: string, disableFuzziness: boolean): estypes.SearchRequest => ({
  query: {
    bool: {
      should: {
        match: {
          [PLACETYPE_SEARCH_FIELD]: {
            query,
            fuzziness: disableFuzziness ? undefined : 'AUTO:3,4',
          },
        },
      },
    },
  },
  size: 2,
});

export const hierarchyQuery = (query: string, disableFuzziness: boolean): estypes.SearchRequest => ({
  query: {
    function_score: {
      functions: [
        {
          weight: 1.1,
          filter: {
            match: {
              [HIERARCHY_FIELD]: {
                query,
                fuzziness: disableFuzziness ? undefined : 'AUTO:3,4',
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
                fuzziness: disableFuzziness ? undefined : 'AUTO:3,4',
              },
            },
          },
        },
      },
    },
  },
});
