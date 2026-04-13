import express from 'express';
import { router, database } from './routes/ticketRoutes';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/', router);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'command-service' });
});

export { app, database };
