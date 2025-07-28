import { RedisClientOptions } from 'redis';

export type RedisConfig = {
  host: string;
  port: number;
  enableSslAuth: boolean;
  sslPaths: { ca: string; cert: string; key: string };
  ttl: number;
} & RedisClientOptions;
