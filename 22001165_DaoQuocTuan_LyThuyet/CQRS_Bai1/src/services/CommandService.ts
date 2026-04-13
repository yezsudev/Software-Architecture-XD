import { v4 as uuidv4 } from 'uuid';
import { TodoEntity, CreateTodoCommand, UpdateTodoCommand, DeleteTodoCommand } from '../models';

/**
 * CommandService - Handles all write operations
 * Implements CQRS pattern for command side
 */
export class CommandService {
  // In-memory storage for write model (TodoEntity)
  private todos: Map<string, TodoEntity> = new Map();

  /**
   * Create a new todo
   * @param command Create command with title and description
   * @returns Created TodoEntity
   */
  createTodo(command: CreateTodoCommand): TodoEntity {
    const id = uuidv4();
    const now = new Date();

    const todo: TodoEntity = {
      id,
      title: command.title,
      description: command.description,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    this.todos.set(id, todo);
    console.log(`✓ Created todo: ${id}`);

    return todo;
  }

  /**
   * Update an existing todo
   * @param command Update command with optional fields
   * @returns Updated TodoEntity or throws error if not found
   */
  updateTodo(command: UpdateTodoCommand): TodoEntity {
    const todo = this.todos.get(command.id);

    if (!todo) {
      throw new Error(`Todo with id ${command.id} not found`);
    }

    // Update only provided fields
    if (command.title !== undefined) {
      todo.title = command.title;
    }
    if (command.description !== undefined) {
      todo.description = command.description;
    }
    if (command.completed !== undefined) {
      todo.completed = command.completed;
    }

    todo.updatedAt = new Date();
    this.todos.set(command.id, todo);

    console.log(`✓ Updated todo: ${command.id}`);

    return todo;
  }

  /**
   * Delete a todo
   * @param command Delete command with todo id
   * @returns true if deleted, throws error if not found
   */
  deleteTodo(command: DeleteTodoCommand): boolean {
    if (!this.todos.has(command.id)) {
      throw new Error(`Todo with id ${command.id} not found`);
    }

    this.todos.delete(command.id);
    console.log(`✓ Deleted todo: ${command.id}`);

    return true;
  }

  /**
   * Get all todos from write model (used for syncing to read model)
   * @returns Array of all TodoEntity
   */
  getAllTodos(): TodoEntity[] {
    return Array.from(this.todos.values());
  }

  /**
   * Get todo by id from write model
   * @param id Todo id
   * @returns TodoEntity or null if not found
   */
  getTodoById(id: string): TodoEntity | null {
    return this.todos.get(id) || null;
  }
}
