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
    this.logger.info({ msg: 'saving response to redis' });
    const reqId = crypto.randomUUID();
    const redisClient = this.redis

    // let response: JSON = JSON.parse('{}');
    let geocodingResponseDetails: GeocodingResponse = {
      userId: req.headers['x-user-id'] as string,
      response: JSON.parse('{}'),
      respondedAt: new Date(),
    };

    const originalJson = res.json;
    const logJson = async function (this: Response<any>, body: any): Promise<Response<any, Record<string, any>>> {
      console.log('Response:', body);
      //   response = await body;
      geocodingResponseDetails.response = await body;
      await redisClient.set(reqId, JSON.stringify(geocodingResponseDetails));

      return originalJson.call(this, body);
    };

    res.json = logJson as unknown as Response['json'];
    next();
  };
}
