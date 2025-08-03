import { RedisClientOptions } from 'redis';
import { type vectorGeocodingV1Type } from '@map-colonies/schemas';

export type BaseRedisConfig = vectorGeocodingV1Type['db']['redis'];

export type RedisConfig = BaseRedisConfig & RedisClientOptions;
