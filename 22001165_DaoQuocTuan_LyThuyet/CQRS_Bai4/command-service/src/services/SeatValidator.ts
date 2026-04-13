import { Database } from '../persistence/Database';

/**
 * SeatValidator - Business Logic Validator
 * Enforces business rules for seat availability and cancellation
 */
export class SeatValidator {
  constructor(private database: Database) {}

  /**
   * Validate if seat is available for booking
   */
  validateSeatAvailability(tripId: string, seatNumber: string): { isValid: boolean; message: string } {
    // Check trip exists
    const trip = this.database.getTrip(tripId);
    if (!trip) {
      return { isValid: false, message: 'Trip not found' };
    }

    // Check seat exists
    const seat = trip.seats.find((s) => s.number === seatNumber);
    if (!seat) {
      return { isValid: false, message: `Seat ${seatNumber} does not exist` };
    }

    // Check seat not already booked
    if (this.database.isSeatBooked(tripId, seatNumber)) {
      return { isValid: false, message: `Seat ${seatNumber} is already booked` };
    }

    return { isValid: true, message: 'Seat available' };
  }

  /**
   * Get available seats for a trip
   */
  getAvailableSeats(tripId: string): Array<{ seatNumber: string; class: string; price: number }> {
    const trip = this.database.getTrip(tripId);
    if (!trip) return [];

    return trip.seats
      .filter((seat) => !this.database.isSeatBooked(tripId, seat.number))
      .map((seat) => ({
        seatNumber: seat.number,
        class: seat.class,
        price: seat.price,
      }));
  }

  /**
   * Get seat statistics for a trip
   */
  getSeatStats(tripId: string): { total: number; available: number; booked: number; byClass: any } {
    const result = this.database.getTripStats(tripId);
    if (!result.trip) {
      return { total: 0, available: 0, booked: 0, byClass: {} };
    }
    return result.stats;
  }

  /**
   * Validate if ticket can be cancelled
   */
  validateCancellation(tripId: string, ticketId: string): { isValid: boolean; message: string } {
    const ticket = this.database.getTicket(ticketId);
    if (!ticket) {
      return { isValid: false, message: 'Ticket not found' };
    }

    if (ticket.status === 'cancelled') {
      return { isValid: false, message: 'Cannot cancel a ticket that is already cancelled' };
    }

    if (ticket.tripId !== tripId) {
      return { isValid: false, message: 'Ticket does not belong to this trip' };
    }

    return { isValid: true, message: 'Can cancel' };
  }
}
