import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { GeotextSearchController } from '../controllers/locationController';

const geotextSearchRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(GeotextSearchController);

  router.get('/query', controller.getGeotextSearch);
  router.get('/coordinates', controller.getGeotextSearchByCoordinates);
  router.get('/regions', controller.getRegions);
  router.get('/sources', controller.getSources);

  return router;
};

export const GEOTEXT_SEARCH_ROUTER_SYMBOL = Symbol('geotextSearchRouterFactory');

export { geotextSearchRouterFactory };
