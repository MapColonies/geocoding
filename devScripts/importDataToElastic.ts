/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import crypto from 'node:crypto';
import httpStatusCodes from 'http-status-codes';
import { Client, estypes } from '@elastic/elasticsearch';
import { ElasticControlClientConfig, ElasticGeotextClientConfig } from '../src/common/elastic/interfaces';
import { elasticConfigPath } from '../src/common/constants';
import { ConfigType } from '../src/common/config';
import controlData from './controlElasticsearchData.json';
import geotextData from './geotextElasticsearchData.json';

const main = async (config: ConfigType): Promise<void> => {
  const controlElasticConfig = config.get(`${elasticConfigPath}.control`) as ElasticControlClientConfig;
  const geotextElasticConfig = config.get(`${elasticConfigPath}.geotext`) as ElasticGeotextClientConfig;
  const controlClient = new Client({ ...controlElasticConfig });
  const geotextClient = new Client({ ...geotextElasticConfig });

  for (const { client, indices } of [
    {
      client: controlClient,
      indices: [controlElasticConfig.index] as string[],
    },
    {
      client: geotextClient,
      indices: Object.values(geotextElasticConfig.index as { [key: string]: string }),
    },
  ]) {
    for (const index of indices) {
      try {
        await client.indices.delete({ index });
      } catch (error) {
        if ((error as estypes.ErrorCause).meta.statusCode !== httpStatusCodes.NOT_FOUND) {
          throw error;
        }
        console.error(error);
      }
    }
  }

  for (const { client, index, key } of [
    {
      client: controlClient,
      index: controlElasticConfig.index as string,
      key: 'geometry',
    },
    {
      client: geotextClient,
      index: (geotextElasticConfig.index as { [key: string]: string }).geotext,
      key: 'geo_json',
    },
    {
      client: geotextClient,
      index: (geotextElasticConfig.index as { [key: string]: string }).hierarchies,
      key: 'geo_json',
    },
  ]) {
    await client.indices.create({
      index: index,
      body: {
        mappings: {
          properties: {
            [key]: {
              type: 'geo_shape',
            },
          },
        },
      },
    });
  }

  for (const item of controlData) {
    await controlClient.index({
      index: controlElasticConfig.index as string,
      id: crypto.randomUUID(),
      body: item._source,
    });
  }

  for (const item of geotextData) {
    await geotextClient.index({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      index: (geotextElasticConfig.index as { [key: string]: string })[item._index] as string,
      id: crypto.randomUUID(),
      body: {
        ...item._source,
      },
    });
  }
};

export default main;
