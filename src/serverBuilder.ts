import express, { Router } from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import { OpenapiViewerRouter, OpenapiRouterConfig } from '@map-colonies/openapi-express-viewer';
import { getErrorHandlerMiddleware } from '@map-colonies/error-express-handler';
import { middleware as OpenApiMiddleware } from 'express-openapi-validator';
import { inject, injectable } from 'tsyringe';
import { Logger } from '@map-colonies/js-logger';
import httpLogger from '@map-colonies/express-access-log-middleware';
import { defaultMetricsMiddleware, getTraceContexHeaderMiddleware } from '@map-colonies/telemetry';
import { SERVICES } from './common/constants';
import { IConfig } from './common/interfaces';
import { TILE_ROUTER_SYMBOL } from './control/tile/routes/tileRouter';
import { ITEM_ROUTER_SYMBOL } from './control/item/routes/itemRouter';
import { ROUTE_ROUTER_SYMBOL } from './control/route/routes/routeRouter';
import { LAT_LON_ROUTER_SYMBOL } from './latLon/routes/latLonRouter';
import { GEOTEXT_SEARCH_ROUTER_SYMBOL } from './location/routes/locationRouter';
import { cronLoadTileLatLonDataSymbol } from './latLon/DAL/latLonDAL';

@injectable()
export class ServerBuilder {
  private readonly serverInstance: express.Application;

  public constructor(
    @inject(SERVICES.CONFIG) private readonly config: IConfig,
    @inject(SERVICES.LOGGER) private readonly logger: Logger,
    @inject(TILE_ROUTER_SYMBOL) private readonly tileRouter: Router,
    @inject(ITEM_ROUTER_SYMBOL) private readonly itemRouter: Router,
    @inject(ROUTE_ROUTER_SYMBOL) private readonly routeRouter: Router,
    @inject(LAT_LON_ROUTER_SYMBOL) private readonly latLonRouter: Router,
    @inject(GEOTEXT_SEARCH_ROUTER_SYMBOL) private readonly geotextRouter: Router,
    @inject(cronLoadTileLatLonDataSymbol) private readonly cronLoadTileLatLonData: void
  ) {
    this.serverInstance = express();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.cronLoadTileLatLonData;
  }

  public build(): express.Application {
    this.registerPreRoutesMiddleware();
    this.buildDocsRoutes();
    this.buildRoutes();
    this.registerPostRoutesMiddleware();

    return this.serverInstance;
  }

  private buildDocsRoutes(): void {
    const openapiRouter = new OpenapiViewerRouter({
      ...this.config.get<OpenapiRouterConfig>('openapiConfig'),
      filePathOrSpec: this.config.get<string>('openapiConfig.filePath'),
    });
    openapiRouter.setup();
    this.serverInstance.use(this.config.get<string>('openapiConfig.basePath'), openapiRouter.getRouter());
  }

  private buildRoutes(): void {
    const router = Router();
    router.use('/location', this.geotextRouter);
    router.use('/control', this.buildControlRoutes());

    this.serverInstance.use('/search/', router);
    this.serverInstance.use('/lookup', this.latLonRouter);
  }

  private buildControlRoutes(): Router {
    const router = Router();

    router.use('/tiles', this.tileRouter);
    router.use('/items', this.itemRouter);
    router.use('/routes', this.routeRouter);

    return router;
  }

  private registerPreRoutesMiddleware(): void {
    this.serverInstance.use('/metrics', defaultMetricsMiddleware());
    this.serverInstance.use(httpLogger({ logger: this.logger, ignorePaths: ['/metrics'] }));

    if (this.config.get<boolean>('server.response.compression.enabled')) {
      this.serverInstance.use(compression(this.config.get<compression.CompressionFilter>('server.response.compression.options')));
    }

    this.serverInstance.use(bodyParser.json(this.config.get<bodyParser.Options>('server.request.payload')));
    this.serverInstance.use(bodyParser.urlencoded({ limit: this.config.get<string>('server.request.payload.limit'), extended: true }));
    this.serverInstance.use(getTraceContexHeaderMiddleware());

    const ignorePathRegex = new RegExp(`^${this.config.get<string>('openapiConfig.basePath')}/.*`, 'i');
    const apiSpecPath = this.config.get<string>('openapiConfig.filePath');
    this.serverInstance.use(OpenApiMiddleware({ apiSpec: apiSpecPath, validateRequests: true, ignorePaths: ignorePathRegex }));
    this.serverInstance.disable('x-powered-by');
  }

  private registerPostRoutesMiddleware(): void {
    this.serverInstance.use(getErrorHandlerMiddleware());
  }
}
