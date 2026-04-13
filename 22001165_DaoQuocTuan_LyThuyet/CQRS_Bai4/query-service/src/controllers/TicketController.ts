import { Request, Response } from 'express';
import { TicketViewService } from '../services/TicketViewService';

/**
 * TripController & TicketController - HTTP handlers for QueryService
 * Handles read operations only (GET)
 * Does not handle write operations (CommandService handles those on port 3003)
 */
export class TripController {
  constructor(private ticketViewService: TicketViewService) {}

  /**
   * GET /trips/search - Search trips by route
   * Query params: from, to (required), seatClass (optional)
   */
  searchTrips = (req: Request, res: Response): void => {
    try {
      const { from, to, seatClass } = req.query;

      if (!from || !to) {
        res.status(400).json({
          error: 'Missing required query parameters: from, to',
        });
        return;
      }

      const trips = this.ticketViewService.searchTrips(
        String(from),
        String(to),
        seatClass ? String(seatClass) : undefined
      );

      res.json({
        success: true,
        count: trips.length,
        data: trips,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  };
}

export class TicketController {
  constructor(private ticketViewService: TicketViewService) {}

  /**
   * GET /tickets - Get all tickets or filter by trip
   * Query params: tripId (optional)
   */
  getAllTickets = (req: Request, res: Response): void => {
    try {
      const { tripId } = req.query;
      const tickets = this.ticketViewService.getAllTickets(tripId ? String(tripId) : undefined);

      res.json({
        success: true,
        count: tickets.length,
        data: tickets,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get tickets',
      });
    }
  };

  /**
   * GET /tickets/:id - Get single ticket
   */
  getTicket = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'Ticket ID is required',
        });
        return;
      }

      const ticket = this.ticketViewService.getTicket(id);

      if (!ticket) {
        res.status(404).json({
          error: 'Ticket not found',
        });
        return;
      }

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get ticket',
      });
    }
  };
}
