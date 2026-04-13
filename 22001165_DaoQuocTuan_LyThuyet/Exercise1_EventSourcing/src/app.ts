import express, { Application } from 'express';
import { BankAccountService } from './services/BankAccountService';
import { EventStore } from './persistence/EventStore';
import { createBankAccountRoutes } from './routes/accountRoutes';

/**
 * Create and configure Express app
 * 
 * Setup:
 * - Middleware: json parsing, logging
 * - EventStore: Initialize event persistence
 * - Service: Initialize business logic
 * - Routes: Setup REST API
 */
export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(express.json());
  
  app.use((req, res, next) => {
    console.log(`\n📨 ${req.method} ${req.path}`);
    next();
  });

  // Initialize Event Sourcing infrastructure
  const eventStore = new EventStore();
  const service = new BankAccountService(eventStore);

  // Routes
  app.use('/accounts', createBankAccountRoutes(service));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      message: 'Bank Account Event Sourcing Service',
      pattern: 'Event Sourcing',
      version: '1.0.0'
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
      method: req.method
    });
  });

  // Error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });

  return app;
}

export { EventStore, BankAccountService };
