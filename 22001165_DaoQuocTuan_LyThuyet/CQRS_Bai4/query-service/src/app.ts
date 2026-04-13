import express from 'express';
import { router, database, ticketViewService } from './routes/ticketRoutes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/', router);

// Health check endpoint
app.get('/health', (req, res) => {
  const cacheStats = ticketViewService.getCacheStats();
  res.json({
    status: 'ok',
    service: 'query-service',
    cache: cacheStats,
  });
});

export { app, database };
