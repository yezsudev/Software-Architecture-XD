import { Database } from '../persistence/Database';

/**
 * SeatValidator - Validates seat availability and business rules
 * Core business logic for seat management
 */
export class SeatValidator {
  constructor(private database: Database) {}

  /**
   * Validate if a seat can be booked
   * @throws Error if validation fails
   */
  validateSeatAvailability(tripId: string, seatNumber: string): { isValid: boolean; message: string } {
    // Check if trip exists
    const trip = this.database.getTrip(tripId);
    if (!trip) {
      return { isValid: false, message: `Trip ${tripId} not found` };
    }

    // Check if seat exists
    const seat = trip.availableSeats.find((s) => s.seatNumber === seatNumber);
    if (!seat && !trip.availableSeats.some((s) => s.seatNumber === seatNumber)) {
      // Check in all seats
      const allSeats = [...trip.availableSeats];
      if (!allSeats.some((s) => s.seatNumber === seatNumber)) {
        return { isValid: false, message: `Seat ${seatNumber} does not exist on train ${trip.trainNumber}` };
      }
    }

    // Check if seat is already booked
    if (this.database.isSeatBooked(tripId, seatNumber)) {
      return { isValid: false, message: `Seat ${seatNumber} is already booked` };
    }

    return { isValid: true, message: 'Seat is available' };
  }

  /**
   * Get available seats for a trip
   */
  getAvailableSeats(tripId: string): Array<{ seatNumber: string; class: string; price: number }> {
    const trip = this.database.getTrip(tripId);
    if (!trip) return [];

    return trip.availableSeats.map((s) => ({
      seatNumber: s.seatNumber,
      class: s.seatClass,
      price: s.price,
    }));
  }

  /**
   * Get seat availability stats
   */
  getSeatStats(tripId: string): {
    total: number;
    available: number;
    booked: number;
    byClass: { [key: string]: { total: number; available: number } };
  } {
    const trip = this.database.getTrip(tripId);
    if (!trip) {
      return { total: 0, available: 0, booked: 0, byClass: {} };
    }

    const allSeats = trip.availableSeats;
    const byClass: { [key: string]: { total: number; available: number } } = {
      economy: { total: 0, available: 0 },
      business: { total: 0, available: 0 },
      first: { total: 0, available: 0 },
    };

    allSeats.forEach((seat) => {
      byClass[seat.seatClass].total++;
      if (seat.isAvailable) {
        byClass[seat.seatClass].available++;
      }
    });

    return {
      total: allSeats.length,
      available: allSeats.filter((s) => s.isAvailable).length,
      booked: allSeats.filter((s) => !s.isAvailable).length,
      byClass,
    };
  }

  /**
   * Validate ticket cancellation
   */
  validateCancellation(tripId: string, ticketId: string): { isValid: boolean; message: string } {
    const ticket = this.database.getTicket(ticketId);
    if (!ticket) {
      return { isValid: false, message: `Ticket ${ticketId} not found` };
    }

    if (ticket.tripId !== tripId) {
      return { isValid: false, message: `Ticket not found on trip ${tripId}` };
    }

    if (ticket.status === 'cancelled') {
      return { isValid: false, message: `Ticket ${ticketId} is already cancelled` };
    }

    // Check if trip has already departed
    const trip = this.database.getTrip(tripId);
    if (trip && trip.departureTime <= new Date()) {
      return { isValid: false, message: `Cannot cancel ticket for departed trip` };
    }

    return { isValid: true, message: 'Ticket can be cancelled' };
  }
}
