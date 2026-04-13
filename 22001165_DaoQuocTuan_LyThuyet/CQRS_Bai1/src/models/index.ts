/**
 * Write Model - TodoEntity
 * Used for write operations (create, update, delete)
 */
export interface TodoEntity {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Read Model - TodoView
 * Used for read operations (get list, get detail)
 * Can have different structure from Write Model for optimization
 */
export interface TodoView {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  status: string; // Derived field for view optimization
}

/**
 * Command DTOs
 */
export interface CreateTodoCommand {
  title: string;
  description: string;
}

export interface UpdateTodoCommand {
  id: string;
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface DeleteTodoCommand {
  id: string;
}
