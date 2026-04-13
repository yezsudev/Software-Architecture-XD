# ARCHITECTURE - Bài 4: Microservices + Event-Driven CQRS

## Executive Summary

**Bài 4** implements a **production-grade microservices architecture** with:
- ✅ **Two independent services** (Command on port 3003, Query on port 3004)
- ✅ **Global event broker** (simulated Kafka/RabbitMQ)
- ✅ **Loose coupling** (services don't know each other)
- ✅ **Independent scaling** (scale each service based on load)
- ✅ **Eventual consistency** (acceptable for business domains)

This is the **final evolution** of CQRS pattern into **distributed microservices**.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    API Gateway (Future)                        │
│            (Routes, Auth, Rate limiting)                       │
└───────┬────────────────────────────┬──────────────────────┬────┘
        │                            │                      │
   Commands              Queries                       Health
        │                            │                      │
        ▼                            ▼                      ▼
┌─────────────────┐      ┌──────────────────┐      ┌──────────────┐
│ COMMAND SERVICE │      │  QUERY SERVICE   │      │ API Client   │
│   (Port 3003)   │      │   (Port 3004)    │      │              │
└─────────────────┘      └──────────────────┘      └──────────────┘
│                        │
├─ Database             ├─ Database (read-only)
│  (Write Model)        │  (Replica)
├─ SeatValidator      ├─ TicketViewService
├─ TicketService      │  (Maintains cache)
└─ Validates          ├─ SeatValidator
  & Persists           │  (Reads stats)
                       └─ Event Listeners
                          (Updates cache)
        │                            │
        └────────────┬───────────────┘
                     │
                ┌────▼─────┐
                │ EventBus │
                │ (Global) │
                └──────────┘
```

---

## Detailed Component Architecture

### 1. Shared EventBus (Global Message Broker)

**Location:** `shared/EventBus.ts`

**Pattern:** Singleton (static class)

**Characteristics:**
- Global subscribers registry
- Event type → Handler[] mapping
- Error isolation
- Synchronous in-memory (can be replaced with Kafka async)

**Implementation:**
```typescript
class EventBus {
  private static subscribers = new Map<string, Handler[]>();
  
  static subscribe(eventType: string, handler: Handler): void
    └─ Add listener for event type
  
  static publish(event: any): void
    └─ Call all handlers for event.type
}
```

**Usage:**
```typescript
// In QueryService
EventBus.subscribe('TICKET_BOOKED', (event) => {
  // Update read model
  ticketViewCache.set(event.ticketId, view);
});

// In CommandService
EventBus.publish({
  type: 'TICKET_BOOKED',
  ticketId: '...',
  ...
});
```

**Real-World Mapping:**

| Aspect | EventBus (Bài 4) | RabbitMQ | Kafka |
|--------|------------------|----------|-------|
| **Transport** | In-memory | TCP network | TCP network |
| **Persistence** | No | Yes (optional) | Yes (always) |
| **Clustering** | Single process | Multiple nodes | Multiple brokers |
| **Ordering** | Insertion order | Per queue | Per partition |
| **Scalability** | Single instance | Moderate | High |

---

### 2. Command Service (Port 3003)

**Layer:** Write Model (CQRS)

**Owner:** CommandService exclusively

**Responsibilities:**
1. ✓ Validate commands
2. ✓ Persist writes
3. ✓ Publish events
4. ✗ No reads from other services

#### Architecture

```
HTTP Request (POST /tickets)
    │
    ▼
TicketController
    │
    ├─ Extract & validate input
    │
    ▼
TicketService.bookTicket()
    │
    ├─ SeatValidator.validateSeatAvailability()
    │   │
    │   ├─ Trip exists? ✓
    │   ├─ Seat exists? ✓
    │   └─ Seat not booked? ✓
    │
    ├─ Database.bookTicket()
    │   │
    │   ├─ Create Ticket entity
    │   ├─ Persist to ticketsTable
    │   └─ Update tripSeatsIndex (booked list)
    │
    ├─ EventBus.publish(TICKET_BOOKED)
    │   │
    │   └─ Notify all subscribers
    │
    └─ Return Ticket to controller
        │
        ▼
    HTTP 201 Accepted
```

#### Key Components

**Database (CommandService)**
```typescript
class Database {
  private ticketsTable = new Map<string, Ticket>();
  private tripsTable = new Map<string, Trip>();
  private tripSeatsIndex = new Map<string, Set<string>>();
  
  // Operations
  initialize()      // Seed 3 trips on startup
  bookTicket()      // Persist: add to ticketsTable, mark in index
  cancelTicket()    // Update status, release seat from index
  getTicket()       // Retrieve from ticketsTable
}
```

**SeatValidator (CommandService)**
```typescript
class SeatValidator {
  validateSeatAvailability(tripId, seatNumber)
    /// ├─ Check trip exists
    // ├─ Check seat exists
    // └─ Check not booked
  
  getAvailableSeats(tripId)
    // Return: [{seatNumber, class, price}, ...]
  
  getSeatStats(tripId)
    // Return: {total, available, booked, byClass}
  
  validateCancellation(tripId, ticketId)
    // Check ticket exists, not cancelled, belongs to trip
}
```

**TicketService (CommandService)**
```typescript
class TicketService {
  bookTicket(command: BookTicketCommand): Ticket {
    // 1. Validate
    const validation = validator.validateSeatAvailability(...);
    
    // 2. Get pricing
    const seat = validator.getAvailableSeats(...).find(...);
    
    // 3. Persist
    const ticket: Ticket = { ... };
    this.database.bookTicket(ticket);
    
    // 4. Publish Event
    EventBus.publish({
      type: 'TICKET_BOOKED',
      ticketId: ticket.id,
      tripId: ...,
      ...
    });
    
    return ticket;
  }
  
  cancelTicket(command: CancelTicketCommand): Ticket {
    // 1. Get ticket
    const ticket = this.database.getTicket(command.ticketId);
    
    // 2. Validate
    validator.validateCancellation(...);
    
    // 3. Persist cancellation
    this.database.cancelTicket(command.ticketId, new Date());
    
    // 4. Publish Event
    EventBus.publish({
      type: 'TICKET_CANCELLED',
      ticketId: ...,
      ...
    });
    
    return ticket;
  }
}
```

---

### 3. Query Service (Port 3004)

**Layer:** Read Model (CQRS)

**Owner:** QueryService exclusively

**Responsibilities:**
1. ✓ Listen to EventBus
2. ✓ Maintain read model cache
3. ✓ Execute queries
4. ✗ Never write to external systems
5. ✗ Never modify CommandService

#### Architecture

```
Step 1: Initialization
TicketViewService constructor
    │
    ├─ Initialize Database (read-only replica)
    │   └─ Seed same 3 trips as CommandService
    │
    └─ setupEventListeners()
        │
        ├─ Subscribe to TICKET_BOOKED
        │   │
        │   └─ Handler: Create TicketView, cache it
        │
        └─ Subscribe to TICKET_CANCELLED
            │
            └─ Handler: Update cached TicketView status

Step 2: Event Processing
EventBus publishes TICKET_BOOKED
    │
    └─→ QueryService listener triggered
        │
        ├─ event: {type, ticketId, tripId, ...}
        │
        ├─ Fetch trip summary from database
        │
        ├─ Create TicketView with derived fields
        │   │
        │   ├─ tripSummary (denormalized)
        │   ├─ statusLabel (derived: "Confirmed")
        │   ├─ pnr (derived: first 6 chars of ID)
        │   └─ bookingDate (formatted)
        │
        └─ Cache in ticketViewCache
            │
            └─ ticketViewCache.set(ticketId, view)

Step 3: Query Execution
GET /tickets/{id}
    │
    ├─ TicketController.getTicket(id)
    │
    └─ TicketViewService.getTicket(id)
        │
        ├─ Query cache (O(1) lookup)
        │
        └─ Return TicketView
            │
            ▼
        HTTP 200 OK
```

#### Key Components

**Database (QueryService - Read-Only)**
```typescript
class Database {
  private ticketsTable = new Map<string, Ticket>();
  private tripsTable = new Map<string, Trip>();
  private tripSeatsIndex = new Map<string, Set<string>>();
  
  // READ operations only
  getTicket(id)         // Retrieve from cache
  searchTrips(from, to) // Query trips
  isSeatBooked(...)     // Check index
  getTripStats(...)     // Calculate stats
  
  // UPDATE operations (called by event listeners)
  bookSeat(tripId, seatNumber)     // Mark seat booked
  releaseSeat(tripId, seatNumber)  // Unmark seat
  cacheTicket(ticket)              // Store ticket
}
```

**TicketViewService (QueryService)**
```typescript
class TicketViewService {
  private ticketViewCache = new Map<string, TicketView>();
  
  setupEventListeners(): void {
    EventBus.subscribe('TICKET_BOOKED', (event) => {
      // Create optimized read view
      const view: TicketView = {
        id: event.ticketId,
        tripId: event.tripId,
        tripSummary: {
          // Denormalized trip info
          id: trip.id,
          trainNumber: trip.trainNumber,
          route: `${trip.departure} → ${trip.arrival}`,
          departureTime: trip.departureTime.toISOString(),
          arrivalTime: trip.arrivalTime.toISOString()
        },
        passengerName: event.passengerName,
        seatNumber: event.seatNumber,
        seatClass: event.seatClass,
        price: event.price,
        status: 'confirmed',
        statusLabel: 'Confirmed',       // Derived
        pnr: this.generatePNR(...),    // Derived
        bookingDate: event.bookingDate.toISOString()
      };
      
      // Cache in memory
      this.ticketViewCache.set(event.ticketId, view);
    });
    
    EventBus.subscribe('TICKET_CANCELLED', (event) => {
      // Update existing cached view
      const view = this.ticketViewCache.get(event.ticketId);
      if (view) {
        view.status = 'cancelled';
        view.statusLabel = 'Cancelled';
        view.cancelledDate = event.cancelledDate.toISOString();
      }
    });
  }
  
  searchTrips(from: string, to: string, seatClass?: string): TripView[] {
    // Phase 1: Query database
    const trips = this.database.searchTrips(from, to);
    
    // Phase 2: Transform to TripView
    const views = trips.map(trip => {
      const stats = seatValidator.getSeatStats(trip.id);
      const available = seatValidator.getAvailableSeats(trip.id);
      
      // Calculate derived fields
      const durationMs = arrivalTime - departureTime;
      const durationMinutes = durationMs / (1000 * 60);
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      return {
        id: trip.id,
        trainNumber: trip.trainNumber,
        route: `${trip.departure} → ${trip.arrival}`,          // Derived
        departureTime: trip.departureTime.toISOString(),
        arrivalTime: trip.arrivalTime.toISOString(),
        duration: `${hours}h ${minutes}m`,                      // Derived
        totalSeats: trip.capacity,
        availableSeats: stats.available,                        // Derived
        economySeats: available.filter(s => s.class === 'economy').length, // Derived
        businessSeats: available.filter(s => s.class === 'business').length,
        firstSeats: available.filter(s => s.class === 'first').length,
        lowestPrice: Math.min(...available.map(s => s.price)),  // Derived
        durationMinutes
      };
    });
    
    // Phase 3: Filter by seat class
    if (seatClass) {
      views = views.filter(trip => {
        if (seatClass === 'economy') return trip.economySeats > 0;
        if (seatClass === 'business') return trip.businessSeats > 0;
        if (seatClass === 'first') return trip.firstSeats > 0;
      });
    }
    
    // Phase 4: Sort
    return views.sort((a, b) => 
      new Date(a.departureTime).getTime() - 
      new Date(b.departureTime).getTime()
    );
  }
  
  getTicket(id: string): TicketView | undefined {
    return this.ticketViewCache.get(id);  // O(1) lookup
  }
  
  getAllTickets(tripId?: string): TicketView[] {
    const all = Array.from(this.ticketViewCache.values());
    return tripId ? all.filter(t => t.tripId === tripId) : all;
  }
}
```

---

## CQRS Pattern in Microservices

### Write Path (Command)

```
POST /tickets (to CommandService:3003)
    │
    ▼
TicketService.bookTicket()
├─ Validate (SeatValidator)
├─ Persist (Database.bookTicket)
└─ Publish (EventBus.publish)
    │
    ▼
EventBus routes TICKET_BOOKED
    │
    ▼
QueryService listener
└─ Create TicketView
```

**Key:** Write completes immediately, read lags behind by milliseconds.

### Read Path (Query)

```
GET /tickets/{id} (to QueryService:3004)
    │
    ▼
TicketViewService.getTicket(id)
└─ Query cache (O(1))
    │
    ▼
Return TicketView with all derived fields
```

**Key:** Reads are fast because events updated the cache already.

---

## Eventual Consistency

### Definition
Services don't share database. Consistency is achieved **eventually** (not immediately).

### Timeline Example

```
T=0ms:    User POST /tickets to CommandService
          CommandService commits to its database
          CommandService publishes TICKET_BOOKED
          Returns 201 Created immediately
          
T=1-5ms:  EventBus routes event
          QueryService receives event
          QueryService updates cache
          
T=5ms+:   User GET /tickets/{id} from QueryService
          Returns up-to-date TicketView
```

### Trade-off

**Pro:**
- ✅ Write always succeeds immediately
- ✅ Each service scales independently
- ✅ Services don't block each other
- ✅ True microservices decoupling

**Con:**
- ❌ Slight delay between write & read (ms)
- ❌ Temporary inconsistency possible
- ❌ Harder to reason about state

**Solution:** For most business cases, ms-level delay acceptable. If consistency < 5s needed, have QueryService resync from CommandService.

---

## Microservices Advantages Over Monolith

### Bài 3 (Monolith)

```
Single Process:
  - CommandService code
  - QueryService code
  - Both in same process
  
Scaling:
  - Scale everything or nothing
  
Deployment:
  - One deployment handles everything
```

### Bài 4 (Microservices)

```
Two Independent Processes:
  - CommandService on port 3003
  - QueryService on port 3004
  - Each can crash independently
  
Scaling:
  - If reads high → add QueryService instances
  - If writes high → add CommandService instances
  - Scale each independently
  
Deployment:
  - Deploy CommandService separately
  - Deploy QueryService separately
  - No downtime for other service
```

**Example:**

```
Scenario: Black Friday Sale

Monolith (Bài 3):
  - CPU usage spikes to 100%
  - Both read & write operations slow
  - Single instance can't handle load

Microservices (Bài 4):
  - High reads → Scale QueryService: +5 instances
  - High writes → Scale CommandService: +2 instances
  - Each scales independently
  - Total cost: only pay for needed resources
```

---

## Event Flow Sequence Diagram

```
User                CommandService          EventBus           QueryService
│                        │                        │                   │
├─ POST /tickets ─────→  │                        │                   │
│                        │                        │                   │
│                        ├─ Validate ─────────┐  │                   │
│                        │                    └──┘                   │
│                        │ Persist             │                   │
│                        │                        │                   │
│    201 Accepted ←──────┤ Publish Event ─────→  │                   │
│                        │                        │ TICKET_BOOKED    │
│                        │                        ├──────────────→  │
│                        │                        │                 │ Create View
│                        │                        │              Cache
│                        │                        │                 │
│                        │                        │ ←──────────────┘
│                        │                        │
│  (wait 1-5ms)         │                        │
│                        │                        │
├─ GET /tickets/:id ────────────────────────────────────────────→  │
│                        │                        │ Query Cache      │
│                        │                        │ ←──────────────┐│
│ 200 OK ← TicketView ──────────────────────────────────────────┘│
```

---

## Production Readiness Checklist

### Bài 4 Features

- ✅ Microservices architecture
- ✅ Independent services
- ✅ Event-driven communication
- ✅ Eventual consistency
- ✅ Read model caching
- ✅ Error isolation
- ❌ Persistent event log (Event Sourcing)
- ❌ SAGA pattern (distributed transactions)

### To Make Production-Ready

- [ ] **Replace EventBus:** Use RabbitMQ/Kafka
- [ ] **Database:** Use PostgreSQL/MongoDB
- [ ] **Logging:** ELK/Datadog
- [ ] **Monitoring:** Prometheus/Grafana
- [ ] **Tracing:** Jaeger/Zipkin
- [ ] **API Gateway:** Kong/Envoy
- [ ] **Service Discovery:** Consul/Eureka
- [ ] **Security:** OAuth2/mTLS
- [ ] **Containerization:** Docker
- [ ] **Orchestration:** Kubernetes

---

## Conclusion

**Bài 4** is the **final architectural evolution**:

```
Bài 1 (Manual Sync Monolith)
   ↓
Bài 2 (Event-Driven Monolith)
   ↓
Bài 3 (Event-Driven Monolith with Database)
   ↓
Bài 4 (Microservices + Message Broker)
   ↓
Production Distributed System
```

This architecture demonstrates **industry-standard patterns** for building scalable, maintainable systems.

Replace EventBus.ts with Kafka → **Distributed system ready!** 🚀
