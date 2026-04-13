import { createApp } from './app';

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   CQRS Order System API Server Started  ║
╚════════════════════════════════════════╝

Host: http://localhost:${PORT}
Health: http://localhost:${PORT}/health
Orders API: http://localhost:${PORT}/orders

Commands (Write Operations):
  POST   /orders      - Create order
  DELETE /orders/:id  - Cancel order

Queries (Read Operations):
  GET    /orders      - Get all orders
  GET    /orders/:id  - Get order by id

Event-Driven Architecture:
  • CommandService publishes events
  • QueryService listens to events
  • EventBus manages event flow
  `);
});
