/**
 * Shared Models used by both CommandService and QueryService
 */

// ==================== WRITE MODELS ====================

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

export interface Trip {
  id: string;
  trainNumber: string;
  departure: string;
  arrival: string;
  departureTime: Date;
  arrivalTime: Date;
  capacity: number;
  seats: Seat[];
}

export interface Seat {
  number: string;
  class: 'economy' | 'business' | 'first';
  price: number;
  available: boolean;
}

// ==================== READ MODELS ====================

export interface TicketView {
  id: string;
  tripId: string;
  tripSummary: {
    id: string;
    trainNumber: string;
    route: string;
    departureTime: string;
    arrivalTime: string;
  };
  passengerName: string;
  seatNumber: string;
  seatClass: string;
  price: number;
  status: string;
  statusLabel: string;
  pnr: string;
  bookingDate: string;
  cancelledDate?: string;
}

export interface TripView {
  id: string;
  trainNumber: string;
  route: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  totalSeats: number;
  availableSeats: number;
  economySeats: number;
  businessSeats: number;
  firstSeats: number;
  lowestPrice: number;
  durationMinutes: number;
}

// ==================== COMMANDS ====================

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
  from: string;
  to: string;
  seatClass?: string;
}

// ==================== EVENTS ====================

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
  reservedBy: string;
  reservedAt: Date;
}

export interface SeatReleasedEvent {
  type: 'SEAT_RELEASED';
  tripId: string;
  seatNumber: string;
  releasedAt: Date;
}

export type Event = TicketBookedEvent | TicketCancelledEvent | SeatReservedEvent | SeatReleasedEvent;
