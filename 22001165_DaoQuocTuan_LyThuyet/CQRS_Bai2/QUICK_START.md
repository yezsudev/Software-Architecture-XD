# CQRS Order System - Quick Start

## 📋 Requirements

- Node.js (v14+)
- npm or yarn
- Terminal/PowerShell
- cURL or Postman (optional, for testing)

## 🚀 Get Started in 2 Minutes

### 1. Install
```bash
cd CQRS_Bai2
npm install
```

### 2. Run
```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════╗
║   CQRS Order System API Server Started  ║
╚════════════════════════════════════════╝

Host: http://localhost:3001
Health: http://localhost:3001/health
Orders API: http://localhost:3001/orders
```

### 3. Test (New Terminal)
```bash
# Create order
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST001",
    "items": [
      {
        "productId": "PROD001",
        "productName": "Laptop",
        "quantity": 1,
        "unitPrice": 15000000
      }
    ]
  }'

# Get all orders
curl http://localhost:3001/orders
```

**That's it!** You have CQRS Order System running! 🎉

## 📚 Full Documentation

- [README.md](README.md) - Complete project overview
- [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) - Detailed API examples

## 🏗️ Project Structure

```
CQRS_Bai2/
├── src/
│   ├── models/index.ts              # OrderEntity, OrderView, Events
│   ├── events/EventBus.ts           # Event publisher/subscriber
│   ├── services/
│   │   ├── CommandService.ts        # Write operations + publish events
│   │   └── QueryService.ts          # Read operations + listen events
│   ├── controllers/OrderController.ts
│   ├── routes/orderRoutes.ts
│   ├── app.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 🔄 CQRS Architecture

```
POST /orders        GET /orders
     │                   │
     ▼                   ▼
CommandService ─Events─→ QueryService
(Write Model)          (Read Model)
     │                   │
     └─ EventBus ────────┘
```

**Key concept:** Events decouple write and read!

## 🎯 What Each File Does

### models/index.ts
- `OrderEntity` - Write model (full data)
- `OrderView` - Read model (optimized for queries)
- `OrderCreatedEvent` - Published when order created
- `OrderCancelledEvent` - Published when order cancelled

### events/EventBus.ts
- `subscribe(eventType, handler)` - Listen to events
- `publish(event)` - Emit events
- Decouples CommandService and QueryService

### services/CommandService.ts
- `createOrder()` - Create new order → Publish ORDER_CREATED
- `cancelOrder()` - Cancel order → Publish ORDER_CANCELLED

### services/QueryService.ts
- `getAllOrders()` - Get orders from read model
- `getOrderById()` - Get single order from read model
- Listens to events and updates read model cache

## 📖 Key Concepts

### Write Model (CommandService)
- Full data for storage
- Uses Date objects
- Published to read model via events

### Read Model (QueryService)
- Denormalized for queries
- ISO string dates for API
- Derived fields (statusLabel, itemCount)
- Cached in memory

### Events
- `ORDER_CREATED` - When order created
- `ORDER_CANCELLED` - When order cancelled
- Contain minimal info for projection

### EventBus
- Simple pub/sub
- Decouples services
- Event-driven sync

## 🧪 Quick Test Flow

```bash
# Terminal 1 - Start server
npm run dev

# Terminal 2 - Test
# Create order
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":"CUST001","items":[{"productId":"P1","productName":"Item","quantity":1,"unitPrice":100}]}'

# Get all (see the order created above)
curl http://localhost:3001/orders

# Cancel it (use the ID from create response)
curl -X DELETE http://localhost:3001/orders/<ID> \
  -H "Content-Type: application/json" \
  -d '{"reason":"test"}'

# Get all again (see cancelled status)
curl http://localhost:3001/orders
```

## 🔍 Watch Console Output

When you make requests, you'll see:

**CREATE:**
```
POST /orders
✓ [CommandService] Created order: <uuid>
📢 Publishing event: ORDER_CREATED
📥 [QueryService] Received ORDER_CREATED event: <uuid>
```

**CANCEL:**
```
DELETE /orders/<uuid>
✓ [CommandService] Cancelled order: <uuid>
📢 Publishing event: ORDER_CANCELLED
📥 [QueryService] Received ORDER_CANCELLED event: <uuid>
```

**GET (Read-only):**
```
GET /orders
(No event logs - just reads from cache!)
```

## 💻 Other Commands

### Build
```bash
npm run build
```
Creates `dist/` folder with compiled JavaScript

### Production
```bash
npm start
```
Runs compiled code from `dist/`

## 📊 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /orders | Create new order |
| GET | /orders | Get all orders |
| GET | /orders/:id | Get order by ID |
| DELETE | /orders/:id | Cancel order |
| GET | /health | Health check |

## ✨ What Makes This CQRS?

1. ✓ **Separated Services**
   - CommandService for write
   - QueryService for read

2. ✓ **Different Models**
   - OrderEntity for write
   - OrderView for read

3. ✓ **Decoupled**
   - Via EventBus
   - No direct calls between services

4. ✓ **Event-Driven**
   - Commands publish events
   - Queries listen to events
   - Async synchronization

## 🚨 Troubleshooting

### Port 3001 already in use
```bash
PORT=3002 npm run dev
```

### Modules not found
```bash
rm -rf node_modules
npm install
```

### TypeScript errors
```bash
npm run build
```

## 📈 Comparing Bài 1 vs Bài 2

| Feature | Bài 1 | Bài 2 |
|---------|-------|-------|
| Sync mechanism | Controller-based | Event-driven |
| Coupling | Tight | Loose |
| Scalability | Basic | Better |
| Events | No | Yes |
| Event sourcing ready | No | Yes |
| Async capability | No | Yes (can extend) |
| Complexity | Simple | Medium |

## 🎓 Learning Path

1. **Run the server** → See it work
2. **Make requests** → Understand API
3. **Watch console** → See events flowing
4. **Read README.md** → Understand architecture
5. **Study code** → See implementation
6. **Modify code** → Extend functionality

## 🔗 Next Steps

- Add database (MongoDB/PostgreSQL)
- Add message queue (RabbitMQ/Kafka)
- Implement more complex workflows
- Add event store for persistence
- Add projections versioning

## 📞 Need Help?

Check these files:
- **Overview:** [README.md](README.md)
- **API Examples:** [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)
- **Code:** Check `src/` folder

---

**Ready? Let's go!** 🚀

```bash
npm install
npm run dev
```

Then open another terminal and start testing with cURL or Postman!
