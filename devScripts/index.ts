import config from 'config';
import importDataToElastic from './importDataToElastic';
import importDataToS3 from './importDataToS3';

importDataToElastic(config)
  .then(() => console.log('Success import data to elastic'))
  .catch(console.error);

importDataToS3(config)
  .then(() => console.log('Success import data to s3'))
  .catch(console.error);
