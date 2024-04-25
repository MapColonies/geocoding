/* eslint-disable @typescript-eslint/naming-convention */
export const boundingBox = (
  bbox: number[]
): {
  geo_bounding_box: {
    geometry: {
      top_left: {
        lon: number;
        lat: number;
      };
      bottom_right: {
        lon: number;
        lat: number;
      };
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

export const geoDistance = (params: {
  radius: number;
  lon: number;
  lat: number;
}): {
  geo_distance: {
    distance: string;
    geometry: {
      lon: number;
      lat: number;
    };
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
