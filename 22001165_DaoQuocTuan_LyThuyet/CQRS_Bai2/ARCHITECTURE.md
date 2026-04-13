# CQRS Order System - Architecture Guide

## Overview

The Order System demonstrates **CQRS (Command Query Responsibility Segregation)** with **Event-Driven Architecture**. This goes beyond basic CQRS by introducing an EventBus for loose coupling.

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                     HTTP Requests                             │
└────────────┬──────────────────────────────────────┬───────────┘
             │                                      │
    Commands │                                      │ Queries
             ▼                                      ▼
    ┌─────────────────┐                  ┌──────────────────┐
    │ OrderController │                  │ OrderController  │
    └────────┬────────┘                  └────────┬─────────┘
             │                                    │
             ▼                                    ▼
    ┌─────────────────────┐        ┌──────────────────────┐
    │ CommandService      │        │   QueryService       │
    │                     │        │                      │
    │ • createOrder()     │        │ • getAllOrders()     │
    │ • cancelOrder()     │        │ • getOrderById()     │
    │                     │        │ • getStatistics()    │
    └──────────┬──────────┘        └──────────┬───────────┘
               │ writes OrderEntity │              ▲
               ▼                    │ Subscribe    │
          ┌─────────────┐           │ to events   │
          │ Write Model │           │             │
          │(Map stores) │           ▼             │
          │OrderEntity  │      ┌─────────────┐    │
          └─────────────┘      │  EventBus   │    │
                                │  (broker)   │    │
                       Publish  │             │    │
                       events ──▶  subscribe  ┼────┘
                                │             │
                                └─────────────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │ Read Model   │
                                │(Map cache)   │
                                │OrderView     │
                                └──────────────┘
```

## Component Details

### 1. Models Layer (src/models/index.ts)

#### Write Model: OrderEntity
```typescript
interface OrderEntity {
  id: string;                                    // UUID
  customerId: string;                            // Customer reference
  totalAmount: number;                           // Calculated total
  items: OrderItem[];                            // Full items array
  status: 'pending' | 'confirmed' | 'cancelled'; // State machine
  createdAt: Date;                               // Storage format
  updatedAt: Date;                               // Storage format
  cancelledAt?: Date;                            // Optional timestamp
}
```

**Characteristics:**
- Optimized for **storage and transactions**
- Complete data for audit trail
- JavaScript Date objects for manipulation
- Used internally in CommandService only

#### Read Model: OrderView
```typescript
interface OrderView {
  id: string;                    // Same as entity
  customerId: string;
  totalAmount: number;
  itemCount: number;             // 🔄 DERIVED (calculated)
  status: string;
  statusLabel: string;           // 🔄 DERIVED (Vietnamese)
  createdAt: string;             // ISO format for API
  updatedAt: string;
  cancelledAt?: string;          // ISO format
}
```

**Characteristics:**
- Optimized for **queries and APIs**
- Derived fields pre-calculated
- ISO string dates for JSON serialization
- Used internally in QueryService only
- Never directly accessed in RequestHandlers

#### Events

```typescript
type OrderEvent = OrderCreatedEvent | OrderCancelledEvent;

interface OrderCreatedEvent {
  type: 'ORDER_CREATED';        // Event type (for routing)
  orderId: string;              // Reference to created order
  customerId: string;
  totalAmount: number;
  itemCount: number;
  timestamp: Date;
}

interface OrderCancelledEvent {
  type: 'ORDER_CANCELLED';
  orderId: string;
  reason?: string;              // Why cancelled
  timestamp: Date;
}
```

**Characteristics:**
- Immutable event records
- Type discriminator for routing
- Minimal data (just what projection needs)
- Timestamp for ordering

### 2. Event Bus (src/events/EventBus.ts)

```typescript
class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();

  subscribe(eventType: string, handler: EventHandler): void
  publish(event: OrderEvent): void
  getSubscribers(): Map<string, EventHandler[]>
  clear(): void
}

type EventHandler = (event: OrderEvent) => void;
```

**Responsibilities:**
- **Event routing** - Send events to correct subscribers
- **Error isolation** - Handler errors don't crash other handlers
- **Type-based dispatch** - Route by event.type
- **Subscriber management** - Add/remove listeners

**Implementation:**
```typescript
// Publish
publish(event: OrderEvent): void {
  const eventType = event.type;
  const handlers = this.subscribers.get(eventType);
  if (handlers) {
    handlers.forEach(handler => {
      try {
        handler(event);  // Call subscriber
      } catch (error) {
        console.error(`Error handling ${eventType}:`, error);
      }
    });
  }
}
```

**Why EventBus?**
- ✓ Decouples CommandService from QueryService
- ✓ Allows multiple subscribers per event
- ✓ Easy to add new projections
- ✓ Extensible for complex scenarios
- ✓ Preparation for async messaging (Kafka, etc.)

### 3. CommandService (src/services/CommandService.ts)

```typescript
class CommandService {
  private orders: Map<string, OrderEntity> = new Map();
  
  constructor(private eventBus: EventBus) {}
  
  createOrder(command: CreateOrderCommand): OrderEntity
  cancelOrder(command: CancelOrderCommand): OrderEntity
  getAllOrders(): OrderEntity[]
  getOrderById(id: string): OrderEntity | null
}
```

**Responsibilities:**
- ✓ Handle **write commands** only
- ✓ Apply **business rules** (validation)
- ✓ **Persist** to write model
- ✓ **Publish events** when state changes
- ✓ Maintain **write model consistency**

**Example: createOrder Flow**
```typescript
createOrder(command: CreateOrderCommand): OrderEntity {
  // 1. Validate
  if (!command.customerId || !command.items.length) {
    throw new Error('Invalid input');
  }
  
  // 2. Generate ID
  const id = uuidv4();
  
  // 3. Calculate derived fields
  const totalAmount = command.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice, 0
  );
  
  // 4. Create OrderEntity (write model)
  const order: OrderEntity = {
    id, customerId, totalAmount, items,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // 5. Store in write model
  this.orders.set(id, order);
  
  // 6. Publish event (CRITICAL!)
  const event: OrderCreatedEvent = {
    type: 'ORDER_CREATED',
    orderId: id,
    customerId,
    totalAmount,
    itemCount: command.items.length,
    timestamp: new Date()
  };
  
  this.eventBus.publish(event);  // ← Triggers QueryService
  
  return order;
}
```

**Event-Driven Sync:**
1. CommandService creates/updates entity
2. CommandService publishes event
3. EventBus routes event to subscribers
4. QueryService handles event
5. QueryService updates read model

### 4. QueryService (src/services/QueryService.ts)

```typescript
class QueryService {
  private orderViews: Map<string, OrderView> = new Map();
  
  constructor(private eventBus: EventBus) {
    this.setupEventListeners();  // Subscribe to events
  }
  
  getAllOrders(): OrderView[]
  getOrderById(id: string): OrderView | null
  getStatistics(): Statistics
  
  private setupEventListeners(): void  // Subscribe
  private entityToView(entity: OrderEntity): OrderView  // Convert
}
```

**Responsibilities:**
- ✓ Handle **read operations** only
- ✓ Maintain **read model** (cache)
- ✓ **Listen to events** from EventBus
- ✓ Update read model based on events
- ✓ Optimize queries with derived fields

**Example: Event Listener Setup**
```typescript
private setupEventListeners(): void {
  // Listen for ORDER_CREATED events
  this.eventBus.subscribe('ORDER_CREATED', (event) => {
    const createdEvent = event as OrderCreatedEvent;
    
    // 1. Convert to OrderView
    const view: OrderView = {
      id: createdEvent.orderId,
      customerId: createdEvent.customerId,
      totalAmount: createdEvent.totalAmount,
      itemCount: createdEvent.itemCount,  // Derived
      status: 'pending',
      statusLabel: 'Chờ xử lý',  // Derived (Vietnamese)
      createdAt: createdEvent.timestamp.toISOString(),
      updatedAt: createdEvent.timestamp.toISOString()
    };
    
    // 2. Cache in read model
    this.orderViews.set(createdEvent.orderId, view);
    
    console.log(`📥 [QueryService] Received ORDER_CREATED`);
  });
  
  // Listen for ORDER_CANCELLED events
  this.eventBus.subscribe('ORDER_CANCELLED', (event) => {
    const cancelledEvent = event as OrderCancelledEvent;
    
    // Find and update
    const view = this.orderViews.get(cancelledEvent.orderId);
    if (view) {
      view.status = 'cancelled';
      view.statusLabel = 'Đã hủy';
      view.updatedAt = cancelledEvent.timestamp.toISOString();
      view.cancelledAt = cancelledEvent.timestamp.toISOString();
    }
    
    console.log(`📥 [QueryService] Received ORDER_CANCELLED`);
  });
}
```

**Key Concept: Event-Driven Sync**
- QueryService **never calls** CommandService
- QueryService **never reads** write model
- QueryService **only listens** to events
- Sync is **asynchronous**

### 5. OrderController (src/controllers/OrderController.ts)

```typescript
class OrderController {
  constructor(
    private commandService: CommandService,
    private queryService: QueryService
  ) {}
  
  createOrder = (req: Request, res: Response): void
  getAllOrders = (req: Request, res: Response): void
  getOrderById = (req: Request, res: Response): void
  cancelOrder = (req: Request, res: Response): void
}
```

**Responsibilities:**
- ✓ Handle HTTP requests
- ✓ Route **create/cancel** to CommandService
- ✓ Route **get** to QueryService
- ✓ Validate input
- ✓ Format responses
- ✓ Map errors to status codes

**Pattern:**
```typescript
// For commands (write)
handler = (req: Request, res: Response) => {
  try {
    const command = extractFromRequest(req);
    const result = this.commandService.doSomething(command);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(error.status).json({ error: error.message });
  }
}

// For queries (read)
handler = (req: Request, res: Response) => {
  try {
    const result = this.queryService.doSomething(params);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(error.status).json({ error: error.message });
  }
}
```

## Request Flow Sequences

### CREATE Order Flow

```
1. Client sends POST /orders
   ↓
2. OrderController.createOrder()
   ├─ Validate input
   └─ Extract CreateOrderCommand
   ↓
3. CommandService.createOrder(command)
   ├─ Generate UUID
   ├─ Calculate totalAmount
   ├─ Create OrderEntity
   ├─ Store in write model (Map)
   └─ Create OrderCreatedEvent
   ↓
4. CommandService calls: eventBus.publish(event)
   ↓
5. EventBus finds subscribers for 'ORDER_CREATED'
   ↓
6. QueryService event handler called
   ├─ Convert event to OrderView
   ├─ Add derived fields (statusLabel, itemCount)
   ├─ Cache in read model (Map)
   └─ Log: "📥 [QueryService] Received ORDER_CREATED"
   ↓
7. Controller returns 201 Created response
   └─ With OrderEntity (from write model)
```

**Time sequence:**
```
Time 0: Request arrives
Time 1: CommandService creates & stores
Time 2: Event published (microseconds later)
Time 3: QueryService updates (immediate)
Time 4: Response sent
```

→ **Nearly instant sync!**

### GET Orders Flow

```
1. Client sends GET /orders
   ↓
2. OrderController.getAllOrders()
   ↓
3. QueryService.getAllOrders()
   ├─ Read from read model cache
   ├─ No EventBus involved!
   └─ Return OrderView[]
   ↓
4. Calculate statistics
   ├─ Count by status
   ├─ Sum totalAmount
   └─ Return stats
   ↓
5. Return 200 OK response
   └─ With OrderView[] + stats
```

**Difference from CREATE:**
- No CommandService involved
- No EventBus involved
- Pure read from cache
- Very fast!

### CANCEL Order Flow

```
1. Client sends DELETE /orders/{id}
   ↓
2. OrderController.cancelOrder()
   ├─ Validate input
   └─ Extract CancelOrderCommand
   ↓
3. CommandService.cancelOrder(command)
   ├─ Validate order exists
   ├─ Validate can be cancelled
   ├─ Update OrderEntity status
   ├─ Update timestamps
   ├─ Store in write model
   └─ Create OrderCancelledEvent
   ↓
4. CommandService calls: eventBus.publish(event)
   ↓
5. EventBus routes to subscribers
   ↓
6. QueryService event handler called
   ├─ Find OrderView by id
   ├─ Update status='cancelled'
   ├─ Update statusLabel='Đã hủy'
   ├─ Update timestamps
   └─ Cache updated
   ↓
7. Controller returns 200 OK response
   └─ With updated OrderEntity
```

## Synchronization Models

### Bài 1 (TodoApp) - Synchronous

```
Controller
  │
  ├──▶ CommandService
  │     └─ updates write model
  │
  ├──▶ Manually call sync
  │     │
  │     └──▶ Read all from write
  │           └──▶ Convert & update read model
  │
  └──▶ Return response
```

**Issues:**
- Tight coupling
- Sync always happens
- Can't scale async

### Bài 2 (OrderSystem) - Event-Driven

```
Controller
  │
  ├──▶ CommandService
  │     ├─ Update write model
  │     └─ Publish event
  │          │
  │          ▼
  │     EventBus
  │          │
  │          ▼
  │     QueryService
  │     (via listener)
  │
  └──▶ Return response
```

**Advantages:**
- Loose coupling
- Event-driven
- Can be made async
- Ready for Kafka/RabbitMQ

## Data Flow Summary

### Write Path (Commands)
```
Request ──▶ CommandService ──▶ EventBus ──▶ QueryService
                    │                           │
                    ▼                           ▼
                OrderEntity                OrderView
              (Write Model)               (Read Model)
```

### Read Path (Queries)
```
Request ──▶ QueryService
                │
                ▼
            OrderView
          (Read Model)
            ← Cached ←
```

## Benefits of Event-Driven CQRS

### 1. Loose Coupling
- CommandService doesn't know QueryService exists
- QueryService doesn't depend on CommandService
- Only coupled through EventBus

### 2. Independent Scaling
- CommandService can be on one server
- QueryService on multiple read replicas
- Each optimized independently

### 3. Event Sourcing Ready
- All changes are events
- Can replay events
- Full audit trail
- Time-travel debugging

### 4. Async Ready
- Can replace EventBus with Kafka/RabbitMQ
- QueryService can lag behind
- Multiple projections
- Complex event processing

### 5. Testability
- Mock EventBus
- Test CommandService in isolation
- Test QueryService in isolation
- Test event handlers independently

## Future Enhancements

### Add Event Store
```typescript
class EventStore {
  append(event: OrderEvent): void    // Persist event
  getAllEvents(): OrderEvent[]       // Retrieve all
  getEventsSince(timestamp): OrderEvent[]
  replay(projectionId): void         // Rebuild projection
}
```

### Add Message Queue
Replace EventBus with RabbitMQ/Kafka:
```typescript
class KafkaEventBus {
  publish(event: OrderEvent): void {
    // Send to Kafka topic    
    kafka.send({
      topic: event.type,
      messages: [{ value: JSON.stringify(event) }]
    });
  }
}
```

### Add Multiple Projections
```typescript
class NotificationProjection { /* ... */ }
class AnalyticsProjection { /* ... */ }
class ReportingProjection { /* ... */ }

// All subscribe to same events
eventBus.subscribe('ORDER_CREATED', notification.handle);
eventBus.subscribe('ORDER_CREATED', analytics.handle);
eventBus.subscribe('ORDER_CREATED', reporting.handle);
```

### Add Event Versioning
```typescript
interface Event {
  version: number;     // Schema version
  type: string;
  timestamp: Date;
  data: unknown;
}

// Handle migrations when schema changes
```

## Conclusion

The Order System demonstrates **mature CQRS with event-driven architecture**:

1. ✓ Clear separation of read and write
2. ✓ Different models optimized for each
3. ✓ Event-driven synchronization
4. ✓ Loose coupling via EventBus
5. ✓ Ready for advanced patterns (Event Sourcing, Saga, etc.)

This is production-grade architecture that scales!
