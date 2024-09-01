import { Request, Response, NextFunction } from 'express';
import { SERVICES } from '../constants';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { RedisClient } from '../redis';
import * as crypto from 'node:crypto';
import { GeocodingResponse } from '../interfaces';

@injectable()
export class feedbackApiMiddlewareManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(SERVICES.REDIS) private readonly redis: RedisClient) {}

  saveResponses = async (req: Request, res: Response, next: NextFunction) => {
    const reqId = crypto.randomUUID();
    const redisClient = this.redis;
    const logger = this.logger;

    logger.info({ msg: 'saving response to redis' });
    let geocodingResponseDetails: GeocodingResponse = {
      userId: req.headers['x-user-id'] as string,
      response: JSON.parse('{}'),
      respondedAt: new Date(),
    };

    const originalJson = res.json;
    const logJson = async function (this: Response<any>, body: any): Promise<Response<any, Record<string, any>>> {
      //   console.log('Response:', body);
      geocodingResponseDetails.response = await body;

      try {
        await redisClient.setEx(reqId, 300, JSON.stringify(geocodingResponseDetails));
        logger.info({ msg: 'saving response to redis' });
      } catch (err) {
        logger.error('Error setting key:', err);
      }

      //await setKeyWithTTL(reqId, JSON.stringify(geocodingResponseDetails), redisClient);

      return originalJson.call(this, body);
    };
    res.json = logJson as unknown as Response['json'];
    next();
  };
}

async function setKeyWithTTL(key: string, value: string, redis: RedisClient) {
  try {
    await redis.set(key, value, {
      EX: 300, // 5 minutes in seconds
    });
    console.log(`Key '${key}' set with a TTL of 5 minutes.`);
  } catch (err) {
    console.error('Error setting key:', err);
  }
}
