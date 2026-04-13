import { Request, Response } from 'express';
import { TicketService } from '../services/TicketService';
import { TicketViewService } from '../services/TicketViewService';
import { BookTicketCommand, CancelTicketCommand } from '../models';

/**
 * TicketController - HTTP request handlers for ticket operations
 */
export class TicketController {
  constructor(
    private ticketService: TicketService,
    private ticketViewService: TicketViewService
  ) {}

  /**
   * POST /tickets - Book a ticket
   */
  bookTicket = (req: Request, res: Response): void => {
    try {
      const { tripId, passengerId, passengerName, seatNumber } = req.body;

      // Validate input
      if (!tripId || !passengerId || !passengerName || !seatNumber) {
        res.status(400).json({
          error: 'Missing required fields: tripId, passengerId, passengerName, seatNumber',
        });
        return;
      }

      const command: BookTicketCommand = { tripId, passengerId, passengerName, seatNumber };
      const result = this.ticketService.bookTicket(command);

      res.status(201).json({
        success: true,
        message: `Ticket booked successfully on seat ${seatNumber}`,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to book ticket',
      });
    }
  };

  /**
   * GET /tickets/:id - Get ticket details
   */
  getTicket = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const result = this.ticketViewService.getTicket(id);

      if (!result) {
        res.status(404).json({
          error: `Ticket ${id} not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * DELETE /tickets/:id - Cancel a ticket
   */
  cancelTicket = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const ticketId = id
      const command: CancelTicketCommand = { ticketId, reason };
      const result = this.ticketService.cancelTicket(command);

      res.status(200).json({
        success: true,
        message: `Ticket ${id} cancelled successfully`,
        data: result,
      });
    } catch (error) {
      const status = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      res.status(status).json({
        error: error instanceof Error ? error.message : 'Failed to cancel ticket',
      });
    }
  };

  /**
   * GET /tickets - Get all tickets (optional filter by trip)
   */
  getAllTickets = (req: Request, res: Response): void => {
    try {
      const { tripId } = req.query;
      const results = this.ticketViewService.getAllTickets(tripId as string);

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * TripController - HTTP request handlers for trip search
 */
export class TripController {
  constructor(private ticketViewService: TicketViewService) {}

  /**
   * GET /trips/search - Search trips
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

      const results = this.ticketViewService.searchTrips(
        from as string,
        to as string,
        seatClass ? (seatClass as 'economy' | 'business' | 'first') : undefined
      );

      res.status(200).json({
        success: true,
        count: results.length,
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
