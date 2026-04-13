import express from 'express';
import { OrderService } from './services/OrderService';
import { EventStore } from './persistence/EventStore';
import { OrderSummaryProjection } from './projections/OrderSummaryProjection';
import { createRoutes } from './routes/orderRoutes';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { console.log(`\n${req.method} ${req.path}`); next(); });

  const eventStore = new EventStore();
  const projection = new OrderSummaryProjection();
  const service = new OrderService(eventStore, projection);

  app.use('/orders', createRoutes(service));
  app.get('/health', (_req, res) => res.json({ status: 'ok', pattern: 'Order System: Event Sourcing + CQRS', port: 3009 }));
  app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.path }));
  return app;
}
