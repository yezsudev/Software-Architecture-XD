import express from 'express';
import { createTicketRoutes } from './routes/ticketRoutes';
import { database } from './persistence/Database';

/**
 * Create and configure Express app
 */
export function createApp() {
  const app = express();

  // Initialize database
  database.initialize();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`\n${req.method} ${req.path}`);
    next();
  });

  // Routes
  app.use(createTicketRoutes());

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      message: 'Train Ticket System is running',
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
