import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { GeotextSearchController } from '../controllers/geotextSearchController';

const geotextSearchRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(GeotextSearchController);

  router.get('/regions', controller.getRegions);
  router.get('/', controller.getGeotextSearch);

  return router;
};

export const GEOTEXT_SEARCH_ROUTER_SYMBOL = Symbol('geotextSearchRouterFactory');

export { geotextSearchRouterFactory };
