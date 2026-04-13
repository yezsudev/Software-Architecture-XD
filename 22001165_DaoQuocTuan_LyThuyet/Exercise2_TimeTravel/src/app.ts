import express from 'express';
import { BankAccountService } from './services/BankAccountService';
import { EventStore } from './persistence/EventStore';
import { createRoutes } from './routes/accountRoutes';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { console.log(`\n${req.method} ${req.path}`); next(); });

  const eventStore = new EventStore();
  const service = new BankAccountService(eventStore);

  app.use('/accounts', createRoutes(service));
  app.get('/health', (_req, res) => res.json({ status: 'ok', pattern: 'Event Sourcing + Time Travel', port: 3006 }));
  app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.path }));

  return app;
}
