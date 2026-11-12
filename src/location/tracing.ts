/* eslint-disable @typescript-eslint/naming-convention */
export const LocationSpanName = {
  MANAGER_SEARCH: 'location.manager.search',
  REPOSITORY_EXTRACT_NAME: 'location.repository.extract_name',
  REPOSITORY_GENERATE_PLACETYPE: 'location.repository.generate_placetype',
  REPOSITORY_EXTRACT_HIERARCHY: 'location.repository.extract_hierarchy',
  REPOSITORY_FIND_PLACE_CANDIDATES: 'location.repository.find_place_candidates',
  REPOSITORY_GEOTEXT_SEARCH: 'location.repository.geotext_search',
} as const;

export type LocationSpanName = (typeof LocationSpanName)[keyof typeof LocationSpanName];

export const LocationAttributes = {
  QUERY: 'geocoding.query',
  QUERY_NAME: 'geocoding.query.name',
  SOURCES: 'geocoding.query.sources',
  DISABLE_FUZZINESS: 'geocoding.query.disable_fuzziness',
  NLP_ENDPOINT: 'nlp.endpoint',
  PLACE_TYPES: 'geocoding.placetypes',
  SUB_PLACE_TYPES: 'geocoding.sub_placetypes',
  HIERARCHIES_COUNT: 'geocoding.hierarchies.count',
  PLACE_SPANS_COUNT: 'geocoding.place.spans_count',
  PLACE_CANDIDATES_COUNT: 'geocoding.place.candidates_count',
  PLACE_TEXT: 'geocoding.place.text',
  PLACE_MODE: 'geocoding.place.mode',
  PLACE_CONFIDENCE: 'geocoding.place.confidence',
  PLACE_FALLBACK_APPLIED: 'geocoding.place.fallback_applied',
} as const;

export type LocationAttributes = (typeof LocationAttributes)[keyof typeof LocationAttributes];
