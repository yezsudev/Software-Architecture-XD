/**
 * Domain Models for Train Ticket System
 */

// ============================================
// Write Model (Command Side)
// ============================================

/**
 * Seat - Represents a seat in a train car
 */
export interface Seat {
  seatNumber: string;      // e.g., "A1", "A2", "B1"
  seatClass: 'economy' | 'business' | 'first'; // Class
  isAvailable: boolean;    // Availability status
  price: number;           // Price at booking time
}

/**
 * Ticket - Represents a booked ticket (Write Model)
 */
export interface Ticket {
  id: string;
  tripId: string;
  passengerId: string;
  passengerName: string;
  seatNumber: string;
  seatClass: 'economy' | 'business' | 'first';
  price: number;
  status: 'confirmed' | 'cancelled';
  bookingDate: Date;
  cancelledDate?: Date;
}

/**
 * Trip - Represents a train trip (Write Model)
 */
export interface Trip {
  id: string;
  trainNumber: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: Date;
  arrivalTime: Date;
  totalSeats: number;
  availableSeats: Seat[];
  bookedSeats: Map<string, Ticket>;  // seat -> ticket mapping
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reservation - Atomic reservation unit
 */
export interface Reservation {
  id: string;
  ticketId: string;
  tripId: string;
  passengerId: string;
  seatNumber: string;
  reservedAt: Date;
  expiresAt: Date;  // Auto-cancel if not confirmed
}

// ============================================
// Read Model (Query Side)
// ============================================

/**
 * TicketView - Optimized for read operations
 */
export interface TicketView {
  id: string;
  tripId: string;
  tripSummary: {
    trainNumber: string;
    route: string;    // "Bangkok → Chiang Mai"
    departureTime: string;  // ISO string
    arrivalTime: string;
  };
  passengerName: string;
  seatNumber: string;
  seatClass: string;
  price: number;
  status: string;
  statusLabel: string;  // Thai/Vietnamese labels
  pnr: string;          // Booking reference
  bookingDate: string;
  cancelledDate?: string;
}

/**
 * TripView - Optimized for search results
 */
export interface TripView {
  id: string;
  trainNumber: string;
  route: string;              // Derived: "Bangkok → Chiang Mai"
  departureTime: string;      // ISO string
  arrivalTime: string;
  duration: string;           // Derived: "8h 30m"
  totalSeats: number;
  availableSeats: number;     // Derived: counted
  economySeats: number;       // Derived: by class
  businessSeats: number;
  firstSeats: number;
  lowestPrice: number;        // Derived: min price by class
  durationMinutes: number;    // Derived: for sorting
}

/**
 * SeatView - For seat selection UI
 */
export interface SeatView {
  seatNumber: string;
  seatClass: string;
  isAvailable: boolean;
  price: number;
  status: 'available' | 'occupied' | 'selected';
}

// ============================================
// Commands
// ============================================

export interface BookTicketCommand {
  tripId: string;
  passengerId: string;
  passengerName: string;
  seatNumber: string;
}

export interface CancelTicketCommand {
  ticketId: string;
  reason?: string;
}

export interface SearchTripsCommand {
  departureStation: string;
  arrivalStation: string;
  departureDate: string;  // YYYY-MM-DD
  seatClass?: 'economy' | 'business' | 'first';
}

// ============================================
// Events (Event-Driven Architecture)
// ============================================

export type TicketEvent = 
  | TicketBookedEvent 
  | TicketCancelledEvent 
  | SeatReservedEvent 
  | SeatReleasedEvent;

export interface TicketBookedEvent {
  type: 'TICKET_BOOKED';
  ticketId: string;
  tripId: string;
  passengerId: string;
  passengerName: string;
  seatNumber: string;
  seatClass: string;
  price: number;
  bookingDate: Date;
}

export interface TicketCancelledEvent {
  type: 'TICKET_CANCELLED';
  ticketId: string;
  tripId: string;
  seatNumber: string;
  reason?: string;
  cancelledDate: Date;
}

export interface SeatReservedEvent {
  type: 'SEAT_RESERVED';
  tripId: string;
  seatNumber: string;
  reservedAt: Date;
}

export interface SeatReleasedEvent {
  type: 'SEAT_RELEASED';
  tripId: string;
  seatNumber: string;
  releasedAt: Date;
}

// ============================================
// Database Models
// ============================================

/**
 * Database schema - What gets persisted
 */
export interface TicketRecord {
  id: string;
  tripId: string;
  passengerId: string;
  passengerName: string;
  seatNumber: string;
  seatClass: string;
  price: number;
  status: string;
  bookingDate: string;  // ISO
  cancelledDate?: string;
}

export interface TripRecord {
  id: string;
  trainNumber: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;  // ISO
  arrivalTime: string;
  totalSeats: number;
  seatsLayout: Array<{
    seatNumber: string;
    class: string;
    price: number;
  }>;
  createdAt: string;
  updatedAt: string;
}
