// import fetch, { Response } from "node-fetch-commonjs";
import { GeoJSON } from 'geojson';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { StatusCodes } from 'http-status-codes';
import axios, { AxiosResponse as Response } from 'axios';
import { InternalServerError } from '../common/errors';
import { IApplication } from '../common/interfaces';
import { BBOX_LENGTH, POINT_LENGTH, QueryResult, TextSearchParams } from './interfaces';
import { generateDisplayName } from './parsing';
import { TextSearchHit } from './models/elasticsearchHits';

const FIND_QUOTES = /["']/g;

const FIND_SPECIAL = /[`!@#$%^&*()_\-+=|\\/,.<>:[\]{}\n\t\r\s;؛]+/g;

export const fetchNLPService = async <T>(endpoint: string, requestData: object): Promise<T[]> => {
  let res: Response | null = null,
    data: T[] | undefined | null = null;
  try {
    res = await axios.post(endpoint, requestData);
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      throw new InternalServerError(`NLP analyser is not available - ${err.message}`);
    }
    throw new InternalServerError('fetchNLPService: Unknown error' + JSON.stringify(err));
  }

  try {
    // data = (await res.json()) as T[] | undefined;
    data = res?.data as T[] | undefined;
  } catch (_) {
    throw new InternalServerError("Couldn't convert the response from NLP service to JSON");
  }

  if (res?.status !== StatusCodes.OK || !data || data.length < 1 || !data[0]) {
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

export const parseGeo = (input: string | GeoJSON): GeoJSON | undefined => {
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
        default:
          return undefined;
      }
    }
  }

  return input as GeoJSON;
};

/* eslint-disable @typescript-eslint/naming-convention */
export const convertResult = (
  params: TextSearchParams,
  results: SearchHit<TextSearchHit>[],
  {
    sources,
    regionCollection,
    nameKeys,
    mainLanguageRegex,
  }: {
    sources?: IApplication['sources'];
    regionCollection?: IApplication['regions'];
    nameKeys: IApplication['nameTranslationsKeys'];
    mainLanguageRegex: IApplication['mainLanguageRegex'];
  } = { nameKeys: [], mainLanguageRegex: '' }
): QueryResult => ({
  type: 'FeatureCollection',
  geocoding: {
    version: process.env.npm_package_version,
    query: {
      ...params,
    },
    name: params.name,
  },
  features: results.map(({ highlight, _source: feature }, index): QueryResult['features'][number] => {
    const allNames = [feature!.text, feature!.translated_text || []];
    return {
      type: 'Feature',
      geometry: feature?.geo_json,
      properties: {
        rank: index + 1,
        source: (sources ?? {})[feature?.source ?? ''] ?? feature?.source,
        layer: feature?.layer_name,
        source_id: feature?.source_id.map((id) => id.replace(/(^\{)|(\}$)/g, '')), // TODO: check if to remove this
        name: {
          [nameKeys[0]]: new RegExp(mainLanguageRegex).test(feature!.text[0]) ? allNames.shift() : allNames.pop(),
          [nameKeys[1]]: allNames.pop(),
          ['default']: [feature!.name],
          display: highlight ? generateDisplayName(highlight.text, params.query!.split(' ').length, params.name) : feature!.name,
        },
        highlight,
        placetype: feature?.placetype, // TODO: check if to remove this
        sub_placetype: feature?.sub_placetype,
        regions: feature?.region.map((region) => ({
          region: region,
          sub_regions: feature.sub_region.filter((sub_region) => (regionCollection ?? {})[region ?? '']?.includes(sub_region)),
        })),
        region: feature?.region,
        sub_region: feature?.sub_region,
      },
    };
  }),
});
/* eslint-enable @typescript-eslint/naming-convention */
