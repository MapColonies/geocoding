import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { ItemController } from '../controllers/itemController';

const itemRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(ItemController);

  router.get('/', controller.getItems);

  return router;
};

export const ITEM_ROUTER_SYMBOL = Symbol('itemRouterFactory');

export { itemRouterFactory };
