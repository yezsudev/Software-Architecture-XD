import { createApp } from './app';

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║   CQRS TodoApp API Server Started   ║
╚════════════════════════════════════╝

Host: http://localhost:${PORT}
Health: http://localhost:${PORT}/health
Todos API: http://localhost:${PORT}/todos

Commands (Write Operations):
  POST   /todos      - Create todo
  PUT    /todos/:id  - Update todo
  DELETE /todos/:id  - Delete todo

Queries (Read Operations):
  GET    /todos      - Get all todos
  GET    /todos/:id  - Get todo by id
  `);
});
