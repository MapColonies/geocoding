import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { QueryController } from '../controllers/queryController';

const queryRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(QueryController);

  router.get('/', controller.getQuery);

  return router;
};

export const QUERY_ROUTER_SYMBOL = Symbol('queryRouterFactory');

export { queryRouterFactory };
