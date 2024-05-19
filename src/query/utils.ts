import fetch, { Response } from 'node-fetch-commonjs';
import geojsonValidator from 'geojson-validation';
import { GeoJSON } from 'geojson';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { InternalServerError, BadRequestError } from '../common/errors';
import { BBOX_LENGTH, INDEX_NOT_FOUND, POINT_LENGTH, QueryResult, TextSearchParams } from './interfaces';
import { TextSearchHit } from './models/textSearchHit';

const FIND_QUOTES = /["']/g;

const FIND_SPECIAL = /[`!@#$%^&*()_\-+=|\\/,.<>:[\]{}\n\t\r\s;؛]+/g;

export const fetchNLPService = async <T>(endpoint: string, requestData: object): Promise<T[]> => {
  let res: Response | null = null,
    data: T[] | undefined | null = null;

  try {
    res = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new InternalServerError(err.message);
    }
    throw new InternalServerError('fetchNLPService: Unknown error' + JSON.stringify(err));
  }

  data = (await res.json()) as T[] | undefined;

  if (!res.ok || !data || data.length < 1 || !data[0]) {
    throw new InternalServerError(JSON.stringify(data));
  }
  return data;
};

export const cleanQuery = (query: string): string[] => query.replace(FIND_QUOTES, '').split(FIND_SPECIAL);

export const parsePoint = (split: string[]): GeoJSON => ({
  type: 'Point',
  coordinates: split.map(Number),
});

export const parseBbox = (split: string[]): GeoJSON => {
  const [xMin, yMin, xMax, yMax] = split.map(Number);
  return {
    type: 'Polygon',
    coordinates: [
      [
        [xMin, yMin],
        [xMin, yMax],
        [xMax, yMax],
        [xMax, yMin],
        [xMin, yMin],
      ],
    ],
  };
};

export const parseGeo = (input: string | GeoJSON): GeoJSON => {
  if (typeof input === 'string') {
    const splitted = input.split(',');
    const converted = splitted.map(Number);

    if (converted.findIndex((x) => isNaN(x)) < 0) {
      switch (splitted.length) {
        case POINT_LENGTH:
          // Point
          return parsePoint(splitted);
        case BBOX_LENGTH:
          //BBOX
          return parseBbox(splitted);
      }
    }
  }

  return input as GeoJSON;
};

/* eslint-disable @typescript-eslint/naming-convention */
export const convertResult = (params: TextSearchParams, results: SearchHit<TextSearchHit>[]): QueryResult => ({
  type: 'FeatureCollection',
  geocoding: {
    ...params,
  },
  features: results.map(({ highlight, _source: feature }, index) => ({
    type: 'Feature',
    geometry: feature?.geo_json,
    properties: {
      rank: index + 1,
      source: feature?.source, // TODO: check if to remove this
      layer: feature?.layer_name,
      source_id: feature?.source_id.map((id) => id.replace(/(^\{)|(\}$)/g, '')), // TODO: check if to remove this
      name: {
        default: feature?.name,
        primary: feature?.text,
        tranlated: feature?.tranlated_text,
      },
      highlight,
      placetype: feature?.placetype, // TODO: check if to remove this
      sub_placetype: feature?.sub_placetype,
      region: feature?.region,
      sub_region: feature?.sub_region,
    },
  })),
});
/* eslint-enable @typescript-eslint/naming-convention */
