/* eslint-disable @typescript-eslint/naming-convention */
export const SmartQuerySpanName = {
  MANAGER_SEARCH: 'smartQuery.manager.search',
  REPOSITORY_SEARCH_CONTROL: 'smartQuery.repository.search_control',
} as const;

export type SmartQuerySpanName = (typeof SmartQuerySpanName)[keyof typeof SmartQuerySpanName];

export const SmartQueryAttributes = {
  QUERY: 'geocoding.query',
  INTENTS: 'geocoding.smart.intents',
  SOURCES_QUERIED: 'geocoding.smart.sources_queried',
  PARTIAL_FAILURES: 'geocoding.smart.partial_failures',
  CONTROL_RESULT_COUNT: 'geocoding.smart.control_result_count',
  PLACES_RESULT_COUNT: 'geocoding.smart.places_result_count',
} as const;

export type SmartQueryAttributes = (typeof SmartQueryAttributes)[keyof typeof SmartQueryAttributes];
