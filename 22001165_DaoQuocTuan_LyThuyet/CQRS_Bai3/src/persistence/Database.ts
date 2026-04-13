import { Ticket, Trip, Seat, TicketRecord, TripRecord } from '../models';

/**
 * Database - Simulated persistence layer
 * In real app, this would use MongoDB, PostgreSQL, etc.
 * 
 * This abstraction shows:
 * - Write Model persistence
 * - ACID-like operations
 * - Data validation before persist
 */
export class Database {
  // In-memory storage (represents database tables)
  private ticketsTable: Map<string, TicketRecord> = new Map();
  private tripsTable: Map<string, TripRecord> = new Map();
  private tripSeatsIndex: Map<string, Map<string, boolean>> = new Map(); // trip -> (seatNumber -> isBooked)

  /**
   * Initialize with sample data
   */
  initialize(): void {
    this.seedTrips();
    console.log('✓ [Database] Initialized with sample data');
  }

  /**
   * Seed sample trips
   */
  private seedTrips(): void {
    const trips: Trip[] = [
      {
        id: 'TRIP001',
        trainNumber: 'SR1',
        departureStation: 'Bangkok',
        arrivalStation: 'Chiang Mai',
        departureTime: new Date('2026-04-15T10:00:00'),
        arrivalTime: new Date('2026-04-15T18:30:00'),
        totalSeats: 100,
        availableSeats: this.generateSeats(60, 20, 20), // 60 economy, 20 business, 20 first
        bookedSeats: new Map(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'TRIP002',
        trainNumber: 'SR2',
        departureStation: 'Bangkok',
        arrivalStation: 'Chiang Mai',
        departureTime: new Date('2026-04-15T14:00:00'),
        arrivalTime: new Date('2026-04-15T22:30:00'),
        totalSeats: 80,
        availableSeats: this.generateSeats(50, 15, 15),
        bookedSeats: new Map(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'TRIP003',
        trainNumber: 'NRT1',
        departureStation: 'Bangkok',
        arrivalStation: 'Phuket',
        departureTime: new Date('2026-04-15T08:00:00'),
        arrivalTime: new Date('2026-04-15T13:00:00'),
        totalSeats: 120,
        availableSeats: this.generateSeats(80, 25, 15),
        bookedSeats: new Map(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Persist trips
    trips.forEach((trip) => {
      const record: TripRecord = {
        id: trip.id,
        trainNumber: trip.trainNumber,
        departureStation: trip.departureStation,
        arrivalStation: trip.arrivalStation,
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
        totalSeats: trip.totalSeats,
        seatsLayout: trip.availableSeats.map((s) => ({
          seatNumber: s.seatNumber,
          class: s.seatClass,
          price: s.price,
        })),
        createdAt: trip.createdAt.toISOString(),
        updatedAt: trip.updatedAt.toISOString(),
      };

      this.tripsTable.set(trip.id, record);

      // Initialize seat index
      const seatIndex = new Map<string, boolean>();
      trip.availableSeats.forEach((seat) => {
        seatIndex.set(seat.seatNumber, false); // false = not booked
      });
      this.tripSeatsIndex.set(trip.id, seatIndex);
    });
  }

  /**
   * Generate sample seats
   */
  private generateSeats(economyCount: number, businessCount: number, firstCount: number): Seat[] {
    const seats: Seat[] = [];
    const classes = [
      { class: 'economy', count: economyCount, prefix: 'A', price: 500 },
      { class: 'business', count: businessCount, prefix: 'B', price: 1000 },
      { class: 'first', count: firstCount, prefix: 'C', price: 2000 },
    ];

    classes.forEach(({ class: seatClass, count, prefix, price }) => {
      for (let i = 1; i <= count; i++) {
        seats.push({
          seatNumber: `${prefix}${i}`,
          seatClass: seatClass as 'economy' | 'business' | 'first',
          isAvailable: true,
          price,
        });
      }
    });

    return seats;
  }

  /**
   * Book a ticket (write operation)
   */
  bookTicket(ticket: Ticket): Ticket {
    const record: TicketRecord = {
      id: ticket.id,
      tripId: ticket.tripId,
      passengerId: ticket.passengerId,
      passengerName: ticket.passengerName,
      seatNumber: ticket.seatNumber,
      seatClass: ticket.seatClass,
      price: ticket.price,
      status: ticket.status,
      bookingDate: ticket.bookingDate.toISOString(),
    };

    this.ticketsTable.set(ticket.id, record);
    this.markSeatAsBooked(ticket.tripId, ticket.seatNumber);

    console.log(`✓ [Database] Booked ticket ${ticket.id} on seat ${ticket.seatNumber}`);

    return ticket;
  }

  /**
   * Cancel a ticket (write operation)
   */
  cancelTicket(ticketId: string, cancelledDate: Date): Ticket | null {
    const record = this.ticketsTable.get(ticketId);
    if (!record) return null;

    record.status = 'cancelled';
    record.cancelledDate = cancelledDate.toISOString();

    this.ticketsTable.set(ticketId, record);
    this.markSeatAsAvailable(record.tripId, record.seatNumber);

    console.log(`✓ [Database] Cancelled ticket ${ticketId}, released seat ${record.seatNumber}`);

    return {
      id: record.id,
      tripId: record.tripId,
      passengerId: record.passengerId,
      passengerName: record.passengerName,
      seatNumber: record.seatNumber,
      seatClass: record.seatClass as 'economy' | 'business' | 'first',
      price: record.price,
      status: 'cancelled',
      bookingDate: new Date(record.bookingDate),
      cancelledDate: record.cancelledDate ? new Date(record.cancelledDate) : undefined,
    };
  }

  /**
   * Get ticket by ID
   */
  getTicket(ticketId: string): Ticket | null {
    const record = this.ticketsTable.get(ticketId);
    if (!record) return null;

    return {
      id: record.id,
      tripId: record.tripId,
      passengerId: record.passengerId,
      passengerName: record.passengerName,
      seatNumber: record.seatNumber,
      seatClass: record.seatClass as 'economy' | 'business' | 'first',
      price: record.price,
      status: record.status as 'confirmed' | 'cancelled',
      bookingDate: new Date(record.bookingDate),
      cancelledDate: record.cancelledDate ? new Date(record.cancelledDate) : undefined,
    };
  }

  /**
   * Get all tickets for a trip
   */
  getTicketsForTrip(tripId: string): Ticket[] {
    const tickets: Ticket[] = [];
    this.ticketsTable.forEach((record) => {
      if (record.tripId === tripId) {
        tickets.push({
          id: record.id,
          tripId: record.tripId,
          passengerId: record.passengerId,
          passengerName: record.passengerName,
          seatNumber: record.seatNumber,
          seatClass: record.seatClass as 'economy' | 'business' | 'first',
          price: record.price,
          status: record.status as 'confirmed' | 'cancelled',
          bookingDate: new Date(record.bookingDate),
          cancelledDate: record.cancelledDate ? new Date(record.cancelledDate) : undefined,
        });
      }
    });
    return tickets;
  }

  /**
   * Get trip by ID
   */
  getTrip(tripId: string): Trip | null {
    const record = this.tripsTable.get(tripId);
    if (!record) return null;

    const seats = record.seatsLayout.map((s) => ({
      seatNumber: s.seatNumber,
      seatClass: s.class as 'economy' | 'business' | 'first',
      isAvailable: !this.isSeatBooked(tripId, s.seatNumber),
      price: s.price,
    }));

    return {
      id: record.id,
      trainNumber: record.trainNumber,
      departureStation: record.departureStation,
      arrivalStation: record.arrivalStation,
      departureTime: new Date(record.departureTime),
      arrivalTime: new Date(record.arrivalTime),
      totalSeats: record.totalSeats,
      availableSeats: seats.filter((s) => s.isAvailable),
      bookedSeats: new Map(),
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
    };
  }

  /**
   * Search trips by route
   */
  searchTrips(departureStation: string, arrivalStation: string): Trip[] {
    const trips: Trip[] = [];
    this.tripsTable.forEach((record) => {
      if (
        record.departureStation.toLowerCase() === departureStation.toLowerCase() &&
        record.arrivalStation.toLowerCase() === arrivalStation.toLowerCase()
      ) {
        const trip = this.getTrip(record.id);
        if (trip) trips.push(trip);
      }
    });
    return trips;
  }

  /**
   * Check if seat is booked
   */
  isSeatBooked(tripId: string, seatNumber: string): boolean {
    const seatIndex = this.tripSeatsIndex.get(tripId);
    if (!seatIndex) return false;
    return seatIndex.get(seatNumber) === true;
  }

  /**
   * Mark seat as booked
   */
  private markSeatAsBooked(tripId: string, seatNumber: string): void {
    const seatIndex = this.tripSeatsIndex.get(tripId);
    if (seatIndex) {
      seatIndex.set(seatNumber, true);
    }
  }

  /**
   * Mark seat as available
   */
  private markSeatAsAvailable(tripId: string, seatNumber: string): void {
    const seatIndex = this.tripSeatsIndex.get(tripId);
    if (seatIndex) {
      seatIndex.set(seatNumber, false);
    }
  }

  /**
   * Get stats for a trip
   */
  getTripStats(tripId: string): { totalSeats: number; bookedSeats: number; availableSeats: number } {
    const record = this.tripsTable.get(tripId);
    if (!record) return { totalSeats: 0, bookedSeats: 0, availableSeats: 0 };

    let bookedCount = 0;
    this.ticketsTable.forEach((ticket) => {
      if (ticket.tripId === tripId && ticket.status === 'confirmed') {
        bookedCount++;
      }
    });

    return {
      totalSeats: record.totalSeats,
      bookedSeats: bookedCount,
      availableSeats: record.totalSeats - bookedCount,
    };
  }
}

// Singleton instance
export const database = new Database();
