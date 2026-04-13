# QUICK START - Train Ticket System

## 🚀 5-Minute Setup

### 1. Install Dependencies
```bash
cd CQRS_Bai3
npm install
```

### 2. Start Server
```bash
npm run dev
```

✅ Server running on `http://localhost:3002`

## 🧪 Quick Test Flow

### Step 1: Search for Trips
```bash
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai"
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
      "lowestPrice": 500
    }
  ]
}
```

### Step 2: Book a Ticket
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

⚠️ **Save the ticket ID from response** - you'll need it next.

**Expected Response:**
```json
{
  "success": true,
  "message": "Ticket booked successfully on seat A1",
  "data": {
    "id": "... save this ID ...",
    "tripId": "TRIP001",
    "seatNumber": "A1",
    "price": 500,
    "status": "confirmed"
  }
}
```

### Step 3: Get Ticket Details
```bash
# Replace {ID} with the ticket ID from Step 2
curl http://localhost:3002/tickets/{ID}
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
    "pnr": "ABC123"
  }
}
```

### Step 4: Cancel Ticket
```bash
# Replace {ID} with the ticket ID from Step 2
curl -X DELETE http://localhost:3002/tickets/{ID} \
  -H "Content-Type: application/json" \
  -d '{"reason": "No longer needed"}'
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

### Step 5: Verify Cancellation
```bash
curl http://localhost:3002/tickets/{ID}
```

Status should now be `"cancelled"` ✅

## 📋 Available Seed Data

### Trips Loaded on Startup:

**TRIP001:** Bangkok → Chiang Mai
- Departs: 10:00 AM
- Arrives: 6:30 PM (8h 30m duration)
- Seats: 100 total (60 economy, 20 business, 20 first)
- Pricing: 500/1000/2000 baht

**TRIP002:** Bangkok → Chiang Mai  
- Departs: 2:00 PM
- Arrives: 10:30 PM (8h 30m duration)
- Seats: 80 total (50 economy, 15 business, 15 first)
- Pricing: 500/1000/2000 baht

**TRIP003:** Bangkok → Phuket
- Departs: 8:00 AM
- Arrives: 1:00 PM (5h duration)
- Seats: 120 total (80 economy, 25 business, 15 first)
- Pricing: 400/900/1800 baht

## 🔍 More Test Scenarios

### Search by Seat Class
```bash
# Economy only
curl "http://localhost:3002/trips/search?from=Bangkok&to=Chiang%20Mai&seatClass=economy"

# Business only
curl "http://localhost:3002/trips/search?from=Bangkok&to=Phuket&seatClass=business"

# First class only
curl "http://localhost:3002/trips/search?from=Bangkok&to=Phuket&seatClass=first"
```

### Get All Tickets
```bash
curl http://localhost:3002/tickets
```

### Get Tickets for Specific Trip
```bash
curl "http://localhost:3002/tickets?tripId=TRIP001"
```

## 🛠️ Available Commands

```bash
# Development (with auto-reload)
npm run dev

# Build TypeScript
npm run build

# Production (requires build first)
npm start

# Clean build output
npm run clean
```

## ⚡ Architecture Overview

```
Client HTTP Request
         ↓
    Router (ticketRoutes)
         ↓
    Controller (TicketController)
         ↓
    CommandService/QueryService
         ↓
    Database + SeatValidator
         ↓
    Events → EventBus → Listeners
         ↓
    Response to Client
```

## 🔧 Troubleshooting

### Port 3002 Already in Use
```bash
# Change port in src/index.ts
# Or kill process using port 3002
# Windows: netstat -ano | findstr :3002
# macOS/Linux: lsof -i :3002
```

### npm install Fails
```bash
# Try upgrading npm
npm install -g npm@latest

# Clear cache
npm cache clean --force

# Reinstall
npm install
```

### TypeScript Errors
```bash
npm run build
# Check src/ for type errors
```

## 📊 Database State

The database initializes with 3 sample trips on startup. Each trip has:
- Pre-populated seats (economy, business, first class)
- No initial bookings
- Available for immediate booking

To reset data, restart the server (data is in-memory).

## ✅ Verification Checklist

- [ ] `npm install` completed successfully
- [ ] `npm run dev` starts without errors
- [ ] Can search trips (Step 1)
- [ ] Can book ticket (Step 2)
- [ ] Can view ticket (Step 3)
- [ ] Can cancel ticket (Step 4)
- [ ] Can verify cancellation (Step 5)

If all checks pass ✓ - System is working correctly!

## 🎯 Next Steps

1. **Explore API** - Try different search filters and seat classes
2. **Review Code** - Check `src/services/TicketService.ts` for command logic
3. **Understand CQRS** - See how CommandService and QueryService are separated
4. **Study Validation** - Check `src/services/SeatValidator.ts` for business rules
5. **Extend Features** - Add new commands or queries as needed

## 📚 Full Documentation

See `README.md` for:
- Complete API documentation
- Architecture deep dive
- Event system details
- Database layer explanation
- Extension guidelines

Enjoy! 🚀
