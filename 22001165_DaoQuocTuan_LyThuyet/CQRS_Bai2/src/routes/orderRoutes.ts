import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { CommandService } from '../services/CommandService';
import { QueryService } from '../services/QueryService';
import { eventBus } from '../events/EventBus';

/**
 * Create and configure order routes
 * @returns Express router with all order endpoints
 */
export function createOrderRoutes(): Router {
  const router = Router();

  // Initialize services
  const commandService = new CommandService(eventBus);
  const queryService = new QueryService(eventBus);
  const controller = new OrderController(commandService, queryService);

  /**
   * Commands (Write Operations)
   */

  // POST /orders - Create order
  router.post('/', controller.createOrder);

  // DELETE /orders/:id - Cancel order
  router.delete('/:id', controller.cancelOrder);

  /**
   * Queries (Read Operations)
   */

  // GET /orders - Get all orders
  router.get('/', controller.getAllOrders);

  // GET /orders/:id - Get order by id
  router.get('/:id', controller.getOrderById);

  return router;
}
