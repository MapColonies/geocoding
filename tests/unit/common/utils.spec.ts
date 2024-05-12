import { estypes } from '@elastic/elasticsearch';
import {
  formatResponse,
  additionalSearchProperties,
  convertUTMToWgs84,
  convertWgs84ToUTM,
  validateTile,
  validateWGS84Coordinate,
} from '../../../src/common/utils';
import {
  itemElasticResponse,
  itemExpectedFormattedResponse,
  tileElasticResponse,
  tileExpectedFormattedResponse,
  subTileElasticResponse,
  subTileExpectedFormattedResponse,
  routeElasticResponse,
  routeExpectedFormattedResponse,
} from './objects';

describe('utils', () => {
  test.each([
    [itemElasticResponse, itemExpectedFormattedResponse],
    [tileElasticResponse, tileExpectedFormattedResponse],
    [subTileElasticResponse, subTileExpectedFormattedResponse],
    [routeElasticResponse, routeExpectedFormattedResponse],
  ])('should convert ElasticSearch query response to FeatureCollection', (elasticResponse, formattedResponse) => {
    const result = formatResponse(elasticResponse as estypes.SearchResponse<never>);
    expect(result).toMatchObject(formattedResponse);
  });
});
