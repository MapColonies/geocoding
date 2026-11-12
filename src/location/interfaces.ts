import { CommonRequestParameters } from '../common/interfaces';
import { ConvertSnakeToCamelCase } from '../common/utils';
import { HierarchySearchHit } from './models/elasticsearchHits';
import type { ResolvedPlace } from './placeResolution/types';

export interface PlaceType {
  placetype: string;
  confidence: number;
}

export interface TokenResponse {
  tokens: string[];
  prediction: string[];
}

export interface TextSearchParams extends ConvertSnakeToCamelCase<GetGeotextSearchParams> {
  name?: string;
  placeTypes?: string[];
  subPlaceTypes?: string[];
  hierarchies: HierarchySearchHit[];
  /** The place the query resolved to, and whether it filters or only boosts. */
  place?: ResolvedPlace;
  /** The text actually searched - `query` minus the resolved place name. Defaults to `query`. */
  searchText?: string;
}

export interface GetGeotextSearchParams extends CommonRequestParameters {
  query: string;
  source?: string[];
  region?: string[];
}
