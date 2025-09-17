import https from 'https';
import type { Feature, Geometry } from 'geojson';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { bbox } from '@turf/bbox';
import { StatusCodes } from 'http-status-codes';
import axios, { AxiosError, AxiosResponse as Response } from 'axios';
import { InternalServerError } from '../common/errors';
import { GenericGeocodingResponse, IApplication } from '../common/interfaces';
import { convertCamelToSnakeCase, ConvertSnakeToCamelCase } from '../common/utils';
import { GetGeotextSearchByCoordinatesParams, GetGeotextSearchParams, TextSearchParams } from './interfaces';
import { TextSearchHit } from './models/elasticsearchHits';
import { generateDisplayName } from './parsing';

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

/* istanbul ignore next */
export const fetchNLPService = async <T>(endpoint: string, requestData: object): Promise<{ data: T[]; latency: number }> => {
  let res: Response | null = null,
    data: T[] | undefined | null = null;
  let latency = 0;
  try {
    const startTime = Date.now();
    res = await axiosInstance.post(endpoint, requestData);
    latency = Date.now() - startTime;
  } catch (err: unknown) {
    throw new InternalServerError(`NLP analyser is not available - ${(err as AxiosError).message}`);
  }

  data = res?.data as T[] | undefined;

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (res?.status !== StatusCodes.OK || !data || data.length < 1 || !data[0]) {
    throw new InternalServerError(`NLP analyser unexpected response: ${JSON.stringify(data)}`);
  }

  return { data, latency };
};

/* eslint-disable @typescript-eslint/naming-convention */
export const convertResult = (
  inputParams: ConvertSnakeToCamelCase<GetGeotextSearchParams> | GetGeotextSearchByCoordinatesParams,
  extraParams: TextSearchParams | undefined,
  results: SearchResponse<TextSearchHit>,
  {
    sources,
    regionCollection,
    nameKeys,
    mainLanguageRegex,
    externalResourcesLatency,
  }: {
    sources?: IApplication['sources'];
    regionCollection?: IApplication['regions'];
    nameKeys: IApplication['nameTranslationsKeys'];
    mainLanguageRegex: IApplication['mainLanguageRegex'];
    externalResourcesLatency: {
      query: number;
      nlpAnalyser?: number;
      placeType?: number;
      hierarchies?: number;
    };
  }
): GenericGeocodingResponse<Feature> => {
  const geoJSONFeatureCollection: Omit<GenericGeocodingResponse<Feature>, 'bbox'> = {
    type: 'FeatureCollection',
    geocoding: {
      version: process.env.npm_package_version as string,
      query: convertCamelToSnakeCase(inputParams as object as Record<string, unknown>),
      response: {
        results_count: results.hits.hits.length,
        max_score: results.hits.max_score ?? 0,
        match_latency_ms: externalResourcesLatency.query,
        nlp_anlyser_latency_ms: externalResourcesLatency.nlpAnalyser,
        place_type_latency_ms: externalResourcesLatency.placeType,
        hierarchies_latency_ms: externalResourcesLatency.hierarchies,
        ...(extraParams
          ? {
              ...(extraParams.name && extraParams.name.trim() !== '' ? { name: extraParams.name } : {}),
              place_types: 'placeTypes' in extraParams ? extraParams.placeTypes : undefined,
              sub_place_types: 'subPlaceTypes' in extraParams ? extraParams.subPlaceTypes : undefined,
              hierarchies: 'hierarchies' in extraParams && extraParams.hierarchies.length ? extraParams.hierarchies : undefined,
            }
          : {}),
      },
    },
    features: results.hits.hits.map(({ _source: feature, _score: score, highlight }): GenericGeocodingResponse<Feature>['features'][number] => {
      const allNames = [feature!.text, feature?.translated_text ?? []];
      return {
        type: 'Feature',
        geometry: feature!.geo_json as Geometry,
        properties: {
          score,
          matches: [
            {
              layer: feature!.layer_name,
              source: sources?.[feature?.source ?? ''] ?? (feature?.source as string),
              source_id: feature?.source_id.map((id) => id.replace(/(^\{)|(\}$)/g, '')) ?? [],
            },
          ],
          names: {
            [nameKeys[0]]: new RegExp(mainLanguageRegex).test(feature!.text[0]) ? allNames.shift() : allNames.pop(),
            [nameKeys[1]]: allNames.pop(),
            ['default']: [feature!.name],
            display: generateDisplayName(highlight, extraParams, feature!, sources),
          },
          placetype: feature?.placetype, // TODO: check if to remove this
          sub_placetype: feature?.sub_placetype,
          regions: feature?.region.map((region) => ({
            region: region,
            sub_region_names: feature.sub_region.filter((sub_region) => regionCollection?.[region]?.includes(sub_region) ?? false),
          })),
        },
      };
    }),
  };
  return {
    ...geoJSONFeatureCollection,
    bbox: geoJSONFeatureCollection.features.length > 0 ? bbox(geoJSONFeatureCollection) : null,
  };
};
/* eslint-enable @typescript-eslint/naming-convention */
