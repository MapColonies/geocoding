import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { TileController } from '../controllers/tileController';

const tileRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(TileController);

  router.get('/', controller.getTiles);

  return router;
};

export const TILE_ROUTER_SYMBOL = Symbol('tileRouterFactory');

export { tileRouterFactory };
