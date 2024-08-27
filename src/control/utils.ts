/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/naming-convention */
import { estypes } from '@elastic/elasticsearch';
import { parseGeo } from '../location/utils';
import { CommonRequestParameters, GeoContext, GeoContextMode, IApplication, IConfig } from '../common/interfaces';
import { BadRequestError } from '../common/errors';
import { elasticConfigPath } from '../common/constants';
import { ElasticDbClientsConfig } from '../common/elastic/interfaces';
import { Item } from '../control/item/models/item';
import { Tile } from '../control/tile/models/tile';
import { Route } from '../control/route/models/route';
import { ConvertSnakeToCamelCase } from '../common/utils';
import { BBOX_LENGTH } from '../location/interfaces';
import { CONTROL_FIELDS, ELASTIC_KEYWORDS } from './constants';
import { ControlResponse } from './interfaces';

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
): ControlResponse<T> => ({
  type: 'FeatureCollection',
  geocoding: {
    version: process.env.npm_package_version,
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
            name: {
              default: [generatedDisplayName.at(LAST_ELEMENT_INDEX)],
              display: generatedDisplayName.join(' '),
            },
          },
          score,
        };
      }
    }) as ControlResponse<T>['features']),
  ],
});

export const geoContextQuery = (
  geoContext?: GeoContext,
  geoContextMode?: GeoContextMode
): { [key in 'filter' | 'should']?: estypes.QueryDslQueryContainer[] } => {
  if (geoContext === undefined && geoContextMode === undefined) {
    return {};
  }
  if ((geoContext !== undefined && geoContextMode === undefined) || (geoContext === undefined && geoContextMode !== undefined)) {
    throw new BadRequestError('/control/utils/geoContextQuery: geo_context and geo_context_mode must be both defined or both undefined');
  }

  validateGeoContext(geoContext!);

  return {
    [geoContextMode === GeoContextMode.FILTER ? 'filter' : 'should']: [
      {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        geo_shape: {
          [ELASTIC_KEYWORDS.geometry]: {
            shape: parseGeo(geoContext!),
          },
          boost: geoContextMode === GeoContextMode.BIAS ? 1.1 : 1, //TODO: change magic number
        },
      },
    ],
  };
};

export const validateGeoContext = (geoContext: GeoContext): boolean => {
  //TODO: Add validation for possible values

  const messagePrefix = 'geo_context validation: ';

  const validPairs = [['bbox'], ['lat', 'lon', 'radius'], ['x', 'y', 'zone', 'radius']];

  if (geoContext.bbox !== undefined && geoContext.bbox.length !== BBOX_LENGTH) {
    throw new BadRequestError(messagePrefix + 'bbox must contain 4 values');
  }

  if (
    !validPairs.some(
      (pair) => pair.every((key) => geoContext[key as keyof GeoContext] !== undefined) && Object.keys(geoContext).length === pair.length
    )
  ) {
    throw new BadRequestError(messagePrefix + 'geo_context must contain one of the following: {bbox}, {lat, lon, radius}, or {x, y, zone, radius}');
  }

  return true;
};

// eslint-disable-next-line @typescript-eslint/naming-convention
export const additionalControlSearchProperties = (config: IConfig, size: number): Pick<estypes.SearchRequest, 'size' | 'index' | '_source'> => ({
  size,
  index: config.get<ElasticDbClientsConfig>(elasticConfigPath).control.properties.index as string,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _source: CONTROL_FIELDS,
});
