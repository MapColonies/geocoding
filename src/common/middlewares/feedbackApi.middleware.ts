import * as crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { REDIS_TTL, SERVICES } from '../constants';
import { RedisClient } from '../redis';
import { GeocodingResponse } from '../interfaces';

const siteIndex = 1;

@injectable()
export class FeedbackApiMiddlewareManager {
  public constructor(@inject(SERVICES.LOGGER) private readonly logger: Logger, @inject(SERVICES.REDIS) private readonly redis: RedisClient) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public saveResponses = (req: Request, res: Response, next: NextFunction) => {
    const reqId = res.getHeader('x-request-id');
    const redisClient = this.redis;
    const logger = this.logger;

    const s3Endpoint = ''; //s3 endpoint from default
    const drSite = s3Endpoint.split('.');

    logger.info({ msg: 'saving response to redis' });
    const geocodingResponseDetails: GeocodingResponse = {
      userId: req.headers['x-user-id'] as string,
      apiKey: req.headers['x-api-key'] as string,
      site: drSite[siteIndex],
      response: JSON.parse('{}') as JSON,
      respondedAt: new Date(),
    };

    const originalJson = res.json;
    const logJson = function (this: Response, body: JSON): Response {
      geocodingResponseDetails.response = body;
      redisClient
        .setEx(reqId as string, REDIS_TTL, JSON.stringify(geocodingResponseDetails))
        .then(() => {
          logger.info({ msg: `response ${reqId?.toString() ?? ''} saved to redis` });
        })
        .catch((error) => logger.error('Error setting key:', error));

      return originalJson.call(this, body);
    };
    res.json = logJson;
    next();
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public setRequestId = (req: Request, res: Response, next: NextFunction) => {
    const reqId = crypto.randomUUID();
    res.append('x-request-id', reqId);
    next();
  };
}
