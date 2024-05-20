/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Client } from '@elastic/elasticsearch';
import config from '../config/test.json';
import data from './elasticsearchData.json';
import nlpData from './elasticNlpData.json';

const main = async (): Promise<void> => {
  let client = new Client({ node: config.db.elastic.searchy.node });

  for (const item of data) {
    await client.index({
      index: config.db.elastic.searchy.properties.index,
      id: item._id,
      body: item._source,
    });
  }

  client = new Client({ node: config.db.elastic.nlp.node });

  const indexExists = await client.indices.exists({ index: config.db.elastic.nlp.properties.index });
  if (!indexExists) {
    await client.indices.create({
      index: config.db.elastic.nlp.properties.index,
      body: {
        mappings: {
          properties: {
            geo_json: { type: 'geo_shape' },
          },
        },
      },
    });
  }

  for (const item of nlpData) {
    await client.index({
      index: config.db.elastic.nlp.properties.index,
      id: item._id,
      body: item._source,
    });
  }
};

export default main;
