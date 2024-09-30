/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Client } from '@elastic/elasticsearch';
import config from '../config/default.json';
import controlData from './controlElasticsearchData.json';
import geotextData from './geotextElasticsearchData.json';

const main = async (): Promise<void> => {
  const controlClient = new Client({ ...config.db.elastic.control });
  const geotextClient = new Client({ ...config.db.elastic.geotext });

  for (const item of controlData) {
    await controlClient.index({
      index: config.db.elastic.control.properties.index,
      id: item._id,
      body: item._source,
    });
  }

  for (const item of geotextData) {
    await geotextClient.index({
      index: item._index,
      id: item._id,
      body: {
        ...item._source,
      },
    });
  }
};

export default main;
