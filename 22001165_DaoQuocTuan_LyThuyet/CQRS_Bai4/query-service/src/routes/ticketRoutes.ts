import { Router } from 'express';
import { TicketViewService } from '../services/TicketViewService';
import { TripController, TicketController } from '../controllers/TicketController';
import { Database } from '../persistence/Database';
import { SeatValidator } from '../services/SeatValidator';

const router = Router();

// Initialize database and services
const database = new Database();
database.initialize();

const seatValidator = new SeatValidator(database);
const ticketViewService = new TicketViewService(database, seatValidator);

// Create controllers
const tripController = new TripController(ticketViewService);
const ticketController = new TicketController(ticketViewService);

// Routes - Query operations only
router.get('/trips/search', tripController.searchTrips);
router.get('/tickets', ticketController.getAllTickets);
router.get('/tickets/:id', ticketController.getTicket);

export { router, database, ticketViewService };
