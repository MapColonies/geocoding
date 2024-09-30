import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { LatLonController } from '../controllers/latLonController';

const latLonRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(LatLonController);

  router.get('/latlonToTile', controller.latlonToTile);
  router.get('/tileToLatLon', controller.tileToLatLon);
  router.get('/latlonToMgrs', controller.latlonToMgrs);
  router.get('/mgrsToLatlon', controller.mgrsToLatlon);

  return router;
};

export const LAT_LON_ROUTER_SYMBOL = Symbol('latLonRouterFactory');

export { latLonRouterFactory };
