import importDataToElastic from './importDataToElastic';
import importToPostgres from './importToPostgres';

importDataToElastic()
  .then(() => console.log('Success import data to elastic'))
  .catch(console.error);

importToPostgres()
  .then(() => console.log('Success import data to postgres'))
  .catch(console.error);
