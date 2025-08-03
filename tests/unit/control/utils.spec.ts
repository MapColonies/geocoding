/* eslint-disable @typescript-eslint/naming-convention */
import { estypes } from '@elastic/elasticsearch';
import { initConfig, getConfig } from '../../../src/common/config';
import { additionalControlSearchProperties, convertCamelToSnakeCase } from '../../../src/control/utils';
import { elasticConfigPath } from '../../../src/common/constants';
import { ElasticControlClientConfig } from '../../../src/common/elastic/interfaces';
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
    void initConfig(true);
    const config = getConfig();
    const searchProperties = additionalControlSearchProperties(config, size);

    expect(searchProperties).toEqual<Pick<estypes.SearchRequest, 'size' | 'index' | '_source'>>({
      size,
      index: (config.get(`${elasticConfigPath}.control`) as ElasticControlClientConfig).index as string,
      _source: CONTROL_FIELDS,
    });
  });
});
