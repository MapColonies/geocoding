import { Feature } from 'geojson';
import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters, FeatureCollection } from '../common/interfaces';

export interface ControlResponse<T extends Feature, G = any> extends FeatureCollection<T> {
  geocoding?: {
    version?: string;
    query?: G & CommonRequestParameters;
    response: Pick<estypes.SearchHitsMetadata, 'max_score'> & {
      /* eslint-disable @typescript-eslint/naming-convention */
      results_count?: estypes.SearchHitsMetadata['total'];
      match_latency_ms?: estypes.SearchResponse['took'];
      /* eslint-enable @typescript-eslint/naming-convention */
    };
  };
  features: (T & Pick<estypes.SearchHit<T>, '_score'>)[];
}
