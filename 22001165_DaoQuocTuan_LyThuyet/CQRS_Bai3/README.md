# Train Ticket System - Bài 3

## Giới thiệu

Đây là một **Train Ticket Reservation System** được xây dựng theo **CQRS + Event-Driven Architecture** với **Database Persistence Layer** và **Complex Business Logic**.

Bài 3 nâng cấp so với Bài 1 & 2 bằng cách thêm:
- 🗄️ Database layer (persistence)
- ✅ Validation logic (SeatValidator)
- 🔍 Search functionality
- 📊 Derived fields (statistics, duration, pricing)
- 🎯 Complex domain model (Trips, Seats, Tickets)

## Kiến trúc

```
                    ┌──────────────────┐
                    │  HTTP Requests   │
                    └────────┬─────────┘
                             │
                    ┌────────▼────────┐
          Commands │ TicketController │ Queries
                   └─┬──────────────┬─┘
                     │              │
        ┌────────────┘              └─────────────┐
        │                                         │
        ▼                                         ▼
┌─────────────────────┐            ┌──────────────────────┐
│ TicketService       │            │ TicketViewService    │
│ (CommandService)    │            │ (QueryService)       │
├─────────────────────┤            ├──────────────────────┤
│ • bookTicket()      │ Publishes  │ • searchTrips()      │
│ • cancelTicket()    │  Events    │ • getTicket()        │
└──────────┬──────────┘            └──────────┬───────────┘
           │                              │
           ├─ EventBus ◀────────────────┤
           │                            │
           ▼                            ▼
    ┌──────────────┐            ┌──────────────┐
    │   Database   │            │ Read Model   │
    │              │            │   Caches     │
    │ • Tickets    │            │              │
    │ • Trips      │            │ • TicketView │
    │ • Events     │            │ • TripView   │
    └──────────────┘            └──────────────┘
```

## Cấu trúc Dự án

```
CQRS_Bai3/
├── src/
│   ├── models/
│   │   └── index.ts                # Domain models
│   │                               # • Ticket, Trip, Seat
│   │                               # • TicketView, TripView
│   │                               # • Events, Commands
│   │
│   ├── persistence/
│   │   └── Database.ts             # ⭐ Database Layer
│   │                               # • Persistence logic
│   │                               # • Seat indexing
│   │                               # • Trip statistics
│   │
│   ├── services/
│   │   ├── TicketService.ts        # CommandService
│   │   │                           # • Book ticket
│   │   │                           # • Cancel ticket
│   │   │                           # • Publish events
│   │   │
│   │   ├── TicketViewService.ts    # QueryService
│   │   │                           # • Search trips
│   │   │                           # • Get tickets
│   │   │                           # • Listen to events
│   │   │
│   │   └── SeatValidator.ts        # ⭐ Validation Logic
│   │                               # • Seat availability
│   │                               # • Business rules
│   │                               # • Cancellation rules
│   │
│   ├── events/
│   │   └── EventBus.ts             # Event pub/sub
│   │
│   ├── controllers/
│   │   └── TicketController.ts     # HTTP handlers
│   │
│   ├── routes/
│   │   └── ticketRoutes.ts         # API routes
│   │
│   ├── app.ts                      # Express setup
│   └── index.ts                    # Server entry
│
├── package.json
├── tsconfig.json
└── README.md
```

## Yêu cầu Chức năng

### ✅ Commands (Write Operations)

**Book Ticket**
```http
POST /tickets
{
  "tripId": "TRIP001",
  "passengerId": "PASS001",
  "passengerName": "John Doe",
  "seatNumber": "A1"
}
```

**Cancel Ticket**
```http
DELETE /tickets/{id}
{
  "reason": "Change of plans"
}
```

### ✅ Queries (Read Operations)

**Search Trips**
```http
GET /trips/search?from=Bangkok&to=Chiang%20Mai&seatClass=economy
```

**Get Tickets**
```http
GET /tickets
GET /tickets/{id}
GET /tickets?tripId=TRIP001
```

## Thiết kế CQRS

### Command Side: TicketService

**Responsibilities:**
1. ✓ Validate seat availability (via SeatValidator)
2. ✓ Write to database
3. ✓ Publish events
4. ✓ Enforce business rules

**Workflow:**
```
bookTicket(command)
  ├─ Validate seat exists & available
  ├─ Get seat pricing
  ├─ Create Ticket entity
  ├─ Persist to Database
  └─ Publish TICKET_BOOKED event
```

### SeatValidator: Business Logic

**Responsibilities:**
- ✓ Check seat availability
- ✓ Check trip exists
- ✓ Calculate seat stats
- ✓ Validate cancellations

### Database: Persistence Layer

**Responsibilities:**
- ✓ CRUD operations
- ✓ Seat reservation index
- ✓ Trip statistics
- ✓ Data integrity

**Key Tables:**
- `ticketsTable` - Booked tickets
- `tripsTable` - Train trips
- `tripSeatsIndex` - Seat availability map

### Query Side: TicketViewService

**Responsibilities:**
1. ✓ Maintain optimized read models
2. ✓ Execute search queries
3. ✓ Listen to events
4. ✓ Provide derived fields

**Derived Fields:**
- `itemCount` → Seats by class
- `duration` → "8h 30m"
- `lowestPrice` → Minimum price
- `statusLabel` → Status translation

**Search Optimization:**
```typescript
searchTrips(from, to, seatClass?)
  ├─ Query by route
  ├─ Calculate stats
  ├─ Add derived fields
  ├─ Filter by seat class
  └─ Sort by departure time
```

## API Endpoints

### 1. Search Trips

```http
GET /trips/search?from=Bangkok&to=Chiang%20Mai
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "TRIP001",
      "trainNumber": "SR1",
      "route": "Bangkok → Chiang Mai",
      "departureTime": "2026-04-15T10:00:00.000Z",
      "arrivalTime": "2026-04-15T18:30:00.000Z",
      "duration": "8h 30m",
      "totalSeats": 100,
      "availableSeats": 95,
      "economySeats": 55,
      "businessSeats": 20,
      "firstSeats": 20,
      "lowestPrice": 500
    }
  ]
}
```

### 2. Book Ticket

```http
POST /tickets
{
  "tripId": "TRIP001",
  "passengerId": "PASS001",
  "passengerName": "John Doe",
  "seatNumber": "A1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket booked successfully on seat A1",
  "data": {
    "id": "ticket-uuid",
    "tripId": "TRIP001",
    "passengerId": "PASS001",
    "passengerName": "John Doe",
    "seatNumber": "A1",
    "seatClass": "economy",
    "price": 500,
    "status": "confirmed",
    "bookingDate": "2026-04-13T10:30:00.000Z"
  }
}
```

### 3. Get Ticket

```http
GET /tickets/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ticket-uuid",
    "tripId": "TRIP001",
    "tripSummary": {
      "trainNumber": "SR1",
      "route": "Bangkok → Chiang Mai",
      "departureTime": "2026-04-15T10:00:00.000Z",
      "arrivalTime": "2026-04-15T18:30:00.000Z"
    },
    "passengerName": "John Doe",
    "seatNumber": "A1",
    "seatClass": "economy",
    "price": 500,
    "status": "confirmed",
    "statusLabel": "Confirmed",
    "pnr": "ABC123",
    "bookingDate": "2026-04-13T10:30:00.000Z"
  }
}
```

### 4. Cancel Ticket

```http
DELETE /tickets/{id}
{
  "reason": "Change of plans"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket cancelled successfully",
  "data": {
    "id": "ticket-uuid",
    "status": "cancelled",
    "cancelledDate": "2026-04-13T10:31:00.000Z"
  }
}
```

## Domain Model

### Ticket (Write Model)
```typescript
interface Ticket {
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
```

### TicketView (Read Model)
```typescript
interface TicketView {
  id: string;
  tripId: string;
  tripSummary: {...};      // Derived
  passengerName: string;
  seatNumber: string;
  seatClass: string;
  price: number;
  status: string;
  statusLabel: string;     // Derived
  pnr: string;            // Derived
  bookingDate: string;
  cancelledDate?: string;
}
```

### TripView (Read Model)
```typescript
interface TripView {
  id: string;
  trainNumber: string;
  route: string;                    // Derived: "Bangkok → Chiang Mai"
  departureTime: string;
  arrivalTime: string;
  duration: string;                 // Derived: "8h 30m"
  totalSeats: number;
  availableSeats: number;           // Derived
  economySeats: number;             // Derived
  businessSeats: number;            // Derived
  firstSeats: number;               // Derived
  lowestPrice: number;              // Derived
  durationMinutes: number;          // For sorting
}
```

## Events

### TICKET_BOOKED
```typescript
{
  type: 'TICKET_BOOKED',
  ticketId: string,
  tripId: string,
  passengerId: string,
  passengerName: string,
  seatNumber: string,
  seatClass: string,
  price: number,
  bookingDate: Date
}
```

### TICKET_CANCELLED
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

## Chạy Dự án

### 1. Cài đặt
```bash
cd CQRS_Bai3
npm install
```

### 2. Development
```bash
npm run dev
# Server chạy trên http://localhost:3002
```

### 3. Build
```bash
npm run build
```

### 4. Production
```bash
npm start
```

## Test Scenarios

### Scenario 1: Book and Cancel
```bash
# Search trips
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai"

# Book ticket (save ID from response)
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tripId":"TRIP001",
    "passengerId":"PASS001",
    "passengerName":"John Doe",
    "seatNumber":"A1"
  }'

# Get ticket (replace ID)
curl http://localhost:3002/tickets/{ticketId}

# Cancel ticket
curl -X DELETE http://localhost:3002/tickets/{ticketId} \
  -H "Content-Type: application/json" \
  -d '{"reason":"Change of plans"}'

# Verify cancellation
curl http://localhost:3002/tickets/{ticketId}
```

### Scenario 2: Search by Seat Class
```bash
# Economy only
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai&seatClass=economy"

# Business only
curl "http://localhost:3002/trips/search?from=Bangkok&to=Phuket&seatClass=business"
```

## Ưu điểm của Bài 3

1. **Database Persistence**
   - Real data persistence
   - Seat reservation tracking
   - Transaction-like operations

2. **Complex Business Logic**
   - SeatValidator enforces rules
   - Seat availability checks
   - Cancellation validation
   - Departure time validation

3. **Search Optimization**
   - Multiple filter criteria
   - Derived field calculation
   - Sorting
   - Caching

4. **Scalability**
   - Database abstraction layer
   - Can replace with real database
   - Ready for distributed systems

5. **Real-World Use Case**
   - Matches actual ticket booking
   - Complex domain model
   - Event-driven architecture
   - Production-ready patterns

## Tương Ứng Bài 1, 2, 3

| Aspect | Bài 1 | Bài 2 | Bài 3 |
|--------|-------|-------|-------|
| Database | In-memory Map | In-memory Map | Abstraction Layer |
| Validation | Basic | Basic | Complex (SeatValidator) |
| Search | No | No | Yes (with filters) |
| Events | No | Yes | Yes (more types) |
| Business Logic | Todo CRUD | Order CRUD | Seat reservation |
| Derived Fields | Basic | Yes | Yes (many) |
| Production Ready | No | Partial | Yes |

## Mở rộng (Future)

- [ ] Replace in-memory with MongoDB/PostgreSQL
- [ ] Add payment processing
- [ ] Add notifications (email/SMS)
- [ ] Add cancellation fee calculation
- [ ] Add seat recommendations
- [ ] Add booking history
- [ ] Add refund processing
- [ ] Add overbooking management

## Kết luận

**Bài 3** là **production-grade CQRS system** với:
- ✓ Database persistence
- ✓ Complex validation
- ✓ Search optimization
- ✓ Real-world domain
- ✓ Event-driven architecture
- ✓ Scalable design

Đây là kiến trúc sẵn sàng cho ứng dụng thực tế! 🚀
