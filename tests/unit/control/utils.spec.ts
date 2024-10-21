/* eslint-disable @typescript-eslint/naming-convention */
import config from 'config';
import { estypes } from '@elastic/elasticsearch';
import { additionalControlSearchProperties, convertCamelToSnakeCase } from '../../../src/control/utils';
import { elasticConfigPath } from '../../../src/common/constants';
import { ElasticDbClientsConfig } from '../../../src/common/elastic/interfaces';
import { CONTROL_FIELDS } from '../../../src/control/constants';

describe('#convertCamelToSnakeCase', () => {
  it('should convert camel case to snake case', () => {
    const camelCase = {
      camelCaseKey: 'value',
      anotherCamelCaseKey: 'anotherValue',
    };

    const snakeCase = {
      camel_case_key: 'value',
      another_camel_case_key: 'anotherValue',
    };

    expect(convertCamelToSnakeCase(camelCase)).toEqual(snakeCase);
  });
});

describe('#additionalControlSearchProperties', () => {
  it('should return additional control search properties', () => {
    const size = 5;
    const searchProperties = additionalControlSearchProperties(config, size);

    expect(searchProperties).toEqual<Pick<estypes.SearchRequest, 'size' | 'index' | '_source'>>({
      size,
      index: config.get<ElasticDbClientsConfig>(elasticConfigPath).control.properties.index as string,
      _source: CONTROL_FIELDS,
    });
  });
});
