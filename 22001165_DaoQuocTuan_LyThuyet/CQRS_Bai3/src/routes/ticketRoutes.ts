import { Router } from 'express';
import { TicketController, TripController } from '../controllers/TicketController';
import { TicketService } from '../services/TicketService';
import { TicketViewService } from '../services/TicketViewService';
import { database } from '../persistence/Database';
import { eventBus } from '../events/EventBus';

/**
 * Create and configure routes
 */
export function createTicketRoutes(): Router {
  const router = Router();

  // Initialize services
  const ticketService = new TicketService(database, eventBus);
  const ticketViewService = new TicketViewService(database, eventBus);

  // Initialize controllers
  const ticketController = new TicketController(ticketService, ticketViewService);
  const tripController = new TripController(ticketViewService);

  /**
   * Ticket Commands (Write)
   */
  router.post('/tickets', ticketController.bookTicket);
  router.delete('/tickets/:id', ticketController.cancelTicket);

  /**
   * Ticket Queries (Read)
   */
  router.get('/tickets', ticketController.getAllTickets);
  router.get('/tickets/:id', ticketController.getTicket);

  /**
   * Trip Queries (Read - Search)
   */
  router.get('/trips/search', tripController.searchTrips);

  return router;
}
