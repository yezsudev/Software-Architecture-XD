# QUICK START - Bài 4: Microservices + Message Broker

## 🎯 Overview

Run **2 independent services** that communicate via event bus:
- **Command Service** (Port 3003) - Write operations
- **Query Service** (Port 3004) - Read operations

## 🚀 Setup (5 minutes)

### Terminal 1: Start Command Service

```bash
cd command-service
npm install
npm run dev
```

**Output:**
```
============================================================
🚀 COMMAND SERVICE (Write Model)
============================================================
✓ Server running on http://localhost:3003
✓ Database initialized with seed data
✓ Listening to global EventBus for sync
```

### Terminal 2: Start Query Service

```bash
cd query-service
npm install
npm run dev
```

**Output:**
```
============================================================
🔍 QUERY SERVICE (Read Model)
============================================================
✓ Server running on http://localhost:3004
✓ Database initialized with seed data
✓ Listening to global EventBus for updates
✓ Maintaining eventual consistency with CommandService
```

✅ **Both services running!**

---

## 🧪 Quick Test Flow

### Step 1: Search Trips (QueryService:3004)

```bash
curl "http://localhost:3004/trips/search?from=Bangkok&to=Chiang%20Mai"
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
      "duration": "8h 30m",
      "totalSeats": 100,
      "availableSeats": 100,
      "lowestPrice": 500
    }
  ]
}
```

### Step 2: Book Ticket (CommandService:3003)

```bash
curl -X POST http://localhost:3003/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP001",
    "passengerId": "PASS001",
    "passengerName": "John Doe",
    "seatNumber": "A1"
  }'
```

**Save the ticket ID from response!**

```json
{
  "success": true,
  "message": "Ticket booked successfully on seat A1",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tripId": "TRIP001",
    "passengerName": "John Doe",
    "seatNumber": "A1",
    "price": 500,
    "status": "confirmed"
  }
}
```

### Step 3: Check Ticket (QueryService:3004)

**Wait 1-2 seconds** for event to propagate, then:

```bash
curl http://localhost:3004/tickets/{ID}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "{ID}",
    "tripId": "TRIP001",
    "passengerName": "John Doe",
    "seatNumber": "A1",
    "seatClass": "economy",
    "price": 500,
    "status": "confirmed",
    "pnr": "550E84",
    "tripSummary": {
      "trainNumber": "SR1",
      "route": "Bangkok → Chiang Mai",
      "departureTime": "2026-04-15T10:00:00.000Z",
      "arrivalTime": "2026-04-15T18:30:00.000Z"
    }
  }
}
```

### Step 4: Cancel Ticket (CommandService:3003)

```bash
curl -X DELETE http://localhost:3003/tickets/{ID} \
  -H "Content-Type: application/json" \
  -d '{"reason": "Change of plans"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Ticket cancelled successfully",
  "data": {
    "id": "{ID}",
    "status": "cancelled",
    "cancelledDate": "2026-04-13T10:31:00Z"
  }
}
```

### Step 5: Verify Cancellation (QueryService:3004)

```bash
curl http://localhost:3004/tickets/{ID}
```

Status should now be `"cancelled"` ✅

---

## 📊 Service Ports & Endpoints

### Command Service (Port 3003)
```
Write Operations:
  POST   /tickets         - Book ticket
  DELETE /tickets/:id     - Cancel ticket
  GET    /health          - Health check
```

### Query Service (Port 3004)
```
Read Operations:
  GET    /trips/search    - Search trips
  GET    /tickets         - List all tickets
  GET    /tickets/:id     - Get ticket detail
  GET    /health          - Health + cache stats
```

---

## 🔄 Understanding Microservices

### Key Difference from Bài 3

**Bài 3 (Monolith):**
```
User → Single Service (both write & read)
```

**Bài 4 (Microservices):**
```
User → CommandService (writes)
User → QueryService (reads)
       ↓
     EventBus (communication)
```

### Eventual Consistency Example

```
Timeline:
┌─────────────────────────────────────────────────┐
│ 0ms      - User books ticket on CommandService │
│           CommandService persists to DB         │
│           Publishes TICKET_BOOKED event         │
│                                                  │
│ 1-5ms    - EventBus routes event               │
│           QueryService receives event           │
│           Updates read model cache              │
│                                                  │
│ 5ms+     - User queries QueryService            │
│           Gets latest ticket with all data      │
└─────────────────────────────────────────────────┘
```

---

## 💡 Important Concepts

### 1. Command Service (Port 3003)
- **Owns database** - is the source of truth
- **Validates** - checks business rules
- **Publishes** - sends events
- **Never reads** - doesn't query QueryService

### 2. Query Service (Port 3004)
- **Maintains cache** - in-memory ticket views
- **Listens to events** - automatically updates
- **Executes queries** - fast reads from cache
- **Never writes** - doesn't modify CommandService

### 3. EventBus
- **Global broker** - both services share
- **Decouples** - services don't know each other
- **Asynchronous** - events flow independently

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Port 3003 busy?
# Kill the process using it
lsof -i :3003    # macOS/Linux
# netstat -ano | findstr :3003  # Windows
kill -9 {PID}

# Same for 3004
lsof -i :3004
```

### npm install Fails
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Event Not Propagating
- Ensure both services are running
- Check terminal output for errors
- Wait 1-2 seconds between write and read

### Tickets Not Appearing
- Write to CommandService:3003 first
- Wait for event propagation (1-5ms)
- Then read from QueryService:3004

---

## ✅ Verification Checklist

- [ ] Both services started (`npm run dev`)
- [ ] No port conflicts (3003, 3004 available)
- [ ] Can search trips (Step 1)
- [ ] Can book ticket (Step 2)
- [ ] Ticket appears after 1-2s wait (Step 3)
- [ ] Can cancel ticket (Step 4)
- [ ] Cancellation reflected (Step 5)

If all checks pass ✔️ - **Congratulations! Microservices working!** 🎉

---

## 📚 Next Steps

1. **Explore architecture** - Read README.md for detailed explanation
2. **Review code** - Check event listeners in TicketViewService
3. **Understand CQRS** - See how CommandService ≠ QueryService
4. **Learn microservices** - See how services communicating via events
5. **Try production broker** - Replace EventBus.ts with RabbitMQ/Kafka

---

## 🚀 Production Evolution

```
Bài 4 (Current)
↓ Replace EventBus.ts with RabbitMQ
↓ Add containerization (Docker)
↓ Add orchestration (Kubernetes)
↓
Production Microservices!
```

Enjoy! 🎊
