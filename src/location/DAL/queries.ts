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
import { PLACE_BOOST, PLACE_CANDIDATE_SIZE, PLACE_PHRASE_BOOST, PLACETYPE_EXACT_BOOST, PLACETYPE_QUERY_SIZE } from '../placeResolution/constants';
import type { CandidateSpan, ResolvedPlace } from '../placeResolution/types';
import type { HierarchySearchHit } from '../models/elasticsearchHits';

const TEXT_FIELD = 'text';
const PLACETYPE_FIELD = 'placetype.keyword';
const SUB_PLACETYPE_FIELD = 'sub_placetype.keyword';
const GEOJSON_FIELD = 'geo_json';
const SOURCE_FIELD = 'source';
const REGION_FIELD = 'region';
const HIERARCHY_FIELD = 'hierarchy';
const LAYER_NAME_FIELD = 'layer_name';
const PLACETYPE_SEARCH_FIELD = 'sub_placetype_keyword';

/** Elasticsearch's own default, made explicit - `hierarchyQuery` previously set no size at all. */
const HIERARCHY_QUERY_SIZE = 10;

/** Hierarchy geometries arrive either as GeoJSON or as a WKT string, depending on the index. */
const geoShapeOf = (hierarchy: HierarchySearchHit): { type?: string; coordinates?: unknown } => {
  // eslint-disable-next-line import-x/no-named-as-default-member
  const shape = typeof hierarchy.geo_json === 'string' ? WKT.parse(hierarchy.geo_json) : hierarchy.geo_json;
  return { type: shape?.type, coordinates: (shape as GeoJSONPolygon).coordinates };
};

/**
 * The geo_shape clause for a resolved place. `intersects` rather than `within`, so a feature
 * straddling the boundary is not dropped.
 */
const placeShapeClause = (place: ResolvedPlace, boost?: number): QueryDslQueryContainer => ({
  geo_shape: {
    [GEOJSON_FIELD]: { shape: geoShapeOf(place.hit), relation: 'intersects' },
    ...(boost !== undefined ? { boost } : {}),
  },
});

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
    place,
    searchText,
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
            // A bool that already has `must` treats `should` as score-contributing only, so a
            // place in boost mode lifts matches inside it without excluding anything.
            should: [],
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

  if (place) {
    if (place.mode === 'filter') {
      (esQuery.query?.function_score?.query?.bool?.filter as QueryDslQueryContainer[]).push(placeShapeClause(place));
    } else {
      (esQuery.query?.function_score?.query?.bool?.should as QueryDslQueryContainer[]).push(placeShapeClause(place, PLACE_BOOST));
    }
  }

  // `searchText` is the query with a resolved place name cut out of it, so the place does not
  // also compete as a literal term. `query` stays the user's own string, for the echo.
  const text = searchText ?? query;

  const interpretations: QueryDslQueryContainer[] = [
    {
      match: {
        [TEXT_FIELD]: {
          query: text,
          fuzziness: disableFuzziness ? undefined : 'AUTO:3,4',
        },
      },
    },
  ];

  if (subPlaceTypes?.length) {
    interpretations.push({
      bool: {
        must: [{ terms: { [SUB_PLACETYPE_FIELD]: subPlaceTypes } }, { term: { text_language: textLanguage } }],
      },
    });
  }

  (esQuery.query?.function_score?.query?.bool?.must as QueryDslQueryContainer[]).push({
    bool: {
      should: interpretations,
      minimum_should_match: 1,
    },
  });

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
    esQuery.query?.function_score?.functions?.push({
      weight: hierarchy.weight,
      filter: {
        geo_shape: {
          [GEOJSON_FIELD]: { shape: geoShapeOf(hierarchy) },
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
      // An exact match is always preferred; the fuzzy clause only widens the net, and whatever
      // it returns still has to pass `isPlausiblePlacetype` before it reaches the search.
      should: [
        {
          match: {
            [PLACETYPE_SEARCH_FIELD]: {
              query,
              boost: PLACETYPE_EXACT_BOOST,
            },
          },
        },
        ...(disableFuzziness
          ? []
          : [
              {
                match: {
                  [PLACETYPE_SEARCH_FIELD]: {
                    query,
                    fuzziness: 'AUTO:3,4',
                  },
                },
              },
            ]),
      ],
      minimum_should_match: 1,
    },
  },
  size: PLACETYPE_QUERY_SIZE,
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
  size: HIERARCHY_QUERY_SIZE,
});

/**
 * One Elasticsearch call that asks the gazetteer about every candidate span at once.
 *
 * Each clause is *named*, so `matched_queries` on a hit says which span produced it - that is
 * what makes a single request enough. `match_phrase` is the right direction here: it asks
 * whether the entry *is* the span, not whether the entry mentions the query.
 */
export const placeCandidatesQuery = (spans: CandidateSpan[], disableFuzziness: boolean): estypes.SearchRequest => ({
  query: {
    bool: {
      minimum_should_match: 1,
      should: spans.flatMap<QueryDslQueryContainer>((span) => [
        {
          match_phrase: {
            [TEXT_FIELD]: { query: span.text, _name: `p:${span.id}`, boost: PLACE_PHRASE_BOOST },
          },
        },
        ...(disableFuzziness
          ? []
          : [
              {
                match: {
                  [TEXT_FIELD]: {
                    query: span.text,
                    // Stricter than the AUTO:3,4 used elsewhere: short Hebrew tokens get zero
                    // edits, and every term must match, so a one-of-three accident cannot pass.
                    fuzziness: 'AUTO:4,7',
                    minimum_should_match: '100%',
                    _name: `f:${span.id}`,
                  },
                },
              },
            ]),
      ]),
    },
  },
  size: PLACE_CANDIDATE_SIZE,
  track_total_hits: false,
});
