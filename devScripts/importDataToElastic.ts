/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import crypto from 'node:crypto';
import httpStatusCodes from 'http-status-codes';
import { Client, estypes } from '@elastic/elasticsearch';
import { ElasticDbClientsConfig } from '../src/common/elastic/interfaces';
import { elasticConfigPath } from '../src/common/constants';
import { IConfig } from '../src/common/interfaces';
import controlData from './controlElasticsearchData.json';
import geotextData from './geotextElasticsearchData.json';

const main = async (config: IConfig): Promise<void> => {
  const elasticConfig = config.get<ElasticDbClientsConfig>(elasticConfigPath);
  const controlClient = new Client({ ...elasticConfig.control });
  const geotextClient = new Client({ ...elasticConfig.geotext });

  for (const { client, indices } of [
    {
      client: controlClient,
      indices: [elasticConfig.control.properties.index] as string[],
    },
    {
      client: geotextClient,
      indices: Object.values(elasticConfig.geotext.properties.index as { [key: string]: string }),
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
      index: elasticConfig.control.properties.index as string,
      key: 'geometry',
    },
    {
      client: geotextClient,
      index: (elasticConfig.geotext.properties.index as { [key: string]: string }).geotext,
      key: 'geo_json',
    },
    {
      client: geotextClient,
      index: (elasticConfig.geotext.properties.index as { [key: string]: string }).hierarchies,
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
      index: elasticConfig.control.properties.index as string,
      id: crypto.randomUUID(),
      body: item._source,
    });
  }

  for (const item of geotextData) {
    await geotextClient.index({
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      index: (elasticConfig.geotext.properties.index as { [key: string]: string })[item._index] as string,
      id: crypto.randomUUID(),
      body: {
        ...item._source,
      },
    });
  }
};

export default main;
