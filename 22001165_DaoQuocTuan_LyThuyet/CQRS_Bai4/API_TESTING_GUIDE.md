# API Testing Guide - Bài 4: Microservices

## Server Configuration

| Service | Port | Purpose | Endpoints |
|---------|------|---------|-----------|
| **CommandService** | 3003 | Write operations | POST /tickets, DELETE /tickets/:id |
| **QueryService** | 3004 | Read operations | GET /trips/search, GET /tickets, GET /tickets/:id |

---

## Starting Services

### Terminal 1: CommandService

```bash
cd command-service
npm install
npm run dev
# Listens on http://localhost:3003
```

### Terminal 2: QueryService

```bash
cd query-service
npm install
npm run dev
# Listens on http://localhost:3004
```

### Terminal 3: Testing

```bash
# Run API tests below
```

---

## API Endpoints

### 1. Search Trips (QueryService:3004)

**GET /trips/search**

#### Basic Search (All trips)
```bash
curl "http://localhost:3004/trips/search"
```

#### Search by Route
```bash
curl "http://localhost:3004/trips/search?from=Bangkok&to=Chiang%20Mai"
```

#### Search by Route & Seat Class
```bash
# Economy only
curl "http://localhost:3004/trips/search?from=Bangkok&to=Chiang%20Mai&seatClass=economy"

# Business only
curl "http://localhost:3004/trips/search?from=Bangkok&to=Phuket&seatClass=business"

# First class only
curl "http://localhost:3004/trips/search?from=Bangkok&to=Phuket&seatClass=first"
```

#### Expected Response
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
      "availableSeats": 100,
      "economySeats": 60,
      "businessSeats": 20,
      "firstSeats": 20,
      "lowestPrice": 500,
      "durationMinutes": 510
    }
  ]
}
```

---

### 2. Book Ticket (CommandService:3003)

**POST /tickets**

#### Using curl (Windows)
```bash
curl -X POST http://localhost:3003/tickets ^
  -H "Content-Type: application/json" ^
  -d "{\"tripId\":\"TRIP001\",\"passengerId\":\"PASS001\",\"passengerName\":\"John Doe\",\"seatNumber\":\"A1\"}"
```

#### Using curl (macOS/Linux)
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

#### Using PowerShell
```powershell
$body = @{
    tripId = "TRIP001"
    passengerId = "PASS001"
    passengerName = "John Doe"
    seatNumber = "A1"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3003/tickets `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertFrom-Json
```

#### Expected Response (Success)
```json
{
  "success": true,
  "message": "Ticket booked successfully on seat A1",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
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

#### Error: Trip not found
```json
{
  "error": "Trip not found"
}
```

#### Error: Seat already booked
```json
{
  "error": "Seat A1 is already booked"
}
```

---

### 3. Get Ticket (QueryService:3004)

**GET /tickets/:id**

⚠️ **Important:** Wait 1-2 seconds after booking for event propagation!

```bash
# Replace {ID} with ticket ID from booking response
curl http://localhost:3004/tickets/550e8400-e29b-41d4-a716-446655440000
```

#### Expected Response
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tripId": "TRIP001",
    "tripSummary": {
      "id": "TRIP001",
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
    "pnr": "550E84",
    "bookingDate": "2026-04-13T10:30:00.000Z"
  }
}
```

#### Error: Ticket not found (not yet synced)
```json
{
  "error": "Ticket not found"
}
```

⚠️ If ticket not found, wait a moment and retry (event still propagating)

---

### 4. List All Tickets (QueryService:3004)

**GET /tickets**

#### All tickets
```bash
curl http://localhost:3004/tickets
```

#### Tickets for specific trip
```bash
curl "http://localhost:3004/tickets?tripId=TRIP001"
```

#### Expected Response
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tripId": "TRIP001",
      "tripSummary": { ... },
      "passengerName": "John Doe",
      "seatNumber": "A1",
      "seatClass": "economy",
      "price": 500,
      "status": "confirmed",
      "statusLabel": "Confirmed",
      "pnr": "550E84",
      "bookingDate": "2026-04-13T10:30:00.000Z"
    }
  ]
}
```

---

### 5. Cancel Ticket (CommandService:3003)

**DELETE /tickets/:id**

#### Using curl (Windows)
```bash
curl -X DELETE http://localhost:3003/tickets/550e8400-e29b-41d4-a716-446655440000 ^
  -H "Content-Type: application/json" ^
  -d "{\"reason\":\"Change of plans\"}"
```

#### Using curl (macOS/Linux)
```bash
curl -X DELETE http://localhost:3003/tickets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"reason": "Change of plans"}'
```

#### Using PowerShell
```powershell
$body = @{
    reason = "Change of plans"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3003/tickets/550e8400-e29b-41d4-a716-446655440000 `
  -Method DELETE `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertFrom-Json
```

#### Expected Response
```json
{
  "success": true,
  "message": "Ticket cancelled successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled",
    "cancelledDate": "2026-04-13T10:31:00.000Z"
  }
}
```

#### Error: Ticket already cancelled
```json
{
  "error": "Cannot cancel a ticket that is already cancelled"
}
```

---

### 6. Health Checks

**GET /health**

#### CommandService health
```bash
curl http://localhost:3003/health
```

```json
{
  "status": "ok",
  "service": "command-service"
}
```

#### QueryService health (with cache stats)
```bash
curl http://localhost:3004/health
```

```json
{
  "status": "ok",
  "service": "query-service",
  "cache": {
    "cached": 5,
    "trips": 3
  }
}
```

---

## Complete Test Scenario

### Step 1: Search Available Trips
```bash
curl "http://localhost:3004/trips/search?from=Bangkok&to=Chiang%20Mai"
# Note available seats per trip
```

### Step 2: Book First Ticket
```bash
curl -X POST http://localhost:3003/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP001",
    "passengerId": "USER1",
    "passengerName": "Alice",
    "seatNumber": "A1"
  }'
# Save ticketId_1
```

### Step 3: Book Second Ticket
```bash
curl -X POST http://localhost:3003/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP001",
    "passengerId": "USER2",
    "passengerName": "Bob",
    "seatNumber": "B1"
  }'
# Save ticketId_2
```

### Step 4: Verify Bookings (Wait 1-2s)
```bash
curl http://localhost:3004/tickets/{ticketId_1}
curl http://localhost:3004/tickets/{ticketId_2}
curl "http://localhost:3004/tickets?tripId=TRIP001"  # Should show 2 tickets
```

### Step 5: Check Updated Seat Availability
```bash
curl "http://localhost:3004/trips/search?from=Bangkok&to=Chiang%20Mai"
# availableSeats should be 98 (was 100)
```

### Step 6: Cancel One Ticket
```bash
curl -X DELETE http://localhost:3003/tickets/{ticketId_1} \
  -H "Content-Type: application/json" \
  -d '{"reason": "Safety"}'
```

### Step 7: Verify Cancellation (Wait 1-2s)
```bash
curl http://localhost:3004/tickets/{ticketId_1}
# status should be "cancelled"
```

### Step 8: Check Seats Available Again
```bash
curl "http://localhost:3004/trips/search?from=Bangkok&to=Chiang%20Mai"
# availableSeats should be 99 (was 98)
```

---

## Concurrent Booking Test

### Test: Can't double-book same seat

**Terminal 1:**
```bash
curl -X POST http://localhost:3003/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP002","passengerId":"U1","passengerName":"X","seatNumber":"C5"}'
# Succeeds
```

**Terminal 2 (immediately after):**
```bash
curl -X POST http://localhost:3003/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP002","passengerId":"U2","passengerName":"Y","seatNumber":"C5"}'
# Fails: "Seat C5 is already booked"
```

---

## Microservices Communication Test

### Verify Event Propagation

**Terminal 1: Book ticket**
```bash
TimeStart: 2026-04-13T10:30:00.000Z
curl -X POST http://localhost:3003/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP001","passengerId":"P1","passengerName":"Test","seatNumber":"D1"}'
```

**Observe in Terminal 2 (QueryService logs):**
```
[QueryService] Received TICKET_BOOKED event (ticketId)
  ✓ Cached TicketView (ticketId)
```

**Measure:** Event propagation usually 1-5ms

**Terminal 3: Query ticket**
```bash
TimeStart + 100ms: 
curl http://localhost:3004/tickets/{ticketId}
# ✓ Returns TicketView (event already processed)
```

---

## Debugging

### Check CommandService Database State
```bash
# Add debug endpoint in CommandService (optional)
# GET /debug/tickets → Returns all tickets in write model
```

### Check QueryService Cache State
```bash
curl http://localhost:3004/health
# Returns cache stats
```

### View Service Logs
**CommandService logs:**
- `[CommandService] Ticket booked: {id}`
- `[CommandService] Event published: TICKET_BOOKED`

**QueryService logs:**
- `[QueryService] Received TICKET_BOOKED event`
- `✓ Cached TicketView`
- `✓ EventBus: Subscriber registered`

---

## Performance Testing

### Measure Event Propagation Delay

```bash
#!/bin/bash
# Time between booking and ticket appearing in QueryService

TIME_BOOK=$(date +%s%N)
ID=$(curl -s -X POST http://localhost:3003/tickets \
  -H "Content-Type: application/json" \
  -d '...' | jq -r '.data.id')

sleep 0.1  # 100ms

TIME_QUERY=$(date +%s%N)
curl -s http://localhost:3004/tickets/$ID > /dev/null

DELAY=$((($TIME_QUERY - $TIME_BOOK) / 1000000))  # Convert to ms
echo "Event propagation delay: ${DELAY}ms"
```

---

## Troubleshooting

### Ticket appears in CommandService but not QueryService

**Cause:** Event listener not working or event not published

**Solution:**
1. Check both services running
2. Check terminal logs for errors
3. Wait 5+ seconds
4. Restart QueryService

### Port Already in Use

```bash
# Find process using port
lsof -i :3003    # macOS/Linux
netstat -ano | findstr :3003  # Windows

# Kill process
kill -9 {PID}    # macOS/Linux
taskkill /PID {PID} /F  # Windows
```

### npm install Fails

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## Summary

✅ **Microservices architecture enables:**
- Independent scaling
- Loose coupling
- Graceful degradation
- Teams work independently

This test suite validates all functionality! 🎉
