/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/naming-convention */
import { estypes } from '@elastic/elasticsearch';
import { bbox } from '@turf/bbox';
import { CommonRequestParameters, GenericGeocodingResponse, IApplication, IConfig } from '../common/interfaces';
import { elasticConfigPath } from '../common/constants';
import { ElasticDbClientsConfig } from '../common/elastic/interfaces';
import { Item } from '../control/item/models/item';
import { Tile } from '../control/tile/models/tile';
import { Route } from '../control/route/models/route';
import { ConvertSnakeToCamelCase } from '../common/utils';
import { CONTROL_FIELDS } from './constants';

const LAST_ELEMENT_INDEX = -1;

const generateDisplayName = <T extends Tile | Item | Route>(
  source: T,
  displayNamePrefixes: IApplication['controlObjectDisplayNamePrefixes']
): (string | undefined)[] => {
  const sourceType =
    source.properties.TYPE === 'ITEM' && (source as Item).properties.TIED_TO !== undefined ? 'CONTROL_POINT' : source.properties.TYPE;

  const name: (string | undefined)[] = [];
  sourceType === 'TILE' && name.unshift((source as Tile).properties.TILE_NAME);
  sourceType === 'SUB_TILE' && name.unshift((source as Tile).properties.SUB_TILE_ID);
  sourceType === 'ITEM' && name.unshift((source as Item).properties.OBJECT_COMMAND_NAME);
  sourceType === 'ROUTE' && name.unshift((source as Route).properties.OBJECT_COMMAND_NAME);
  sourceType === 'CONTROL_POINT' && name.unshift((source as Item).properties.OBJECT_COMMAND_NAME);

  name.unshift(displayNamePrefixes[sourceType]);

  if (sourceType === 'SUB_TILE') {
    name.unshift((source as Tile).properties.TILE_NAME);
    name.unshift(displayNamePrefixes['TILE']);
  }

  if (sourceType === 'CONTROL_POINT') {
    name.unshift((source as Item).properties.TIED_TO);
    name.unshift(displayNamePrefixes['ROUTE']);
  }

  return name;
};

export const convertCamelToSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
  const snakeCaseObj: Record<string, any> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeCaseKey = key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
      snakeCaseObj[snakeCaseKey] = obj[key];
    }
  }
  return snakeCaseObj;
};

export const formatResponse = <T extends Tile | Item | Route>(
  elasticResponse: estypes.SearchResponse<T>,
  requestParams: CommonRequestParameters | ConvertSnakeToCamelCase<CommonRequestParameters>,
  displayNamePrefixes: IApplication['controlObjectDisplayNamePrefixes']
): GenericGeocodingResponse<T> => {
  const geoJSONFeatureCollection: Omit<GenericGeocodingResponse<T>, 'bbox'> = {
    type: 'FeatureCollection',
    geocoding: {
      version: process.env.npm_package_version as string,
      query: convertCamelToSnakeCase(requestParams as Record<string, unknown>),
      response: {
        results_count: elasticResponse.hits.hits.length,
        max_score: elasticResponse.hits.max_score ?? 0,
        match_latency_ms: elasticResponse.took,
      },
    },
    features: [
      ...(elasticResponse.hits.hits.map(({ _source: source, _score: score, _index: index }) => {
        if (source !== undefined) {
          const generatedDisplayName = generateDisplayName(source, displayNamePrefixes);
          return {
            ...source,
            properties: {
              ...source.properties,
              matches: [
                {
                  layer: source.properties.LAYER_NAME,
                  source: index,
                  source_id: [],
                },
              ],
              names: {
                default: [generatedDisplayName.at(LAST_ELEMENT_INDEX)],
                display: generatedDisplayName.join(' '),
              },
              score,
              regions: (source.properties.regions ?? []).map(({ region, sub_region_names }) => ({
                region,
                sub_region_names: sub_region_names ?? [],
              })),
            },
          };
        }
      }) as GenericGeocodingResponse<T>['features']),
    ],
  };
  return { ...geoJSONFeatureCollection, bbox: bbox(geoJSONFeatureCollection) };
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const additionalControlSearchProperties = (config: IConfig, size: number): Pick<estypes.SearchRequest, 'size' | 'index' | '_source'> => ({
  size,
  index: config.get<ElasticDbClientsConfig>(elasticConfigPath).control.properties.index as string,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _source: CONTROL_FIELDS,
});
