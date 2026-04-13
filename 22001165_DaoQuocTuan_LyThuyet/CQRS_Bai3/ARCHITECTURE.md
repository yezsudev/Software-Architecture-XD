# ARCHITECTURE - Train Ticket System (Bài 3)

## Overview

Train Ticket System is a **production-grade CQRS + Event-Driven Architecture** designed to handle complex train ticket booking operations with:
- Database persistence layer
- Complex validation logic (SeatValidator)
- Event-driven synchronization
- Search optimization with derived fields
- Real-world business rules

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Client Layer                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              API Router (ticketRoutes)                      │
│  POST /tickets, DELETE /tickets/:id, GET /tickets, etc.    │
└─────────────────┬──────────────────────────────────────────┘
          Commands │ Queries
                   ↓
   ┌───────────────────────────────────────┐
   │     TicketController                  │
   │  • bookTicket (Command)               │
   │  • cancelTicket (Command)             │
   │  • getTicket (Query)                  │
   │  • getAllTickets (Query)              │
   │  • TripController.searchTrips(Query)  │
   └───────────┬──────────────┬────────────┘
       Command │              │ Query
               ↓              ↓
   ┌──────────────────┐  ┌──────────────────────┐
   │ TicketService    │  │ TicketViewService    │
   │ (CommandService) │  │ (QueryService)       │
   └─────────┬────────┘  └──────────┬───────────┘
             │                      │
      Write Event                 Listen
             │                      │ Event
             └──────┬──────────────┬┘
                    ↓
           ┌─────────────────┐
           │   EventBus      │
           │  (Pub/Sub)      │
           └─────────────────┘
             ↓              ↓
     ┌────────────┐   ┌──────────────┐
     │ Database   │   │ Read Models  │
     │ • Tickets  │   │ • Caches     │
     │ • Trips    │   │ • Views      │
     │ • Seats    │   │              │
     └────────────┘   └──────────────┘
```

## Core Components

### 1. Controller Layer (ticketRoutes.ts + TicketController.ts)

**Responsibility:** HTTP request handling and response formatting

```typescript
// Command Routes
POST /tickets                    → TicketController.bookTicket()
DELETE /tickets/:id              → TicketController.cancelTicket()

// Query Routes
GET /tickets                     → TicketController.getAllTickets()
GET /tickets/:id                 → TicketController.getTicket()
GET /trips/search               → TripController.searchTrips()
```

**Pattern:**
```typescript
async bookTicket(req: Request, res: Response) {
  try {
    // 1. Extract & validate input
    const { tripId, passengerId, passengerName, seatNumber } = req.body;
    
    // 2. Call CommandService
    const ticket = this.ticketService.bookTicket({
      tripId, passengerId, passengerName, seatNumber
    });
    
    // 3. Format response
    return res.status(201).json({
      success: true,
      message: `Ticket booked successfully on seat ${seatNumber}`,
      data: ticket
    });
  } catch (error) {
    // 4. Error handling
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}
```

### 2. CommandService (TicketService.ts)

**Responsibility:** Write operations with persistence and event publishing

#### bookTicket() - Complete Flow

```typescript
bookTicket(command: BookTicketCommand): Ticket {
  // PHASE 1: VALIDATION
  // ─────────────────────
  // Delegate validation to SeatValidator (separation of concerns)
  const validation = this.seatValidator.validateSeatAvailability(
    command.tripId,
    command.seatNumber
  );
  
  if (!validation.isValid) {
    throw new Error(validation.message);
    // Stops execution if seat invalid/booked/not found
  }
  
  // PHASE 2: PRICING
  // ────────────────
  // Get available seats to find pricing
  const availableSeats = this.seatValidator.getAvailableSeats(
    command.tripId
  );
  
  // Find seat details for pricing
  const seat = availableSeats.find(
    s => s.seatNumber === command.seatNumber
  );
  const price = seat.price;
  
  // PHASE 3: PERSISTENCE
  // ────────────────────
  // Create Ticket entity (write model)
  const ticketId = uuidv4();
  const ticket: Ticket = {
    id: ticketId,
    tripId: command.tripId,
    passengerId: command.passengerId,
    passengerName: command.passengerName,
    seatNumber: command.seatNumber,
    seatClass: seat.class,
    price: price,
    status: 'confirmed',
    bookingDate: new Date()
  };
  
  // Persist to database
  // This updates:
  // - ticketsTable (new entry)
  // - tripSeatsIndex (marks seat as booked)
  this.database.bookTicket(ticket);
  
  // PHASE 4: EVENT PUBLISHING
  // ──────────────────────────
  // Create event from ticket data
  const event: TicketBookedEvent = {
    type: 'TICKET_BOOKED',
    ticketId: ticket.id,
    tripId: command.tripId,
    passengerId: command.passengerId,
    passengerName: command.passengerName,
    seatNumber: command.seatNumber,
    seatClass: seat.class,
    price: price,
    bookingDate: ticket.bookingDate
  };
  
  // Publish to EventBus
  // All subscribers (e.g., TicketViewService) will be notified
  this.eventBus.publish(event);
  
  // PHASE 5: RETURN
  // ────────────────
  // Return to controller
  return ticket;
}
```

**Key Characteristic:** CommandService doesn't call QueryService. Sync happens via EventBus.

#### cancelTicket() - Cancellation Flow

```typescript
cancelTicket(command: CancelTicketCommand): Ticket {
  // 1. Get ticket from database
  const ticket = this.database.getTicket(command.ticketId);
  
  // 2. Validate cancellation allowed
  const validation = this.seatValidator.validateCancellation(
    ticket.tripId,
    command.ticketId
  );
  
  if (!validation.isValid) {
    throw new Error(validation.message);
  }
  
  // 3. Update status in database
  ticket.status = 'cancelled';
  ticket.cancelledDate = new Date();
  this.database.cancelTicket(ticket.id, ticket.cancelledDate);
  
  // 4. Publish cancellation event
  const event: TicketCancelledEvent = {
    type: 'TICKET_CANCELLED',
    ticketId: ticket.id,
    tripId: ticket.tripId,
    seatNumber: ticket.seatNumber,
    reason: command.reason,
    cancelledDate: ticket.cancelledDate
  };
  
  this.eventBus.publish(event);
  
  // 5. Return updated ticket
  return ticket;
}
```

### 3. SeatValidator (src/services/SeatValidator.ts)

**Responsibility:** Complex business logic - Verify seat availability and business rules

```typescript
class SeatValidator {
  // Core validation methods
  
  validateSeatAvailability(tripId: string, seatNumber: string): {isValid, message}
    └─ Checks:
       1. Trip exists
       2. Seat exists for trip
       3. Seat not already booked
       4. Seat number format valid
    └─ Returns: {isValid: true/false, message: string}
  
  getAvailableSeats(tripId: string): Array<{seatNumber, class, price}>
    └─ Returns all available seats for trip
    └─ Used for validation and pricing
  
  getSeatStats(tripId: string): {total, available, booked, byClass: {...}}
    └─ Provides aggregated seat statistics
    └─ Used in TripView for search results
  
  validateCancellation(tripId: string, ticketId: string): {isValid, message}
    └─ Checks:
       1. Ticket exists
       2. Ticket not already cancelled
       3. Trip not departed (future validation)
    └─ Business rule enforcement
}
```

**Design Pattern:** Extraction of complex business logic from service layer

### 4. Database Layer (src/persistence/Database.ts)

**Responsibility:** Persistence operations with seat reservation tracking

#### Database Structure

```typescript
class Database {
  // Tables
  private ticketsTable = new Map<string, Ticket>();
  private tripsTable = new Map<string, Trip>();
  
  // Indexes for fast lookup
  private tripSeatsIndex = new Map<string, Set<string>>();
  // tripSeatsIndex[tripId] = Set of booked seat numbers
  
  // Methods
  
  // INITIALIZATION
  initialize(): void
    └─ Called on app startup
    └─ Seeds 3 sample trips with full seat layouts
  
  // WRITE OPERATIONS
  bookTicket(ticket: Ticket): void
    └─ Persists ticket to ticketsTable
    └─ Adds seat to tripSeatsIndex[tripId]
    └─ Marks seat as unavailable
  
  cancelTicket(ticketId: string, cancelledDate: Date): void
    └─ Updates ticket status to 'cancelled'
    └─ Removes seat from tripSeatsIndex[tripId]
    └─ Marks seat as available again
  
  // READ OPERATIONS
  getTicket(id: string): Ticket
    └─ Retrieve single ticket
  
  getTrip(id: string): Trip
    └─ Retrieve single trip
  
  searchTrips(from: string, to: string): Trip[]
    └─ Filter trips by route
  
  isSeatBooked(tripId: string, seatNumber: string): boolean
    └─ Quick check for seat availability
  
  getTicketsForTrip(tripId: string): Ticket[]
    └─ Get all tickets (booked/cancelled) for trip
  
  getTripStats(tripId: string): {trip, stats}
    └─ Return trip with seat statistics
}
```

#### Seed Data Structure

Three sample trips are initialized:

**TRIP001: Bangkok → Chiang Mai**
```
├─ Seats: 100 total
│  ├─ 60 economy (@500)
│  ├─ 20 business (@1000)
│  └─ 20 first class (@2000)
├─ Departure: 10:00 AM
├─ Arrival: 6:30 PM (8h 30m)
└─ Status: All available initially
```

**TRIP002: Bangkok → Chiang Mai**
```
├─ Seats: 80 total
│  ├─ 50 economy (@500)
│  ├─ 15 business (@1000)
│  └─ 15 first class (@2000)
├─ Departure: 2:00 PM
├─ Arrival: 10:30 PM (8h 30m)
└─ Status: All available initially
```

**TRIP003: Bangkok → Phuket**
```
├─ Seats: 120 total
│  ├─ 80 economy (@400)
│  ├─ 25 business (@900)
│  └─ 15 first class (@1800)
├─ Departure: 8:00 AM
├─ Arrival: 1:00 PM (5h duration)
└─ Status: All available initially
```

**Key Index:** `tripSeatsIndex[tripId] = Set('A1', 'B5', 'C3', ...)`
- Fast O(1) lookup: `isSeatBooked('TRIP001', 'A1')`
- Prevents double-booking

### 5. QueryService (TicketViewService.ts)

**Responsibility:** Read operations with optimized views and derived fields

#### Event Listener Setup

```typescript
setupEventListeners(): void {
  // Subscribe to TICKET_BOOKED
  this.eventBus.subscribe('TICKET_BOOKED', (event: TicketBookedEvent) => {
    // Create TicketView from event data
    const ticketView: TicketView = {
      id: event.ticketId,
      tripId: event.tripId,
      tripSummary: this.getTripSummary(event.tripId),
      passengerName: event.passengerName,
      seatNumber: event.seatNumber,
      seatClass: event.seatClass,
      price: event.price,
      status: 'confirmed',
      statusLabel: 'Confirmed',
      pnr: this.generatePNR(event.ticketId),  // Derived
      bookingDate: event.bookingDate.toISOString()
    };
    
    // Cache in read model
    this.ticketViewCache.set(event.ticketId, ticketView);
  });
  
  // Subscribe to TICKET_CANCELLED
  this.eventBus.subscribe('TICKET_CANCELLED', (event: TicketCancelledEvent) => {
    // Update existing cached view
    const view = this.ticketViewCache.get(event.ticketId);
    if (view) {
      view.status = 'cancelled';
      view.statusLabel = 'Cancelled';
      view.cancelledDate = event.cancelledDate.toISOString();
    }
  });
}
```

#### searchTrips() - Query Optimization

```typescript
searchTrips(from: string, to: string, seatClass?: 'economy' | 'business' | 'first'): TripView[] {
  // PHASE 1: DATABASE QUERY
  // ───────────────────────
  const trips = this.database.searchTrips(from, to);
  
  // PHASE 2: DERIVED FIELDS CALCULATION
  // ────────────────────────────────────
  const tripViews = trips.map(trip => {
    // Get seat statistics from validator
    const stats = this.seatValidator.getSeatStats(trip.id);
    
    // Get available seats for filtering
    const availableSeats = this.seatValidator.getAvailableSeats(trip.id);
    
    // Calculate derived fields
    const departureTime = new Date(trip.departureTime);
    const arrivalTime = new Date(trip.arrivalTime);
    const durationMs = arrivalTime.getTime() - departureTime.getTime();
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    // Count available seats by class
    const economySeats = availableSeats.filter(s => s.class === 'economy').length;
    const businessSeats = availableSeats.filter(s => s.class === 'business').length;
    const firstSeats = availableSeats.filter(s => s.class === 'first').length;
    
    // Find lowest price per class
    const lowestPrice = Math.min(
      ...availableSeats.map(s => s.price)
    );
    
    // Create TripView with all derived fields
    const view: TripView = {
      id: trip.id,
      trainNumber: trip.trainNumber,
      route: `${trip.departure} → ${trip.arrival}`,           // Derived
      departureTime: trip.departureTime.toISOString(),
      arrivalTime: trip.arrivalTime.toISOString(),
      duration: `${hours}h ${minutes}m`,                       // Derived
      totalSeats: trip.capacity,
      availableSeats: stats.available,                         // Derived
      economySeats: economySeats,                              // Derived
      businessSeats: businessSeats,                            // Derived
      firstSeats: firstSeats,                                  // Derived
      lowestPrice: lowestPrice,                                // Derived
      durationMinutes: durationMinutes                         // Derived (for sorting)
    };
    
    return view;
  });
  
  // PHASE 3: FILTERING BY SEAT CLASS
  // ─────────────────────────────────
  if (seatClass) {
    // Filter to only trips with availability in requested class
    return tripViews.filter(trip => {
      if (seatClass === 'economy') return trip.economySeats > 0;
      if (seatClass === 'business') return trip.businessSeats > 0;
      if (seatClass === 'first') return trip.firstSeats > 0;
    });
  }
  
  // PHASE 4: SORTING
  // ────────────────
  // Sort by departure time
  return tripViews.sort((a, b) => {
    return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
  });
}
```

**Optimization Strategy:**
- All derived fields calculated **during query execution**, not on retrieval
- Caching not needed for these calculations (database is small)
- Ready for scaling to large datasets with materialized views

### 6. EventBus (src/events/EventBus.ts)

**Responsibility:** Pub/Sub broker for loose coupling

```typescript
class EventBus {
  private subscribers = new Map<string, Handler[]>();
  
  subscribe(eventType: string, handler: (event: any) => void): void {
    // Register handler for event type
    // Multiple handlers can listen to same event type
  }
  
  publish(event: any): void {
    // Publish event to all subscribers
    // Each subscriber called with full event data
    // Error in one subscriber doesn't affect others (error isolation)
  }
}
```

**Event Types:**
```typescript
type Event = 
  | TicketBookedEvent
  | TicketCancelledEvent
  | SeatReservedEvent
  | SeatReleasedEvent;
```

## CQRS Pattern Implementation

### Command Side (TicketService)
```
User Command
    ↓
Validation (SeatValidator)
    ↓
Write to Database
    ↓
Publish Event
    ↓
Return Command Result
```

### Query Side (TicketViewService)
```
Listen to Events
    ↓
Update Read Model Cache
    ↓
User Query
    ↓
Retrieve from Cache
    ↓
Return Query Result
```

### Key Principle: Eventual Consistency
- Command completes immediately (database write + event publish)
- Read model updates asynchronously (on event receipt)
- Small delay between write and read (milliseconds)
- Acceptable for most use cases

## Data Flow Sequences

### Booking Flow

```
1. Client: POST /tickets
   │
2. Controller: Extract & validate input
   │
3. CommandService.bookTicket()
   ├─ SeatValidator.validateSeatAvailability()
   ├─ Database.bookTicket()
   └─ EventBus.publish(TICKET_BOOKED)
   │
4. EventBus: Route event to subscribers
   │
5. QueryService: Receive TICKET_BOOKED
   ├─ Create TicketView
   └─ Cache in ticketViewCache
   │
6. Controller: Return ticket to client
   │
7. Client: Receives booked ticket
```

### Search Flow

```
1. Client: GET /trips/search?from=Bangkok&to=ChiangMai
   │
2. Controller: Extract query parameters
   │
3. QueryService.searchTrips()
   ├─ Database.searchTrips() → trips array
   ├─ For each trip:
   │  ├─ SeatValidator.getSeatStats()
   │  ├─ SeatValidator.getAvailableSeats()
   │  └─ Calculate derived fields
   ├─ Filter by seat class (if specified)
   └─ Sort by departure time
   │
4. Controller: Format response
   │
5. Client: Receives TripView array with derived fields
```

## Business Logic Layer (SeatValidator)

### Why Extract Validation?

❌ **Anti-pattern:**
```typescript
// Validation mixed in CommandService
bookTicket() {
  if (!trip) throw Error("Trip not found");
  if (!seat) throw Error("Seat not found");
  if (isSeatBooked) throw Error("Seat already booked");
  if (trip.departureTime < now) throw Error("Trip departed");
  // ... more logic
}
```

✅ **SOLID Pattern:**
```typescript
// Validation extracted to dedicated class
const validation = seatValidator.validateSeatAvailability(tripId, seatNumber);
if (!validation.isValid) throw new Error(validation.message);
```

**Benefits:**
- Single Responsibility Principle
- Reusable validation logic
- Easy to test
- Easy to extend with new rules

## Scalability Considerations

### Current Architecture (Bài 3)
- ✓ In-memory database (fast)
- ✓ Event-driven (loosely coupled)
- ✓ Separate command/query services
- ✗ Single-node only
- ✗ Data lost on restart

### Production Scaling

**Short-term (Bài 3 → Production v1):**
```
Replace Database class with real storage:
├─ MongoDB (document DB)
├─ PostgreSQL (relational DB)
└─ Any persistence provider
```

**Medium-term (Production v2):**
```
Add message queue for events:
├─ RabbitMQ
├─ Kafka
└─ AWS SNS/SQS
```

**Long-term (Production v3):**
```
Add event store & materialized views:
├─ Event sourcing
├─ CQRS with separate read/write databases
└─ Distributed transactions
```

## Testing Strategy

### Unit Tests (Not Implemented in Bài 3)

```typescript
// SeatValidator tests
describe('SeatValidator', () => {
  it('should validate available seat', () => {
    const result = validator.validateSeatAvailability('TRIP001', 'A1');
    expect(result.isValid).toBe(true);
  });
  
  it('should reject booked seat', () => {
    database.bookTicket({...seatNumber: 'A1'...});
    const result = validator.validateSeatAvailability('TRIP001', 'A1');
    expect(result.isValid).toBe(false);
  });
});
```

### Integration Tests

```typescript
// Book → Cancel flow
describe('Ticket Lifecycle', () => {
  it('should book and cancel ticket', () => {
    // 1. Book ticket
    const ticket = service.bookTicket(command);
    expect(ticket.status).toBe('confirmed');
    
    // 2. Verify seat booked
    const available = validator.getAvailableSeats(tripId);
    expect(available.find(s => s.seatNumber === 'A1')).toBeUndefined();
    
    // 3. Verify event published
    expect(eventBusPublishSpy).toHaveBeenCalledWith(TicketBookedEvent);
    
    // 4. Cancel ticket
    const cancelled = service.cancelTicket(command);
    expect(cancelled.status).toBe('cancelled');
    
    // 5. Verify seat available again
    const availableAfterCancel = validator.getAvailableSeats(tripId);
    expect(availableAfterCancel.find(s => s.seatNumber === 'A1')).toBeDefined();
  });
});
```

## Evolution Path: Bài 1 → Bài 2 → Bài 3

| Aspect | Bài 1 | Bài 2 | Bài 3 |
|--------|-------|-------|-------|
| **Sync Strategy** | Manual | Event-driven | Event-driven |
| **Persistence** | In-memory Map | In-memory Map | Database Layer |
| **Validation** | Minimal | Minimal | Complex (SeatValidator) |
| **Domain Complexity** | Todo (simple) | Order (medium) | Ticket (complex) |
| **Derived Fields** | No | Yes | Many |
| **Business Rules** | Simple | Medium | Complex |
| **Production Ready** | No | Partial | Yes |
| **Architectural Maturity** | Basic | Intermediate | Advanced |

## Conclusion

Bài 3 represents a **mature CQRS implementation** suitable for production systems with:
- ✓ Clear separation of concerns
- ✓ Event-driven architecture
- ✓ Business logic extracted to validators
- ✓ Database abstraction for extensibility
- ✓ Real-world domain complexity
- ✓ Scalability foundations

This architecture can be deployed as-is for small-to-medium systems, or evolved toward event sourcing and CQRS with separate read/write databases for large-scale systems.
