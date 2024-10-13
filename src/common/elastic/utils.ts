import { estypes } from '@elastic/elasticsearch';
import { BBox } from 'geojson';
import { WGS84Coordinate } from '../interfaces';
import { ServiceUnavailableError } from '../errors';
import { ElasticClient } from './index';

export const queryElastic = async <T>(client: ElasticClient, body: estypes.SearchRequest): Promise<estypes.SearchResponse<T>> => {
  const clientNotAvailableError = new ServiceUnavailableError(
    'Elasticsearch client is not available. As for, the search request cannot be executed.'
  );
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
  bbox: BBox
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
