import { Database } from '../persistence/Database';

/**
 * SeatValidator - Business Logic (Read-Only for QueryService)
 * Used to calculate seat statistics without modifying data
 */
export class SeatValidator {
  constructor(private database: Database) {}

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
}
