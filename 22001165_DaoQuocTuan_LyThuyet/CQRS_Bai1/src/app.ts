import express from 'express';
import { createTodoRoutes } from './routes/todoRoutes';

/**
 * Create and configure Express app
 */
export function createApp() {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`\n${req.method} ${req.path}`);
    next();
  });

  // Routes
  app.use('/todos', createTodoRoutes());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      message: 'CQRS TodoApp is running',
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
    });
  });

  return app;
}
