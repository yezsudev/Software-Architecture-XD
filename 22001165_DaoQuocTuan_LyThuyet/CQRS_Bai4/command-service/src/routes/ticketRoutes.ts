import { Router } from 'express';
import { TicketController } from '../controllers/TicketController';
import { TicketService } from '../services/TicketService';
import { Database } from '../persistence/Database';

const router = Router();

// Initialize database
const database = new Database();
database.initialize();

// Create services
const ticketService = new TicketService(database);

// Create controller
const ticketController = new TicketController(ticketService);

// Routes - Command operations only
router.post('/tickets', ticketController.bookTicket);
router.delete('/tickets/:id', ticketController.cancelTicket);

export { router, database };
