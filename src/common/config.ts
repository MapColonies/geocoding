import { type ConfigInstance, config } from '@map-colonies/config';
import { commonBoilerplateV2, type commonBoilerplateV2Type } from '@map-colonies/schemas';
import { ElasticDbClientsConfig } from './elastic/interfaces';
import { S3Config } from './s3';
import { RedisConfig } from './redis/interfaces';
import { IApplication } from './interfaces';

// Choose here the type of the config instance and import this type from the entire application
type ConfigType = ConfigInstance<
  commonBoilerplateV2Type & { elastic?: ElasticDbClientsConfig; s3?: S3Config; redis?: RedisConfig; application?: IApplication }
>;

let configInstance: ConfigType | undefined;

/**
 * Initializes the configuration by fetching it from the server.
 * This should only be called from the instrumentation file.
 * @returns A Promise that resolves when the configuration is successfully initialized.
 */
async function initConfig(offlineMode?: boolean): Promise<void> {
  configInstance = await config({
    schema: commonBoilerplateV2,
    offlineMode: offlineMode,
  });
}

function getConfig(): ConfigType {
  if (!configInstance) {
    throw new Error('config not initialized');
  }
  return configInstance;
}

export { getConfig, initConfig, ConfigType };
