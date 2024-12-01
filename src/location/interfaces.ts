import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters } from '../common/interfaces';
import { ConvertSnakeToCamelCase } from '../common/utils';
import { HierarchySearchHit } from './models/elasticsearchHits';

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
}

export interface GetGeotextSearchParams extends CommonRequestParameters {
  query: string;
  source?: string[];
  region?: string[];
}

export interface GetGeotextSearchByCoordinatesParams extends Pick<CommonRequestParameters, 'limit'> {
  lat: number;
  lon: number;
  source?: string[];
  relation: Exclude<estypes.GeoShapeRelation, 'within'>;
}
