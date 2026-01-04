import { config } from '@map-colonies/config';
import { vectorGeocodingV2 } from '@map-colonies/schemas';
import importDataToElastic from './importDataToElastic';
import importDataToS3 from './importDataToS3';
import { ConfigType } from '../src/common/config';

async function main() {
  const configInstance: ConfigType = await config({
    schema: vectorGeocodingV2,
    offlineMode: true,
  });

  importDataToElastic(configInstance)
    .then(() => console.log('Success import data to elastic'))
    .catch(console.error);

  importDataToS3(configInstance)
    .then(() => console.log('Success import data to s3'))
    .catch(console.error);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
