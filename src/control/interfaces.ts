import { Feature, GeoJsonProperties } from 'geojson';
import { estypes } from '@elastic/elasticsearch';
import { CommonRequestParameters, FeatureCollection } from '../common/interfaces';
import { RemoveUnderscore } from '../common/utils';

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
  features: (T & {
    properties: RemoveUnderscore<Pick<estypes.SearchHit<T>, '_score'>> &
      GeoJsonProperties & {
        matches: {
          layer: string;
          source: string;
          // eslint-disable-next-line @typescript-eslint/naming-convention
          source_id: string[];
        }[];
        names: {
          [key: string]: string | string[] | undefined;
          display: string;
          default: string[];
        };
      };
  })[];
}
