import { readFileSync } from 'fs';
import { Logger } from '@map-colonies/js-logger';
import { createClient, RedisClientOptions } from 'redis';
import { DependencyContainer, FactoryFunction } from 'tsyringe';
import { SERVICES } from '../constants';
import { ConfigType } from '../config';
import { RedisConfig } from './interfaces';

const createConnectionOptions = (redisConfig: RedisConfig): Partial<RedisClientOptions> => {
  const { host, port, tls, ...clientOptions } = redisConfig;
  clientOptions.socket = { host, port };
  if (tls.enabled) {
    clientOptions.socket = {
      ...clientOptions.socket,
      tls: true,
      key: tls.key !== '' ? readFileSync(tls.key) : undefined,
      cert: tls.cert !== '' ? readFileSync(tls.cert) : undefined,
      ca: tls.ca !== '' ? readFileSync(tls.ca) : undefined,
    };
  }

  return clientOptions;
};

export type RedisClient = ReturnType<typeof createClient>;

export const redisClientFactory: FactoryFunction<RedisClient | undefined> = (container: DependencyContainer): RedisClient | undefined => {
  const logger = container.resolve<Logger>(SERVICES.LOGGER);
  const config = container.resolve<ConfigType>(SERVICES.CONFIG);
  const dbConfig = config.get('db.redis') as RedisConfig;
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
