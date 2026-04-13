import { v4 as uuidv4 } from 'uuid';
import { Ticket, BookTicketCommand, CancelTicketCommand, TicketBookedEvent, TicketCancelledEvent } from '../../shared/models';
import { EventBus } from '../../../shared/EventBus';
import { Database } from '../persistence/Database';
import { SeatValidator } from './SeatValidator';

/**
 * TicketService - CommandService for ticket operations
 * Runs on port 3003
 * 
 * Responsibilities:
 * - Validate seat availability (via SeatValidator)
 * - Persist to database (CommandService owns the write model)
 * - Publish events to global EventBus
 * - Enforce business rules
 * 
 * Does NOT call QueryService (loose coupling)
 * Does NOT read from QueryService cache
 */
export class TicketService {
  private validator: SeatValidator;

  constructor(
    private database: Database
  ) {
    this.validator = new SeatValidator(database);
  }

  /**
   * Book a ticket (Command)
   * Publishes event to EventBus for QueryService to listen
   */
  bookTicket(command: BookTicketCommand): Ticket {
    // PHASE 1: VALIDATION
    const validation = this.validator.validateSeatAvailability(command.tripId, command.seatNumber);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // PHASE 2: PRICING
    const availableSeats = this.validator.getAvailableSeats(command.tripId);
    const seat = availableSeats.find((s) => s.seatNumber === command.seatNumber);
    if (!seat) {
      throw new Error(`Seat ${command.seatNumber} not found`);
    }

    // PHASE 3: PERSISTENCE (Write Model)
    const ticketId = uuidv4();
    const now = new Date();

    const ticket: Ticket = {
      id: ticketId,
      tripId: command.tripId,
      passengerId: command.passengerId,
      passengerName: command.passengerName,
      seatNumber: command.seatNumber,
      seatClass: seat.class as 'economy' | 'business' | 'first',
      price: seat.price,
      status: 'confirmed',
      bookingDate: now,
    };

    // Persist to CommandService database
    this.database.bookTicket(ticket);
    console.log(`[CommandService] Ticket booked: ${ticketId} on seat ${command.seatNumber}`);

    // PHASE 4: EVENT PUBLISHING
    const event: TicketBookedEvent = {
      type: 'TICKET_BOOKED',
      ticketId: ticket.id,
      tripId: command.tripId,
      passengerId: command.passengerId,
      passengerName: command.passengerName,
      seatNumber: command.seatNumber,
      seatClass: seat.class,
      price: seat.price,
      bookingDate: now,
    };

    // Publish to global EventBus
    // QueryService (on port 3004) is already listening
    EventBus.publish(event);
    console.log(`[CommandService] Event published: TICKET_BOOKED (${ticketId})`);

    return ticket;
  }

  /**
   * Cancel a ticket (Command)
   * Publishes event to EventBus for QueryService to listen
   */
  cancelTicket(command: CancelTicketCommand): Ticket {
    // Get ticket from CommandService database
    const ticket = this.database.getTicket(command.ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Validate cancellation allowed
    const validation = this.validator.validateCancellation(ticket.tripId, command.ticketId);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // Persist cancellation to CommandService database
    const cancelledDate = new Date();
    this.database.cancelTicket(command.ticketId, cancelledDate);
    ticket.cancelledDate = cancelledDate;
    console.log(`[CommandService] Ticket cancelled: ${command.ticketId}`);

    // Publish cancellation event
    const event: TicketCancelledEvent = {
      type: 'TICKET_CANCELLED',
      ticketId: ticket.id,
      tripId: ticket.tripId,
      seatNumber: ticket.seatNumber,
      reason: command.reason,
      cancelledDate: cancelledDate,
    };

    // Publish to global EventBus
    EventBus.publish(event);
    console.log(`[CommandService] Event published: TICKET_CANCELLED (${command.ticketId})`);

    return ticket;
  }
}
