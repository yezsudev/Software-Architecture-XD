import { TodoView, TodoEntity } from '../models';

/**
 * QueryService - Handles all read operations
 * Implements CQRS pattern for query side
 * Works with Read Model (TodoView)
 */
export class QueryService {
  // Read model cache (TodoView)
  private todoViews: Map<string, TodoView> = new Map();

  /**
   * Sync data from write model to read model
   * This would typically happen through event sourcing or a separate process
   * @param todos Array of TodoEntity from write model
   */
  syncFromWriteModel(todos: TodoEntity[]): void {
    this.todoViews.clear();

    todos.forEach((todo) => {
      const view = this.entityToView(todo);
      this.todoViews.set(todo.id, view);
    });

    console.log(`✓ Synced ${todos.length} todos to read model`);
  }

  /**
   * Convert TodoEntity (write model) to TodoView (read model)
   * @param entity TodoEntity from write model
   * @returns TodoView for read operations
   */
  private entityToView(entity: TodoEntity): TodoView {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description,
      completed: entity.completed,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      status: entity.completed ? 'completed' : 'pending', // Derived field
    };
  }

  /**
   * Get all todos from read model
   * @returns Array of TodoView
   */
  getAllTodos(): TodoView[] {
    return Array.from(this.todoViews.values());
  }

  /**
   * Get todo by id from read model
   * @param id Todo id
   * @returns TodoView or null if not found
   */
  getTodoById(id: string): TodoView | null {
    return this.todoViews.get(id) || null;
  }

  /**
   * Get statistics from read model
   * Example of query-side optimization
   * @returns Statistics object
   */
  getStatistics(): {
    total: number;
    completed: number;
    pending: number;
  } {
    const todos = Array.from(this.todoViews.values());
    const completed = todos.filter((t) => t.completed).length;
    const pending = todos.length - completed;

    return {
      total: todos.length,
      completed,
      pending,
    };
  }
}
