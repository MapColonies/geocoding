import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { MgrsController } from '../controllers/mgrsController';

const mgrsRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(MgrsController);

  router.get('/tiles', controller.getTile);

  return router;
};

export const MGRS_ROUTER_SYMBOL = Symbol('mgrsRouterFactory');

export { mgrsRouterFactory };
