import * as crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@map-colonies/js-logger';
import { inject, injectable } from 'tsyringe';
import { SERVICES, siteConfig } from '../constants';
import { RedisClient } from '../redis';
import { FeebackApiGeocodingResponse, IConfig } from '../interfaces';
import { XApi } from './utils';

const REDIS_TTL = 300;

@injectable()
export class FeedbackApiMiddlewareManager {
  public constructor(
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(SERVICES.REDIS) private readonly redis: RedisClient,
    @inject(SERVICES.CONFIG) private readonly config: IConfig
  ) {}

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public saveResponses = (req: Request, res: Response, next: NextFunction) => {
    const reqId = res.getHeader(XApi.REQUEST);
    const redisClient = this.redis;
    const logger = this.logger;

    const drSite = this.config.get<string>(siteConfig);

    logger.info({ msg: 'saving response to redis' });
    const geocodingResponseDetails: FeebackApiGeocodingResponse = {
      userId: req.headers[XApi.USER] as string,
      apiKey: req.headers[XApi.KEY] as string,
      site: drSite,
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
        .catch((error: Error) => logger.error({ msg: 'Error setting key:', error }));

      return originalJson.call(this, body);
    };
    res.json = logJson;
    next();
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public setRequestId = (req: Request, res: Response, next: NextFunction) => {
    const reqId = crypto.randomUUID();
    res.append(XApi.REQUEST, reqId);
    next();
  };
}
