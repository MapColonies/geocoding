import { WGS84Coordinate } from '../interfaces';

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
