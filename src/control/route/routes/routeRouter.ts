import { Router } from 'express';
import { FactoryFunction } from 'tsyringe';
import { RouteController } from '../controllers/routeController';

const routeRouterFactory: FactoryFunction<Router> = (dependencyContainer) => {
  const router = Router();
  const controller = dependencyContainer.resolve(RouteController);

  router.get('/', controller.getRoutes);

  return router;
};

export const ROUTE_ROUTER_SYMBOL = Symbol('routeRouterFactory');

export { routeRouterFactory };
