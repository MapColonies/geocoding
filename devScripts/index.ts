import importDataToElastic from './importDataToElastic';

importDataToElastic()
  .then(() => console.log('Success import data to elastic'))
  .catch(console.error);
