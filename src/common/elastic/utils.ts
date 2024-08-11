import { estypes } from '@elastic/elasticsearch';
import { IConfig, WGS84Coordinate } from '../interfaces';
import { InternalServerError } from '../errors';
import { elasticConfigPath, CONTROL_FIELDS } from '../constants';
import { ElasticDbClientsConfig } from './interfaces';
import { ElasticClient } from './index';

/* eslint-disable @typescript-eslint/naming-convention */
export const additionalControlSearchProperties = (config: IConfig, size: number): { size: number; index: string; _source: string[] } => ({
  size,
  index: config.get<ElasticDbClientsConfig>(elasticConfigPath).control.properties.index as string,
  _source: CONTROL_FIELDS,
});
/* eslint-enable @typescript-eslint/naming-convention */

export const queryElastic = async <T>(client: ElasticClient, body: estypes.SearchRequest): Promise<estypes.SearchResponse<T>> => {
  const clientNotAvailableError = new InternalServerError('Elasticsearch client is not available');
  try {
    if (!(await client.ping())) {
      throw clientNotAvailableError;
    }
  } catch (error) {
    throw clientNotAvailableError;
  }

  return client.search<T>(body);
};

/* eslint-disable @typescript-eslint/naming-convention */
export const boundingBox = (
  bbox: number[]
): {
  geo_bounding_box: {
    geometry: {
      top_left: WGS84Coordinate;
      bottom_right: WGS84Coordinate;
    };
  };
} => ({
  geo_bounding_box: {
    geometry: {
      top_left: {
        lon: bbox[0],
        lat: bbox[3],
      },
      bottom_right: {
        lon: bbox[2],
        lat: bbox[1],
      },
    },
  },
});

export const geoDistance = (
  params: WGS84Coordinate & { radius: number }
): {
  geo_distance: {
    distance: string;
    geometry: WGS84Coordinate;
  };
} => ({
  geo_distance: {
    distance: `${params.radius}m`,
    geometry: {
      lon: params.lon,
      lat: params.lat,
    },
  },
});
