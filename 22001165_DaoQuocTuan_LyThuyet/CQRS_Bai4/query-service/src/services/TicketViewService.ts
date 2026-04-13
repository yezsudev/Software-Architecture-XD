import { TicketView, TripView, Ticket, Trip, TicketBookedEvent, TicketCancelledEvent } from '../../shared/models';
import { EventBus } from '../../shared/EventBus';
import { SeatValidator } from './SeatValidator';
import { Database } from '../persistence/Database';

/**
 * TicketViewService - QueryService for ticket queries
 * Runs on port 3004
 * 
 * Responsibilities:
 * - Listen to EventBus for events published by CommandService
 * - Maintain read model cache (TicketView, TripView)
 * - Execute queries on read model
 * - Support search functionality
 * 
 * Does NOT write to CommandService database (eventual consistency)
 * Does NOT modify write model (CommandService owns that)
 */
export class TicketViewService {
  private ticketViewCache = new Map<string, TicketView>();

  constructor(
    private database: Database,
    private seatValidator: SeatValidator
  ) {
    this.setupEventListeners();
  }

  /**
   * Setup listeners for events from CommandService
   * Automatically called in constructor
   */
  setupEventListeners(): void {
    // Listen to TICKET_BOOKED events
    EventBus.subscribe('TICKET_BOOKED', (event: TicketBookedEvent) => {
      console.log(`[QueryService] Received TICKET_BOOKED event (${event.ticketId})`);

      // Get trip summary from database
      const trip = this.database.getTrip(event.tripId);
      if (!trip) {
        console.error(`  ✗ Trip ${event.tripId} not found in QueryService database`);
        return;
      }

      // Create TicketView with all derived fields
      const tripSummary = {
        id: trip.id,
        trainNumber: trip.trainNumber,
        route: `${trip.departure} → ${trip.arrival}`,
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
      };

      const ticketView: TicketView = {
        id: event.ticketId,
        tripId: event.tripId,
        tripSummary,
        passengerName: event.passengerName,
        seatNumber: event.seatNumber,
        seatClass: event.seatClass,
        price: event.price,
        status: 'confirmed',
        statusLabel: 'Confirmed',
        pnr: this.generatePNR(event.ticketId),
        bookingDate: event.bookingDate.toISOString(),
      };

      // Cache in read model
      this.ticketViewCache.set(event.ticketId, ticketView);
      console.log(`  ✓ Cached TicketView (${event.ticketId})`);
    });

    // Listen to TICKET_CANCELLED events
    EventBus.subscribe('TICKET_CANCELLED', (event: TicketCancelledEvent) => {
      console.log(`[QueryService] Received TICKET_CANCELLED event (${event.ticketId})`);

      // Update cached view
      const view = this.ticketViewCache.get(event.ticketId);
      if (view) {
        view.status = 'cancelled';
        view.statusLabel = 'Cancelled';
        view.cancelledDate = event.cancelledDate.toISOString();
        console.log(`  ✓ Updated TicketView status to cancelled (${event.ticketId})`);
      } else {
        console.warn(`  ⚠ TicketView not found in cache (${event.ticketId})`);
      }
    });

    console.log('[QueryService] Event listeners configured');
  }

  /**
   * Search trips by route with filtering and sorting
   * @returns Array of TripView with derived fields
   */
  searchTrips(from: string, to: string, seatClass?: string): TripView[] {
    // PHASE 1: Query from database
    const trips = this.database.searchTrips(from, to);

    // PHASE 2: Transform to TripView with derived fields
    const tripViews = trips.map((trip) => {
      const stats = this.seatValidator.getSeatStats(trip.id);
      const availableSeats = this.seatValidator.getAvailableSeats(trip.id);

      // Calculate duration
      const departureTime = new Date(trip.departureTime);
      const arrivalTime = new Date(trip.arrivalTime);
      const durationMs = arrivalTime.getTime() - departureTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;

      // Count available seats by class
      const economySeats = availableSeats.filter((s) => s.class === 'economy').length;
      const businessSeats = availableSeats.filter((s) => s.class === 'business').length;
      const firstSeats = availableSeats.filter((s) => s.class === 'first').length;

      // Find lowest price
      const lowestPrice = availableSeats.length > 0 ? Math.min(...availableSeats.map((s) => s.price)) : 0;

      // Create TripView with all derived fields
      const view: TripView = {
        id: trip.id,
        trainNumber: trip.trainNumber,
        route: `${trip.departure} → ${trip.arrival}`,
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
        duration: `${hours}h ${minutes}m`,
        totalSeats: trip.capacity,
        availableSeats: stats.available,
        economySeats,
        businessSeats,
        firstSeats,
        lowestPrice,
        durationMinutes,
      };

      return view;
    });

    // PHASE 3: Filter by seat class if specified
    let filtered = tripViews;
    if (seatClass) {
      filtered = tripViews.filter((trip) => {
        if (seatClass === 'economy') return trip.economySeats > 0;
        if (seatClass === 'business') return trip.businessSeats > 0;
        if (seatClass === 'first') return trip.firstSeats > 0;
        return true;
      });
    }

    // PHASE 4: Sort by departure time
    filtered.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

    return filtered;
  }

  /**
   * Get single ticket from read model cache
   */
  getTicket(id: string): TicketView | undefined {
    return this.ticketViewCache.get(id);
  }

  /**
   * Get all tickets from read model cache
   */
  getAllTickets(tripId?: string): TicketView[] {
    const tickets = Array.from(this.ticketViewCache.values());

    if (tripId) {
      return tickets.filter((t) => t.tripId === tripId);
    }

    return tickets;
  }

  /**
   * Get tickets for a specific passenger
   */
  getPassengerTickets(passengerId: string): TicketView[] {
    return Array.from(this.ticketViewCache.values()).filter((t) => t.id === passengerId);
  }

  /**
   * Generate PNR (Passenger Name Record) from ticket ID
   */
  private generatePNR(ticketId: string): string {
    return ticketId.substring(0, 6).toUpperCase();
  }

  /**
   * Get cache stats (for debugging)
   */
  getCacheStats(): { cached: number; trips: number } {
    return {
      cached: this.ticketViewCache.size,
      trips: Array.from(this.database['tripsTable'].values()).length,
    };
  }
}
