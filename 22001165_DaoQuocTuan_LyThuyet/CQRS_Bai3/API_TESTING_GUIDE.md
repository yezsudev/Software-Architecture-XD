# API Testing Guide - Train Ticket System

## Prerequisites

**Before testing, ensure:**
1. Server running: `npm run dev`
2. Server listening on `http://localhost:3002`
3. Database initialized with 3 sample trips

## Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/trips/search` | GET | Search available trips |
| `/tickets` | POST | Book a ticket |
| `/tickets` | GET | Get all tickets or filter by tripId |
| `/tickets/:id` | GET | Get ticket details |
| `/tickets/:id` | DELETE | Cancel a ticket |

---

## 1. Search Trips

### Basic Search (All routes)
```bash
curl "http://localhost:3002/trips/search"
```

### Search by Origin & Destination
```bash
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai"
```

### Search with Seat Class Filter

**Economy only:**
```bash
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai&seatClass=economy"
```

**Business only:**
```bash
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai&seatClass=business"
```

**First class only:**
```bash
curl "http://localhost:3002/trips/search?from=Bangkok&to=Phuket&seatClass=first"
```

### Expected Response
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
      "lowestPrice": 500
    },
    {
      "id": "TRIP002",
      "trainNumber": "SR2",
      "route": "Bangkok → Chiang Mai",
      "departureTime": "2026-04-15T14:00:00.000Z",
      "arrivalTime": "2026-04-15T22:30:00.000Z",
      "duration": "8h 30m",
      "totalSeats": 80,
      "availableSeats": 80,
      "economySeats": 50,
      "businessSeats": 15,
      "firstSeats": 15,
      "lowestPrice": 500
    }
  ]
}
```

---

## 2. Book Ticket

### Basic Booking

**Using PowerShell:**
```powershell
$body = @{
    tripId = "TRIP001"
    passengerId = "PASS001"
    passengerName = "John Doe"
    seatNumber = "A1"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3002/tickets `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertFrom-Json
```

**Using curl (Windows):**
```bash
curl -X POST http://localhost:3002/tickets ^
  -H "Content-Type: application/json" ^
  -d "{\"tripId\":\"TRIP001\",\"passengerId\":\"PASS001\",\"passengerName\":\"John Doe\",\"seatNumber\":\"A1\"}"
```

**Using curl (macOS/Linux):**
```bash
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP001",
    "passengerId": "PASS001",
    "passengerName": "John Doe",
    "seatNumber": "A1"
  }'
```

### Expected Response (Success)
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

### Error Cases

**Invalid Trip:**
```bash
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "INVALID_TRIP",
    "passengerId": "PASS001",
    "passengerName": "John Doe",
    "seatNumber": "A1"
  }'
```

**Response:**
```json
{
  "success": false,
  "message": "Trip not found"
}
```

**Seat Already Booked:**
```bash
# Book once (succeeds)
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP001","passengerId":"PASS001","passengerName":"John Doe","seatNumber":"A1"}'

# Book same seat again (fails)
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP001","passengerId":"PASS002","passengerName":"Jane Smith","seatNumber":"A1"}'
```

**Response:**
```json
{
  "success": false,
  "message": "Seat A1 is already booked"
}
```

**Invalid Seat Number:**
```bash
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP001","passengerId":"PASS001","passengerName":"John Doe","seatNumber":"Z99"}'
```

**Response:**
```json
{
  "success": false,
  "message": "Seat Z99 does not exist"
}
```

---

## 3. Get Ticket Details

### Get Single Ticket

**Save ticket ID from booking response first!**

```bash
curl http://localhost:3002/tickets/550e8400-e29b-41d4-a716-446655440000
```

### Expected Response
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
    "pnr": "ABC123",
    "bookingDate": "2026-04-13T10:30:00.000Z"
  }
}
```

### Get All Tickets
```bash
curl http://localhost:3002/tickets
```

### Get Tickets for Specific Trip
```bash
curl "http://localhost:3002/tickets?tripId=TRIP001"
```

---

## 4. Cancel Ticket

### Cancel Booking

**Using PowerShell:**
```powershell
$body = @{
    reason = "Change of plans"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3002/tickets/550e8400-e29b-41d4-a716-446655440000 `
  -Method DELETE `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertFrom-Json
```

**Using curl (Windows):**
```bash
curl -X DELETE http://localhost:3002/tickets/550e8400-e29b-41d4-a716-446655440000 ^
  -H "Content-Type: application/json" ^
  -d "{\"reason\":\"Change of plans\"}"
```

**Using curl (macOS/Linux):**
```bash
curl -X DELETE http://localhost:3002/tickets/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"reason": "Change of plans"}'
```

### Expected Response
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

### Error Cases

**Ticket Not Found:**
```bash
curl -X DELETE http://localhost:3002/tickets/invalid-ticket-id \
  -H "Content-Type: application/json" \
  -d '{"reason": "Change of plans"}'
```

**Response:**
```json
{
  "success": false,
  "message": "Ticket not found"
}
```

**Already Cancelled:**
```bash
# Cancel once (succeeds)
curl -X DELETE http://localhost:3002/tickets/{id} \
  -H "Content-Type: application/json" \
  -d '{"reason": "No longer needed"}'

# Cancel same ticket again (fails)
curl -X DELETE http://localhost:3002/tickets/{id} \
  -H "Content-Type: application/json" \
  -d '{"reason": "Really dont need it"}'
```

**Response:**
```json
{
  "success": false,
  "message": "Cannot cancel a ticket that is already cancelled"
}
```

---

## Complete Test Workflow

### Scenario: User books and cancels a ticket

```bash
# 1. SEARCH TRIPS
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai"

# From response, note TRIP001 and choose seat A1

# 2. BOOK TICKET
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": "TRIP001",
    "passengerId": "USER123",
    "passengerName": "Alice Johnson",
    "seatNumber": "A1"
  }'

# From response, note ticketId (e.g., abc-123-def-456)

# 3. VIEW TICKET
curl http://localhost:3002/tickets/abc-123-def-456

# 4. SEARCH AGAIN (observe availableSeats decreased)
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai"

# 5. CANCEL TICKET
curl -X DELETE http://localhost:3002/tickets/abc-123-def-456 \
  -H "Content-Type: application/json" \
  -d '{"reason": "Schedule conflict"}'

# 6. VIEW TICKET AGAIN (observe status changed to cancelled)
curl http://localhost:3002/tickets/abc-123-def-456

# 7. SEARCH AGAIN (observe availableSeats increased back)
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai"
```

---

## Testing Tips

### Use Environment Variables
```bash
# Set server URL
set BASE_URL=http://localhost:3002

# Or in PowerShell
$env:BASE_URL = "http://localhost:3002"

# Use in requests
curl "$env:BASE_URL/trips/search"
```

### Pretty Print JSON Response
```bash
# Windows PowerShell
curl http://localhost:3002/tickets | ConvertFrom-Json | ConvertTo-Json

# Unix/Linux with jq
curl http://localhost:3002/tickets | jq .
```

### Test Concurrent Bookings
```bash
# Try to book same seat from multiple terminals
# Terminal 1 and 2 both run:
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP002","passengerId":"USER1","passengerName":"User","seatNumber":"B5"}'

# Only one should succeed; other gets "already booked" error
```

### Test All Seat Classes
```bash
# Economy
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP001","passengerId":"USER1","passengerName":"Test","seatNumber":"A1"}'

# Business
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP001","passengerId":"USER2","passengerName":"Test","seatNumber":"E1"}'

# First Class
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d '{"tripId":"TRIP001","passengerId":"USER3","passengerName":"Test","seatNumber":"F1"}'
```

---

## Debugging

### 1. Server Issues
```bash
# Check if server is running
curl http://localhost:3002/health

# If /health endpoint doesn't exist, try searching
curl http://localhost:3002/trips/search
```

### 2. Port Already in Use
```bash
# Windows: Find process using port 3002
netstat -ano | findstr :3002

# Kill process (replace PID)
taskkill /PID {PID} /F

# macOS/Linux: Find and kill
lsof -i :3002
kill -9 {PID}
```

### 3. Invalid JSON
```bash
# Invalid JSON causes 400 error
curl -X POST http://localhost:3002/tickets \
  -H "Content-Type: application/json" \
  -d 'NOT_VALID_JSON'

# Response: 400 Bad Request
```

### 4. Check Server Logs
```bash
# In terminal running `npm run dev`, you should see:
[TicketController] Booking ticket for...
[TicketService] Publishing event...
[TicketViewService] Updating cache...
```

---

## Summary

**Core workflow:** Search → Book → View → Cancel

All operations should succeed with proper inputs. Errors occur when:
- ❌ Trip doesn't exist
- ❌ Seat doesn't exist or already booked
- ❌ Ticket already cancelled
- ❌ Invalid input format

Use the cases above to validate your implementation! ✅
