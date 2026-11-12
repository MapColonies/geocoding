import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { SmartQueryController } from '../controllers/smartQueryController';

const smartQueryRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(SmartQueryController);

  router.get('/query', controller.getSmartQuery);

  return router;
};

export const SMART_QUERY_ROUTER_SYMBOL = Symbol('smartQueryRouterFactory');

export { smartQueryRouterFactory };
