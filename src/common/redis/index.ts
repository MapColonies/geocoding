import { readFileSync } from 'fs';
import { Logger } from '@map-colonies/js-logger';
import { createClient, RedisClientOptions } from 'redis';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { redisConfigPath, SERVICES } from '../constants';
import { ConfigType } from '../config';
import { RedisConfig } from './interfaces';

const createConnectionOptions = (redisConfig: RedisConfig): Partial<RedisClientOptions> => {
  const { host, port, tls, ...clientOptions } = redisConfig;
  clientOptions.socket = { host, port };
  if (tls.enabled) {
    try {
      clientOptions.socket = {
        ...clientOptions.socket,
        tls: true,
        key: readFileSync(tls.key),
        cert: readFileSync(tls.cert),
        ca: readFileSync(tls.ca),
      };
    } catch (error) {
      throw new Error(`Failed to load Redis SSL certificates. Ensure the files exist and are accessible. Details: ${(error as Error).message}`);
    }
  }

  return clientOptions;
};

export type RedisClient = ReturnType<typeof createClient>;

export const redisClientFactory: FactoryFunction<RedisClient | undefined> = (container: DependencyContainer): RedisClient | undefined => {
  const logger = container.resolve<Logger>(SERVICES.LOGGER);
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
  const dbConfig = config.get(redisConfigPath) as RedisConfig;
  const connectionOptions = createConnectionOptions(dbConfig);
  try {
    const redisClient = createClient(connectionOptions)
      // .on('error', (error: Error) => logger.error({ msg: 'redis client errored', err: error }))
      // .on('reconnecting', (...args) => logger.warn({ msg: 'redis client reconnecting', ...args }))
      .on('end', (...args) => logger.info({ msg: 'redis client end', ...args }))
      .on('connect', (...args) => logger.debug({ msg: 'redis client connected', ...args }))
      .on('ready', (...args) => logger.debug({ msg: 'redis client is ready', ...args }));
    return redisClient;
  } catch (error) {
    logger.error({ msg: 'Connection to Redis was unsuccessful', error });
  }
};
