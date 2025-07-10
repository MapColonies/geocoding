import { getConfig } from '../src/common/config';
import importDataToElastic from './importDataToElastic';
import importDataToS3 from './importDataToS3';

const config = getConfig();

importDataToElastic(config)
  .then(() => console.log('Success import data to elastic'))
  .catch(console.error);

importDataToS3(config)
  .then(() => console.log('Success import data to s3'))
  .catch(console.error);
