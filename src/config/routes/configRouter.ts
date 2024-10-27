import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { ConfigController } from '../controllers/configController';

const configRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(ConfigController);

  router.get('/control/table', controller.getControlTable);

  return router;
};

export const CONFIG_ROUTER_SYMBOL = Symbol('configRouterFactory');

export { configRouterFactory };
