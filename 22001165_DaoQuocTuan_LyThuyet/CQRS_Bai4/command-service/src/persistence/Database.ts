import { Ticket, Trip, Seat } from '../../shared/models';

/**
 * Database - Persistence Layer for Train Ticket System
 * Handles: Tickets, Trips, Seats
 * 
 * Used by CommandService only (in microservices)
 * QueryService reads from read model cache
 */
export class Database {
  private ticketsTable = new Map<string, Ticket>();
  private tripsTable = new Map<string, Trip>();
  private tripSeatsIndex = new Map<string, Set<string>>();

  // Initialize with sample data
  initialize(): void {
    this.seedTrips();
    console.log('✓ Database: Initialized with seed data');
  }

  private seedTrips(): void {
    // Trip 1: Bangkok - Chiang Mai (Morning)
    const trip1: Trip = {
      id: 'TRIP001',
      trainNumber: 'SR1',
      departure: 'Bangkok',
      arrival: 'Chiang Mai',
      departureTime: new Date('2026-04-15T10:00:00'),
      arrivalTime: new Date('2026-04-15T18:30:00'),
      capacity: 100,
      seats: this.generateSeats(100),
    };

    // Trip 2: Bangkok - Chiang Mai (Afternoon)
    const trip2: Trip = {
      id: 'TRIP002',
      trainNumber: 'SR2',
      departure: 'Bangkok',
      arrival: 'Chiang Mai',
      departureTime: new Date('2026-04-15T14:00:00'),
      arrivalTime: new Date('2026-04-15T22:30:00'),
      capacity: 80,
      seats: this.generateSeats(80),
    };

    // Trip 3: Bangkok - Phuket
    const trip3: Trip = {
      id: 'TRIP003',
      trainNumber: 'SR3',
      departure: 'Bangkok',
      arrival: 'Phuket',
      departureTime: new Date('2026-04-15T08:00:00'),
      arrivalTime: new Date('2026-04-15T13:00:00'),
      capacity: 120,
      seats: this.generateSeats(120),
    };

    [trip1, trip2, trip3].forEach((trip) => {
      this.tripsTable.set(trip.id, trip);
      this.tripSeatsIndex.set(trip.id, new Set());
    });
  }

  private generateSeats(count: number): Seat[] {
    const seats: Seat[] = [];
    let seatIndex = 0;

    // Economy seats (60%)
    const economyCount = Math.floor(count * 0.6);
    for (let i = 0; i < economyCount; i++) {
      const row = Math.floor(i / 6) + 1;
      const col = String.fromCharCode(65 + (i % 6));
      seats.push({
        number: `${col}${row}`,
        class: 'economy',
        price: 500,
        available: true,
      });
    }

    // Business seats (20%)
    const businessCount = Math.floor(count * 0.2);
    for (let i = 0; i < businessCount; i++) {
      const row = Math.floor((economyCount + i) / 6) + 1;
      const col = String.fromCharCode(65 + ((economyCount + i) % 6));
      seats.push({
        number: `${col}${row}`,
        class: 'business',
        price: 1000,
        available: true,
      });
    }

    // First class seats (20%)
    const firstCount = count - economyCount - businessCount;
    for (let i = 0; i < firstCount; i++) {
      const row = Math.floor((economyCount + businessCount + i) / 6) + 1;
      const col = String.fromCharCode(65 + ((economyCount + businessCount + i) % 6));
      seats.push({
        number: `${col}${row}`,
        class: 'first',
        price: 2000,
        available: true,
      });
    }

    return seats;
  }

  // ==================== WRITE OPERATIONS ====================

  bookTicket(ticket: Ticket): void {
    this.ticketsTable.set(ticket.id, ticket);

    // Mark seat as booked
    const bookedSeats = this.tripSeatsIndex.get(ticket.tripId);
    if (bookedSeats) {
      bookedSeats.add(ticket.seatNumber);
    }
  }

  cancelTicket(ticketId: string, cancelledDate: Date): void {
    const ticket = this.ticketsTable.get(ticketId);
    if (ticket) {
      ticket.status = 'cancelled';
      ticket.cancelledDate = cancelledDate;

      // Release seat
      const bookedSeats = this.tripSeatsIndex.get(ticket.tripId);
      if (bookedSeats) {
        bookedSeats.delete(ticket.seatNumber);
      }
    }
  }

  // ==================== READ OPERATIONS ====================

  getTicket(id: string): Ticket | undefined {
    return this.ticketsTable.get(id);
  }

  getTicketsForTrip(tripId: string): Ticket[] {
    return Array.from(this.ticketsTable.values()).filter((t) => t.tripId === tripId);
  }

  getTrip(id: string): Trip | undefined {
    return this.tripsTable.get(id);
  }

  searchTrips(from: string, to: string): Trip[] {
    return Array.from(this.tripsTable.values()).filter(
      (trip) => trip.departure.toLowerCase() === from.toLowerCase() && trip.arrival.toLowerCase() === to.toLowerCase()
    );
  }

  isSeatBooked(tripId: string, seatNumber: string): boolean {
    return this.tripSeatsIndex.get(tripId)?.has(seatNumber) ?? false;
  }

  getTripStats(tripId: string): { trip: Trip | undefined; stats: any } {
    const trip = this.getTrip(tripId);
    if (!trip) {
      return { trip: undefined, stats: {} };
    }

    const bookedSeats = this.tripSeatsIndex.get(tripId) || new Set();
    const stats = {
      total: trip.capacity,
      available: trip.capacity - bookedSeats.size,
      booked: bookedSeats.size,
      byClass: {
        economy: {
          total: trip.seats.filter((s) => s.class === 'economy').length,
          available: trip.seats.filter((s) => s.class === 'economy' && !bookedSeats.has(s.number)).length,
        },
        business: {
          total: trip.seats.filter((s) => s.class === 'business').length,
          available: trip.seats.filter((s) => s.class === 'business' && !bookedSeats.has(s.number)).length,
        },
        first: {
          total: trip.seats.filter((s) => s.class === 'first').length,
          available: trip.seats.filter((s) => s.class === 'first' && !bookedSeats.has(s.number)).length,
        },
      },
    };

    return { trip, stats };
  }
}
