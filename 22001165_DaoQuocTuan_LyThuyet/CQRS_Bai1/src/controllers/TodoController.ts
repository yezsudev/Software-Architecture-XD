import { Request, Response } from 'express';
import { CommandService } from '../services/CommandService';
import { QueryService } from '../services/QueryService';
import { CreateTodoCommand, UpdateTodoCommand, DeleteTodoCommand } from '../models';

/**
 * TodoController - Orchestrates CommandService and QueryService
 * Handles HTTP requests and applies CQRS pattern
 */
export class TodoController {
  constructor(
    private commandService: CommandService,
    private queryService: QueryService
  ) {}

  /**
   * POST /todos - Create a new todo
   */
  createTodo = (req: Request, res: Response): void => {
    try {
      const { title, description } = req.body;

      // Validate input
      if (!title || !description) {
        res.status(400).json({
          error: 'Missing required fields: title and description',
        });
        return;
      }

      const command: CreateTodoCommand = { title, description };
      const result = this.commandService.createTodo(command);

      // Sync to read model
      this.syncReadModel();

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * GET /todos - Get all todos
   */
  getAllTodos = (req: Request, res: Response): void => {
    try {
      const results = this.queryService.getAllTodos();
      const stats = this.queryService.getStatistics();

      res.status(200).json({
        success: true,
        data: results,
        statistics: stats,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * GET /todos/:id - Get todo by id
   */
  getTodoById = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const result = this.queryService.getTodoById(id);

      if (!result) {
        res.status(404).json({
          error: `Todo with id ${id} not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * PUT /todos/:id - Update todo
   */
  updateTodo = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const { title, description, completed } = req.body;

      const command: UpdateTodoCommand = {
        id,
        title,
        description,
        completed,
      };

      const result = this.commandService.updateTodo(command);

      // Sync to read model
      this.syncReadModel();

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * DELETE /todos/:id - Delete todo
   */
  deleteTodo = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;

      const command: DeleteTodoCommand = { id };
      this.commandService.deleteTodo(command);

      // Sync to read model
      this.syncReadModel();

      res.status(200).json({
        success: true,
        message: `Todo ${id} deleted successfully`,
      });
    } catch (error) {
      res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * Sync write model to read model
   * In real application, this would be handled by event sourcing
   */
  private syncReadModel(): void {
    const todos = this.commandService.getAllTodos();
    this.queryService.syncFromWriteModel(todos);
  }
}
