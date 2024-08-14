import { Feature } from 'geojson';
import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters, FeatureCollection } from '../common/interfaces';
import { ConvertSnakeToCamelCase } from '../common/utils';

export interface ControlResponse<T extends Feature> extends FeatureCollection<T> {
  geocoding?: {
    version?: string;
    query?: ConvertSnakeToCamelCase<CommonRequestParameters>;
    response: {
      /* eslint-disable @typescript-eslint/naming-convention */
      max_score: number;
      results_count: number;
      match_latency_ms: number;
      /* eslint-enable @typescript-eslint/naming-convention */
    };
  };
  features: (T & Pick<estypes.SearchHit<T>, '_score'>)[];
}
