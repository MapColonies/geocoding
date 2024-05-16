/* eslint-disable @typescript-eslint/naming-convention */
import { estypes } from '@elastic/elasticsearch';
import {
  formatResponse,
  additionalSearchProperties,
  convertUTMToWgs84,
  convertWgs84ToUTM,
  validateTile,
  validateWGS84Coordinate,
} from '../../../src/common/utils';
import config from '../../../config/test.json';
import { FIELDS } from '../../../src/common/constants';
import { WGS84Coordinate } from '../../../src/common/interfaces';
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

  it('should return additional search properties', () => {
    const size = 10;
    const result = additionalSearchProperties(size);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(result).toMatchObject({ size, index: config.db.elastic.searchy.properties.index as string, _source: FIELDS });
  });

  it('should convert UTM to WGS84', () => {
    const result = convertUTMToWgs84(630048, 4330433, 29);
    expect(result).toMatchObject({ lat: 39.11335578352079, lon: -7.495780486809503 });
  });

  it('should convert WGS84 to UTM', () => {
    const result = convertWgs84ToUTM(39.11335712352982, -7.495784527093747);
    expect(result).toMatchObject({ Easting: 630048, Northing: 4330433, ZoneNumber: 29 });
  });

  test.each([
    [{ tileName: 'BRN', subTileNumber: [10, 10, 10] }, true],
    [{ tileName: 'BRN', subTileNumber: [0, 10, 10] }, false],
    [{ tileName: 'BRN', subTileNumber: [10, 0, 10] }, false],
    [{ tileName: 'BRN', subTileNumber: [10, 10, 0] }, false],
    [{ tileName: 'BRN', subTileNumber: [10, 10, 100] }, false],
    [{ tileName: 'BRN', subTileNumber: [10, 10] }, false],
    [{ tileName: '', subTileNumber: [10, 10, 10] }, false],
  ])(`should validate tile`, (tile, expected) => {
    expect(validateTile(tile as never)).toBe(expected);
  });

  test.each<[WGS84Coordinate, boolean]>([
    [{ lon: 50, lat: 50 }, true],
    [{ lon: 190, lat: 50 }, false],
    [{ lon: 50, lat: 190 }, false],
    [{ lon: -10, lat: 50 }, false],
    [{ lon: 50, lat: -10 }, false],
  ])('should validate WGS84 coordinate', (coordinate, expected) => {
    expect(validateWGS84Coordinate(coordinate as never)).toBe(expected);
  });
});
