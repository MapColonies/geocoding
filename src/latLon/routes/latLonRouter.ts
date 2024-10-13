import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { LatLonController } from '../controllers/latLonController';

const latLonRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(LatLonController);

  router.get('/coordinates', controller.getCoordinates);

  return router;
};

export const LAT_LON_ROUTER_SYMBOL = Symbol('latLonRouterFactory');

export { latLonRouterFactory };
