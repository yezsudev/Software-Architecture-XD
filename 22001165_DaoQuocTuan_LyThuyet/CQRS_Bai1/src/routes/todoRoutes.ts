import { Router } from 'express';
import { TodoController } from '../controllers/TodoController';
import { CommandService } from '../services/CommandService';
import { QueryService } from '../services/QueryService';

/**
 * Create and configure todo routes
 * @returns Express router with all todo endpoints
 */
export function createTodoRoutes(): Router {
  const router = Router();

  // Initialize services
  const commandService = new CommandService();
  const queryService = new QueryService();
  const controller = new TodoController(commandService, queryService);

  /**
   * Commands (Write Operations)
   */

  // POST /todos - Create todo
  router.post('/', controller.createTodo);

  // PUT /todos/:id - Update todo
  router.put('/:id', controller.updateTodo);

  // DELETE /todos/:id - Delete todo
  router.delete('/:id', controller.deleteTodo);

  /**
   * Queries (Read Operations)
   */

  // GET /todos - Get all todos
  router.get('/', controller.getAllTodos);

  // GET /todos/:id - Get todo by id
  router.get('/:id', controller.getTodoById);

  return router;
}
