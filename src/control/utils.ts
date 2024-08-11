import { estypes } from '@elastic/elasticsearch';
import { parseGeo } from '../geotextSearch/utils';
import { GeoContext, GeoContextMode } from '../common/interfaces';
import { BadRequestError } from '../common/errors';
import { ELASTIC_KEYWORDS } from './constants';

export const geoContextQuery = (geoContext?: GeoContext, geoContextMode?: GeoContextMode): estypes.SearchRequest => {
  if (geoContext === undefined && geoContextMode === undefined) {
    return {};
  }
  if ((geoContext !== undefined && geoContextMode === undefined) || (geoContext === undefined && geoContextMode !== undefined)) {
    throw new BadRequestError('/control/tiles/queryForTiles: geo_context and geo_context_mode must be both defined or both undefined');
  }

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
