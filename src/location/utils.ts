import https from 'https';
import { Feature, Geometry } from 'geojson';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { StatusCodes } from 'http-status-codes';
import axios, { AxiosError, AxiosResponse as Response } from 'axios';
import { InternalServerError } from '../common/errors';
import { GenericGeocodingResponse, IApplication } from '../common/interfaces';
import { TextSearchParams } from './interfaces';
import { TextSearchHit } from './models/elasticsearchHits';
import { generateDisplayName } from './parsing';

const FIND_QUOTES = /["']/g;

const FIND_SPECIAL = /[`!@#$%^&*()_\-+=|\\/,.<>:[\]{}\n\t\r\s;؛]+/g;

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

export const fetchNLPService = async <T>(endpoint: string, requestData: object): Promise<T[]> => {
  let res: Response | null = null,
    data: T[] | undefined | null = null;
  try {
    res = await axiosInstance.post(endpoint, requestData);
  } catch (err: unknown) {
    throw new InternalServerError(`NLP analyser is not available - ${(err as AxiosError).message}`);
  }

  data = res?.data as T[] | undefined;

  if (res?.status !== StatusCodes.OK || !data || data.length < 1 || !data[0]) {
    throw new InternalServerError(`NLP analyser unexpected response: ${JSON.stringify(data)}`);
  }
  return data;
};

export const cleanQuery = (query: string): string[] => query.replace(FIND_QUOTES, '').split(FIND_SPECIAL);

/* eslint-disable @typescript-eslint/naming-convention */
export const convertResult = (
  params: TextSearchParams,
  results: SearchResponse<TextSearchHit>,
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
): GenericGeocodingResponse<Feature> => ({
  type: 'FeatureCollection',
  geocoding: {
    version: process.env.npm_package_version,
    query: {
      query: params.query,
      region: params.region,
      source: params.source,
      geo_context: params.geoContext,
      geo_context_mode: params.geoContextMode,
      disable_fuzziness: params.disableFuzziness,
      limit: params.limit,
    },
    response: {
      results_count: results.hits.hits.length,
      max_score: results.hits.max_score ?? 0,
      match_latency_ms: results.took,
      name: params.name ?? undefined,
      place_types: params.placeTypes,
      sub_place_types: params.subPlaceTypes,
      hierarchies: params.hierarchies,
    },
  },
  features: results.hits.hits.map(({ _source: feature, _score: score, highlight }, index): GenericGeocodingResponse<Feature>['features'][number] => {
    const allNames = [feature!.text, feature!.translated_text || []];
    return {
      type: 'Feature',
      geometry: feature!.geo_json as Geometry,
      properties: {
        score,
        matches: [
          {
            layer: feature!.layer_name,
            source: (sources ?? {})[feature?.source ?? ''] ?? feature?.source,
            source_id: feature?.source_id.map((id) => id.replace(/(^\{)|(\}$)/g, '')) ?? [],
          },
        ],
        names: {
          [nameKeys[0]]: new RegExp(mainLanguageRegex).test(feature!.text[0]) ? allNames.shift() : allNames.pop(),
          [nameKeys[1]]: allNames.pop(),
          ['default']: [feature!.name],
          display: highlight ? generateDisplayName(highlight, params.query.split(' ').length, params.name) : feature!.name,
        },
        placetype: feature?.placetype, // TODO: check if to remove this
        sub_placetype: feature?.sub_placetype,
        regions: feature?.region.map((region) => ({
          region: region,
          sub_region_names: feature.sub_region.filter((sub_region) => (regionCollection ?? {})[region ?? '']?.includes(sub_region)),
        })),
      },
    };
  }),
});
/* eslint-enable @typescript-eslint/naming-convention */
