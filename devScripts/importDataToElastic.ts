/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Client } from '@elastic/elasticsearch';
import config from '../config/test.json';
import data from './elasticsearchData.json';

const main = async (): Promise<void> => {
  const client = new Client({ node: config.db.elastic.searchy.node as string });

  for (const item of data) {
    await client.index({
      index: config.db.elastic.searchy.properties.index as string,
      id: item._id,
      body: item._source,
    });
  }
};

export default main;
