import { v4 as uuidv4 } from 'uuid';
import { Ticket, BookTicketCommand, CancelTicketCommand, TicketBookedEvent, TicketCancelledEvent } from '../models';
import { Database } from '../persistence/Database';
import { EventBus } from '../events/EventBus';
import { SeatValidator } from './SeatValidator';

/**
 * TicketService - CommandService for ticket operations
 * Handles: Book Ticket, Cancel Ticket
 * 
 * Responsibilities:
 * - Validate seat availability
 * - Persist to database
 * - Publish events
 * - Enforce business rules
 */
export class TicketService {
  private validator: SeatValidator;

  constructor(
    private database: Database,
    private eventBus: EventBus
  ) {
    this.validator = new SeatValidator(database);
  }

  /**
   * Book a ticket (Command)
   * @throws Error if validation fails
   */
  bookTicket(command: BookTicketCommand): Ticket {
    // 1. Validate seat availability
    const validation = this.validator.validateSeatAvailability(command.tripId, command.seatNumber);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // 2. Get seat details for pricing
    const availableSeats = this.validator.getAvailableSeats(command.tripId);
    const seat = availableSeats.find((s) => s.seatNumber === command.seatNumber);
    if (!seat) {
      throw new Error(`Seat ${command.seatNumber} not found`);
    }

    // 3. Create ticket
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

    // 4. Persist to database
    this.database.bookTicket(ticket);
    console.log(`✓ [TicketService] Booked ticket: ${ticketId}`);

    // 5. Publish event
    const event: TicketBookedEvent = {
      type: 'TICKET_BOOKED',
      ticketId: ticket.id,
      tripId: command.tripId,
      passengerId: command.passengerId,
      passengerName: command.passengerName,
      seatNumber: command.seatNumber,
      seatClass: ticket.seatClass,
      price: ticket.price,
      bookingDate: now,
    };

    this.eventBus.publish(event);

    return ticket;
  }

  /**
   * Cancel a ticket (Command)
   * @throws Error if validation fails
   */
  cancelTicket(command: CancelTicketCommand): Ticket {
    // 1. Validate cancellation
    const ticket = this.database.getTicket(command.ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${command.ticketId} not found`);
    }

    const validation = this.validator.validateCancellation(ticket.tripId, command.ticketId);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    // 2. Persist cancellation to database
    const cancelledDate = new Date();
    const result = this.database.cancelTicket(command.ticketId, cancelledDate);
    if (!result) {
      throw new Error(`Failed to cancel ticket ${command.ticketId}`);
    }

    console.log(`✓ [TicketService] Cancelled ticket: ${command.ticketId}`);

    // 3. Publish event
    const event: TicketCancelledEvent = {
      type: 'TICKET_CANCELLED',
      ticketId: command.ticketId,
      tripId: ticket.tripId,
      seatNumber: ticket.seatNumber,
      reason: command.reason,
      cancelledDate,
    };

    this.eventBus.publish(event);

    return result;
  }

  /**
   * Get ticket details (for read after write verification)
   */
  getTicket(ticketId: string): Ticket | null {
    return this.database.getTicket(ticketId);
  }

  /**
   * Get seat validator for testing
   */
  getValidator(): SeatValidator {
    return this.validator;
  }
}
