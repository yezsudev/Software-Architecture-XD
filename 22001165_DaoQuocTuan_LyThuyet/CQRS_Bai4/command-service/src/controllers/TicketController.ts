import { Request, Response } from 'express';
import { TicketService } from '../services/TicketService';
import { BookTicketCommand, CancelTicketCommand } from '../../../shared/models';

/**
 * TicketController - HTTP handlers for CommandService
 * Handles write operations only (POST, DELETE)
 * Does not handle read operations (those go to QueryService)
 */
export class TicketController {
  constructor(private ticketService: TicketService) {}

  /**
   * POST /tickets - Book a ticket (Command)
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
   * DELETE /tickets/:id - Cancel a ticket (Command)
   */
  cancelTicket = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        res.status(400).json({
          error: 'Ticket ID is required',
        });
        return;
      }

      const command: CancelTicketCommand = { ticketId: id, reason };
      const result = this.ticketService.cancelTicket(command);

      res.status(200).json({
        success: true,
        message: 'Ticket cancelled successfully',
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to cancel ticket',
      });
    }
  };
}
