import { TicketView, TripView, TicketEvent, TicketBookedEvent, TicketCancelledEvent } from '../models';
import { Database } from '../persistence/Database';
import { EventBus } from '../events/EventBus';

/**
 * TicketViewService - QueryService for optimized read operations
 * Handles: Get Tickets, Search Trips
 * 
 * Responsibilities:
 * - Maintain optimized read models
 * - Execute search queries
 * - Listen to events for cache updates
 * - Provide derived fields
 */
export class TicketViewService {
  // Read model caches
  private ticketViewCache: Map<string, TicketView> = new Map();
  private tripViewCache: Map<string, TripView> = new Map();

  constructor(
    private database: Database,
    private eventBus: EventBus
  ) {
    this.setupEventListeners();
    this.initializeCache();
  }

  /**
   * Setup event listeners for cache updates
   */
  private setupEventListeners(): void {
    // Listen for TICKET_BOOKED events
    this.eventBus.subscribe('TICKET_BOOKED', (event) => {
      const bookedEvent = event as TicketBookedEvent;
      console.log(`📥 [TicketViewService] Received TICKET_BOOKED event: ${bookedEvent.ticketId}`);

      const view: TicketView = {
        id: bookedEvent.ticketId,
        tripId: bookedEvent.tripId,
        tripSummary: this.getTripSummary(bookedEvent.tripId),
        passengerName: bookedEvent.passengerName,
        seatNumber: bookedEvent.seatNumber,
        seatClass: bookedEvent.seatClass,
        price: bookedEvent.price,
        status: 'confirmed',
        statusLabel: 'Confirmed',
        pnr: this.generatePNR(bookedEvent.ticketId),
        bookingDate: bookedEvent.bookingDate.toISOString(),
      };

      this.ticketViewCache.set(bookedEvent.ticketId, view);
      this.updateTripViewCache(bookedEvent.tripId);
    });

    // Listen for TICKET_CANCELLED events
    this.eventBus.subscribe('TICKET_CANCELLED', (event) => {
      const cancelledEvent = event as TicketCancelledEvent;
      console.log(`📥 [TicketViewService] Received TICKET_CANCELLED event: ${cancelledEvent.ticketId}`);

      const view = this.ticketViewCache.get(cancelledEvent.ticketId);
      if (view) {
        view.status = 'cancelled';
        view.statusLabel = 'Cancelled';
        view.cancelledDate = cancelledEvent.cancelledDate.toISOString();
        this.ticketViewCache.set(cancelledEvent.ticketId, view);
      }

      this.updateTripViewCache(cancelledEvent.tripId);
    });

    console.log('✓ [TicketViewService] Event listeners initialized');
  }

  /**
   * Initialize cache with existing data
   */
  private initializeCache(): void {
    // This would load from database in real app
    console.log('✓ [TicketViewService] Cache initialized');
  }

  /**
   * Search trips by route
   * Query optimization: multiple filters, sorting
   */
  searchTrips(
    departureStation: string,
    arrivalStation: string,
    seatClass?: 'economy' | 'business' | 'first'
  ): TripView[] {
    const trips = this.database.searchTrips(departureStation, arrivalStation);

    return trips
      .map((trip) => {
        const stats = this.database.getTripStats(trip.id);
        const seats = trip.availableSeats;

        // Extract seats by class
        const economySeats = seats.filter((s) => s.seatClass === 'economy');
        const businessSeats = seats.filter((s) => s.seatClass === 'business');
        const firstSeats = seats.filter((s) => s.seatClass === 'first');

        // Calculate lowest price by class (query optimization)
        const lowestPrice = Math.min(
          economySeats.length > 0 ? Math.min(...economySeats.map((s) => s.price)) : Infinity,
          businessSeats.length > 0 ? Math.min(...businessSeats.map((s) => s.price)) : Infinity,
          firstSeats.length > 0 ? Math.min(...firstSeats.map((s) => s.price)) : Infinity
        );

        const duration = this.calculateDuration(trip.departureTime, trip.arrivalTime);
        const durationMinutes = (trip.arrivalTime.getTime() - trip.departureTime.getTime()) / (1000 * 60);

        const view: TripView = {
          id: trip.id,
          trainNumber: trip.trainNumber,
          route: `${trip.departureStation} → ${trip.arrivalStation}`,
          departureTime: trip.departureTime.toISOString(),
          arrivalTime: trip.arrivalTime.toISOString(),
          duration,
          durationMinutes,
          totalSeats: stats.totalSeats,
          availableSeats: stats.availableSeats,
          economySeats: economySeats.filter((s) => s.isAvailable).length,
          businessSeats: businessSeats.filter((s) => s.isAvailable).length,
          firstSeats: firstSeats.filter((s) => s.isAvailable).length,
          lowestPrice,
        };

        return view;
      })
      .filter((view) => {
        // Filter by seat class if specified
        if (seatClass === 'economy') return view.economySeats > 0;
        if (seatClass === 'business') return view.businessSeats > 0;
        if (seatClass === 'first') return view.firstSeats > 0;
        return true;
      })
      .sort((a, b) => {
        // Sort by departure time
        return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
      });
  }

  /**
   * Get ticket by ID
   */
  getTicket(ticketId: string): TicketView | null {
    return this.ticketViewCache.get(ticketId) || null;
  }

  /**
   * Get all tickets (with optional filtering)
   */
  getAllTickets(tripId?: string): TicketView[] {
    const tickets = Array.from(this.ticketViewCache.values());

    if (tripId) {
      return tickets.filter((t) => t.tripId === tripId);
    }

    return tickets;
  }

  /**
   * Get tickets by passenger
   */
  getPassengerTickets(passengerId: string): TicketView[] {
    return Array.from(this.ticketViewCache.values()).filter(
      (t) => t.tripSummary && t.passengerName // Filter valid entries
    );
  }

  /**
   * Get trip summary (for display)
   */
  private getTripSummary(tripId: string): { trainNumber: string; route: string; departureTime: string; arrivalTime: string } {
    const trip = this.database.getTrip(tripId);
    if (!trip) {
      return { trainNumber: '', route: '', departureTime: '', arrivalTime: '' };
    }

    return {
      trainNumber: trip.trainNumber,
      route: `${trip.departureStation} → ${trip.arrivalStation}`,
      departureTime: trip.departureTime.toISOString(),
      arrivalTime: trip.arrivalTime.toISOString(),
    };
  }

  /**
   * Update trip view cache
   */
  private updateTripViewCache(tripId: string): void {
    const trip = this.database.getTrip(tripId);
    if (!trip) return;

    const stats = this.database.getTripStats(tripId);
    const duration = this.calculateDuration(trip.departureTime, trip.arrivalTime);
    const durationMinutes = (trip.arrivalTime.getTime() - trip.departureTime.getTime()) / (1000 * 60);

    const seats = trip.availableSeats;
    const economySeats = seats.filter((s) => s.seatClass === 'economy');
    const businessSeats = seats.filter((s) => s.seatClass === 'business');
    const firstSeats = seats.filter((s) => s.seatClass === 'first');

    const lowestPrice = Math.min(
      economySeats.length > 0 ? Math.min(...economySeats.map((s) => s.price)) : Infinity,
      businessSeats.length > 0 ? Math.min(...businessSeats.map((s) => s.price)) : Infinity,
      firstSeats.length > 0 ? Math.min(...firstSeats.map((s) => s.price)) : Infinity
    );

    const view: TripView = {
      id: trip.id,
      trainNumber: trip.trainNumber,
      route: `${trip.departureStation} → ${trip.arrivalStation}`,
      departureTime: trip.departureTime.toISOString(),
      arrivalTime: trip.arrivalTime.toISOString(),
      duration,
      durationMinutes,
      totalSeats: stats.totalSeats,
      availableSeats: stats.availableSeats,
      economySeats: economySeats.filter((s) => s.isAvailable).length,
      businessSeats: businessSeats.filter((s) => s.isAvailable).length,
      firstSeats: firstSeats.filter((s) => s.isAvailable).length,
      lowestPrice,
    };

    this.tripViewCache.set(tripId, view);
  }

  /**
   * Calculate duration string (derived field)
   */
  private calculateDuration(departure: Date, arrival: Date): string {
    const minutes = (arrival.getTime() - departure.getTime()) / (1000 * 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  /**
   * Generate PNR (Passenger Name Record)
   */
  private generatePNR(ticketId: string): string {
    return ticketId.substring(0, 6).toUpperCase();
  }
}
