import { RedisClientOptions } from 'redis';
import { type vectorGeocodingV2Type } from '@map-colonies/schemas';

export type BaseRedisConfig = vectorGeocodingV2Type['db']['redis'];

export type RedisConfig = BaseRedisConfig & RedisClientOptions;
