import * as crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { REDIS_TTL, SERVICES } from '../constants';
import { RedisClient } from '../redis';
import { GeocodingResponse } from '../interfaces';

@injectable()
export class FeedbackApiMiddlewareManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(SERVICES.REDIS) private readonly redis: RedisClient) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public saveResponses = (req: Request, res: Response, next: NextFunction) => {
    const reqId = crypto.randomUUID();
    const redisClient = this.redis;
    const logger = this.logger;

    logger.info({ msg: 'saving response to redis' });
    const geocodingResponseDetails: GeocodingResponse = {
      userId: req.headers['x-user-id'] as string,
      response: JSON.parse('{}') as JSON,
      respondedAt: new Date(),
    };

    const originalJson = res.json;
    const logJson = async function (this: Response, body: JSON): Promise<Response> {
      // console.log('Response:', body);
      geocodingResponseDetails.response = body;

      try {
        await redisClient.setEx(reqId, REDIS_TTL, JSON.stringify(geocodingResponseDetails));
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

// async function setKeyWithTTL(key: string, value: string, redis: RedisClient) {
//   try {
//     await redis.set(key, value, {
//       EX: 300, // 5 minutes in seconds
//     });
//     console.log(`Key '${key}' set with a TTL of 5 minutes.`);
//   } catch (err) {
//     console.error('Error setting key:', err);
//   }
// }
