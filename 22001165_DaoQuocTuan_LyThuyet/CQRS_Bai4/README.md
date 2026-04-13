# Bài 4: CQRS + Microservices + Message Broker

## Giới thiệu

**Bài 4** nâng cấp Bài 3 bằng cách **tách thành 2 microservices độc lập**:

1. **Command Service** (port 3003) - Xử lý ghi dữ liệu
2. **Query Service** (port 3004) - Xử lý đọc dữ liệu

Hai service **giao tiếp qua global Event Bus** (giả lập Kafka/RabbitMQ), đạt được:
- ✅ **Loose Coupling** - Services độc lập hoàn toàn
- ✅ **Scalability** - Mỗi service scale riêng
- ✅ **Eventual Consistency** - Dữ liệu cuối cùng nhất quán
- ✅ **Microservices Pattern** - Sẵn sàng cho production

## Kiến trúc Tổng Thể

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Requests                       │
│  (Browser, Mobile App, API Gateway)                          │
└──────────────────┬───────────────────────┬──────────────────┘
                   │                       │
        POST /tickets                 GET /trips/search
        DELETE /tickets/:id           GET /tickets/:id
                   │                       │
                   ▼                       ▼
   ┌──────────────────────────────┐  ┌──────────────────────────────┐
   │   COMMAND SERVICE (3003)     │  │    QUERY SERVICE (3004)      │
   │   (Write Model)              │  │    (Read Model)              │
   └──────────────────────────────┘  └──────────────────────────────┘
   │ - TicketService              │  │ - TicketViewService          │
   │ - SeatValidator              │  │ - Database (read-only)       │
   │ - Database (write model)      │  │ - Read Model Cache           │
   └──────────────────────────────┘  └──────────────────────────────┘
             │                                    ▲
             │  TICKET_BOOKED                     │
             │  TICKET_CANCELLED                  │
             │                                    │
             └────────────────┬────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Global EventBus   │
                    │ (Message Broker)   │
                    └────────────────────┘
                    
                    Simulates:
                    • Kafka partitions
                    • RabbitMQ exchanges
                    • AWS SNS/SQS
```

## File Structure

```
CQRS_Bai4/
├── shared/                          # Shared between services
│   ├── EventBus.ts                 # Global message broker
│   └── models.ts                   # Shared domain models
│
├── command-service/                # Port 3003
│   ├── src/
│   │   ├── persistence/
│   │   │   └── Database.ts         # Write model database
│   │   ├── services/
│   │   │   ├── TicketService.ts    # CommandService
│   │   │   └── SeatValidator.ts    # Business logic
│   │   ├── controllers/
│   │   │   └── TicketController.ts # HTTP handlers
│   │   ├── routes/
│   │   │   └── ticketRoutes.ts     # POST, DELETE
│   │   ├── app.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── query-service/                  # Port 3004
│   ├── src/
│   │   ├── persistence/
│   │   │   └── Database.ts         # Read-only replica
│   │   ├── services/
│   │   │   ├── TicketViewService.ts # QueryService
│   │   │   └── SeatValidator.ts    # Statistics only
│   │   ├── controllers/
│   │   │   └── TicketController.ts # HTTP handlers
│   │   ├── routes/
│   │   │   └── ticketRoutes.ts     # GET only
│   │   ├── app.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── docker-compose.yml              # Run both services
```

## API Endpoints

### Command Service (Port 3003)

**Write operations ONLY:**

```http
POST /tickets
{
  "tripId": "TRIP001",
  "passengerId": "PASS001",
  "passengerName": "John Doe",
  "seatNumber": "A1"
}
→ 201 Created

DELETE /tickets/{id}
{
  "reason": "Change of plans"
}
→ 200 OK
```

### Query Service (Port 3004)

**Read operations ONLY:**

```http
GET /trips/search?from=Bangkok&to=Chiang%20Mai
→ 200 OK, returns TripView[]

GET /trips/search?from=Bangkok&to=Chiang%20Mai&seatClass=economy
→ 200 OK, filtered results

GET /tickets
→ 200 OK, returns TicketView[]

GET /tickets/{id}
→ 200 OK, returns single TicketView

GET /health
→ 200 OK, returns service status & cache stats
```

## Kiến Trúc Chi Tiết

### 1. Shared EventBus (Global Message Broker)

**File**: `shared/EventBus.ts`

**Đặc điểm:**
- ✓ Static class (singleton pattern)
- ✓ Global subscribers map
- ✓ Error isolation (một subscriber lỗi không ảnh hưởng others)
- ✓ Async support (future)

**API:**
```typescript
// Subscribe (called by QueryService)
EventBus.subscribe('TICKET_BOOKED', (event) => {
  // Update read model
});

// Publish (called by CommandService)
EventBus.publish({
  type: 'TICKET_BOOKED',
  ticketId: '...',
  ...
});
```

### 2. Command Service (Port 3003)

**Tầng: Write Model**

**Responsibility:**
- ✓ Validate commands (SeatValidator)
- ✓ Persist to database
- ✓ Publish events
- ✗ Never reads from QueryService

**Database:** CommandService owns its own database (one source of truth for writes)

**Flow:**
```
POST /tickets
  ↓
TicketController.bookTicket()
  ↓
TicketService.bookTicket()
  ├─ SeatValidator.validateSeatAvailability()
  ├─ Database.bookTicket()        [Persist]
  └─ EventBus.publish()           [Broadcast]
  ↓
202 Accepted
(Event propagates to QueryService asynchronously)
```

**Key Classes:**

**TicketService**
```typescript
bookTicket(command: BookTicketCommand): Ticket {
  // 1. Validate
  const validation = validator.validateSeatAvailability(...);
  
  // 2. Persist to own database
  this.database.bookTicket(ticket);
  
  // 3. Publish event
  EventBus.publish({type: 'TICKET_BOOKED', ...});
  
  return ticket;
}
```

**SeatValidator**
```typescript
validateSeatAvailability(tripId, seatNumber): {isValid, message}
  ├─ Check trip exists
  ├─ Check seat exists
  └─ Check seat not booked
```

### 3. Query Service (Port 3004)

**Tầng: Read Model**

**Responsibility:**
- ✓ Listen to EventBus
- ✓ Maintain read model cache
- ✓ Execute queries
- ✗ Never writes to database
- ✗ Never modifies write model

**Database:** Read-only replica (updated by events)

**Read Model Cache:** In-memory TicketView cache

**Flow:**
```
EventBus publishes TICKET_BOOKED
  ↓
TicketViewService.setupEventListeners()
  ├─ Receive event
  ├─ Create TicketView
  └─ Cache in ticketViewCache
  ↓
GET /tickets/{id}
  ↓
TicketController.getTicket()
  ↓
TicketViewService.getTicket()
  ├─ Query cache (O(1))
  └─ Return TicketView (with derived fields)
  ↓
200 OK
```

**Key Classes:**

**TicketViewService**
```typescript
setupEventListeners() {
  EventBus.subscribe('TICKET_BOOKED', (event) => {
    const view = {
      ...event,
      tripSummary: this.database.getTrip(...),
      statusLabel: 'Confirmed',
      pnr: this.generatePNR(...),  // Derived
    };
    this.ticketViewCache.set(event.ticketId, view);
  });
}

searchTrips(from, to, seatClass?) {
  // Query database → Transform to TripView (with derived fields)
  // → Filter by class → Sort by time
}
```

## Data Flow: Complete Booking Flow

```
1. CLIENT sends: POST /tickets (to CommandService:3003)
   {tripId, passengerId, passengerName, seatNumber}
   
2. COMMAND SERVICE processes:
   - Validates seat (SeatValidator)
   - Creates ticket entity
   - Persists to own database
   - Publishes TICKET_BOOKED event
   - Returns 201 Created
   
3. EVENT BUS broadcasts TICKET_BOOKED event
   (in-process, immediate delivery in this simulation)
   
4. QUERY SERVICE receives event:
   - TicketViewService event listener triggered
   - Creates TicketView from event
   - Caches in ticketViewCache
   
5. CLIENT calls: GET /tickets/{id} (to QueryService:3004)
   - TicketController queries cache (O(1))
   - Returns TicketView with all derived fields
   - Returns 200 OK
   
✓ Eventual Consistency achieved!
  (Slight delay between write and read, typically ms)
```

## Eventual Consistency Pattern

```
Write Model (CommandService)      Read Model (QueryService)
┌──────────────────────┐         ┌──────────────────────┐
│ Ticket entity stored │         │ TicketView cached    │
│ in database          │         │ with derived fields  │
└──────────────────────┘         └──────────────────────┘
         │                               ▲
         │                               │
         └───────→ EventBus ─────────────┘
                 (TICKET_BOOKED)
                 
Time: 0ms          Time: ~1-5ms
Write completes    Read model updated
```

**Important:**
- Write always succeeds immediately
- Read eventually reflects writes
- Acceptable for most business cases (financial orders, shopping)
- Can implement eventual consistency timeout (e.g., if reads out of date > 5s, trigger resync)

## Event Processing

### TICKET_BOOKED Event

**Published by:** CommandService.bookTicket()

**Listened by:** QueryService.setEventListeners()

**Data:**
```typescript
{
  type: 'TICKET_BOOKED',
  ticketId: string,
  tripId: string,
  passengerId: string,
  passengerName: string,
  seatNumber: string,
  seatClass: 'economy' | 'business' | 'first',
  price: number,
  bookingDate: Date
}
```

**QueryService Action:**
- Create TicketView with trip summary
- Add derived fields (statusLabel, PNR)
- Cache in memory

### TICKET_CANCELLED Event

**Published by:** CommandService.cancelTicket()

**Listened by:** QueryService.setEventListeners()

**Data:**
```typescript
{
  type: 'TICKET_CANCELLED',
  ticketId: string,
  tripId: string,
  seatNumber: string,
  reason?: string,
  cancelledDate: Date
}
```

**QueryService Action:**
- Find cached TicketView
- Update status to 'cancelled'
- Add cancelledDate

## Microservice Advantages

| Aspect | Monolith (Bài 3) | Microservices (Bài 4) |
|--------|------------------|----------------------|
| **Scaling** | Scale whole app | Scale each service independently |
| **Deployment** | Deploy once | Deploy separately |
| **Technology** | Same stack | Different stacks possible |
| **Failure** | One failure = all down | Graceful degradation |
| **Complexity** | Simple | Handles async, eventual consistency |
| **Performance** | Fast (in-process) | Network latency |
| **Consistency** | Strong | Eventual |

## Running Both Services

### Terminal 1: Command Service
```bash
cd command-service
npm install
npm run dev
# Output: Server running on http://localhost:3003
```

### Terminal 2: Query Service
```bash
cd query-service
npm install
npm run dev
# Output: Server running on http://localhost:3004
```

### Terminal 3: Test
```bash
# Search trips (QueryService)
curl "http://localhost:3004/trips/search?from=Bangkok&to=Chiang%20Mai"

# Book ticket (CommandService)
curl -X POST http://localhost:3003/tickets \
  -H "Content-Type: application/json" \
  -d '{...}'

# Get ticket (QueryService) - might have slight delay
curl http://localhost:3004/tickets/{id}
```

## Testing Scenario

### Complete Workflow

```bash
# 1. Search trips (QueryService)
GET http://localhost:3004/trips/search?from=Bangkok&to=Chiang%20Mai

# 2. Book ticket (CommandService)
POST http://localhost:3003/tickets
{
  "tripId": "TRIP001",
  "passengerId": "PASS001",
  "passengerName": "Alice",
  "seatNumber": "A1"
}
# ← Returns ticket ID immediately

# 3. Get ticket from QueryService
# (Wait 1-2 seconds to let event propagate)
GET http://localhost:3004/tickets/{ticketId}
# ← Should return TicketView with all data

# 4. List all booked tickets
GET http://localhost:3004/tickets

# 5. Cancel booking (CommandService)
DELETE http://localhost:3003/tickets/{ticketId}
{
  "reason": "Change of plans"
}

# 6. Verify cancellation (QueryService)
GET http://localhost:3004/tickets/{ticketId}
# ← Status should be "cancelled"
```

## Simulated Message Broker

**Implementation:** `shared/EventBus.ts`

**Why Simulation:**
- ✓ Demonstrates real-world pattern
- ✓ Easier to understand than RabbitMQ/Kafka
- ✓ No external dependencies
- ✓ Perfect for learning

**Real-World Brokers:**
- **RabbitMQ** - AMQP protocol, traditional queuing
- **Apache Kafka** - Event streaming, distributed log
- **AWS SNS/SQS** - Cloud-native messaging
- **Google Pub/Sub** - Cloud alternative
- **Azure Service Bus** - Microsoft cloud platform

**Architecture Pattern:**
```
Both are valid:

A) Direct EventBus (this Bài 4)
   CommandService → EventBus → QueryService
   (In-process, no network)
   
B) Message Queue (production)
   CommandService → Message Queue (RabbitMQ/Kafka)
   QueryService ← consumes from queue
   (Network-based, distributed)
```

Replace `EventBus.ts` with actual message broker library → Production ready!

## Comparison: Bài 1, 2, 3, 4

| Feature | Bài 1 | Bài 2 | Bài 3 | Bài 4 |
|---------|-------|-------|-------|-------|
| **CQRS** | Manual sync | Event-driven | Event-driven | Microservices |
| **Services** | 1 monolith | 1 monolith | 1 monolith | 2 microservices |
| **Ports** | 3000 | 3001 | 3002 | 3003, 3004 |
| **Communication** | In-memory | In-memory EventBus | In-memory EventBus | Global EventBus |
| **Database** | Shared | Shared | Shared | Separated |
| **Consistency** | Strong | Eventual | Eventual | Eventual |
| **Scaling** | Single | Single | Single | Independent |
| **Deployment** | One | One | One | Two |
| **Complexity** | Low | Medium | Medium-High | High |
| **Production Ready** | No | No | Yes | Yes |

## Future Enhancements

### Short-term (Bài 4 → Production v1)
- [ ] Replace in-memory with RabbitMQ
- [ ] Add database abstraction layer
- [ ] Add monitoring/logging

### Medium-term (Production v2)
- [ ] Replace with Kafka for event streaming
- [ ] Add service discovery (Consul/Eureka)
- [ ] Add API gateway (Kong/Ambassador)
- [ ] Add circuit breakers (Hystrix/Resilience4j)

### Long-term (Production v3)
- [ ] Add event sourcing
- [ ] Implement SAGA pattern (distributed transactions)
- [ ] Add distributed tracing (Jaeger/Zipkin)
- [ ] Containerize with Docker/Kubernetes
- [ ] Add persistent event log

## Kết Luận

**Bài 4** là:
- ✅ **Production-grade microservices architecture**
- ✅ **Demonstrates loose coupling & independent scaling**
- ✅ **Ready for real message brokers (RabbitMQ, Kafka)**
- ✅ **Handles eventual consistency gracefully**
- ✅ **Foundation for distributed systems**

This is the **final evolutionary step** from monolith → CQRS → Event-Driven → **Microservices** 🚀
