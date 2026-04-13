# CQRS Order System - Bài 2

## Giới thiệu

Đây là một **Order System** được xây dựng theo mô hình **CQRS** với **Event-Driven Architecture**. Bài 2 nâng cấp Bài 1 bằng cách thêm vào một **EventBus** để giao tiếp giữa CommandService và QueryService.

## Kiến trúc CQRS + Events

```
                    ┌──────────────────┐
                    │  HTTP Requests   │
                    └────────┬─────────┘
                             │
                    ┌────────▼────────┐
                    │ OrderController  │
                    └─┬──────────────┬─┘
                      │              │
       ┌──────────────┘              └──────────────┐
       │                                            │
       ▼                                            ▼
  Create Command                               Get Query
  Cancel Command
       │                                            │
       ▼                                            ▼
  ┌──────────────┐                        ┌─────────────────┐
  │CommandService│───Events──▶  ┌────────▶│ QueryService    │
  ├──────────────┤              │ EventBus├─────────────────┤
  │  Write Model │──Events──┐   │         │  Read Model     │
  │(OrderEntity) │          │   │         │  (OrderView)    │
  └──────────────┘          └───┘         └─────────────────┘
                      
                    📢 Event-Driven Synchronization
                       • Loose coupling
                       • Async sync
                       • Event sourcing ready
```

## Cấu trúc Dự án

```
CQRS_Bai2/
├── src/
│   ├── models/
│   │   └── index.ts              # Models & interfaces
│   │                             # - OrderEntity, OrderView, Events
│   │
│   ├── services/
│   │   ├── CommandService.ts     # Write operations + event publishing
│   │   └── QueryService.ts       # Read operations + event listening
│   │
│   ├── events/
│   │   └── EventBus.ts           # Event publisher/subscriber
│   │
│   ├── controllers/
│   │   └── OrderController.ts    # HTTP request handlers
│   │
│   ├── routes/
│   │   └── orderRoutes.ts        # API routes
│   │
│   ├── app.ts                    # Express app setup
│   └── index.ts                  # Server entry point
│
├── package.json
├── tsconfig.json
└── README.md
```

## Yêu cầu Chức năng

### ✅ Requirement 1: Hệ thống Đơn Hàng

**Commands (Write Operations)**
- ✓ `POST /orders` → Tạo đơn hàng mới
- ✓ `DELETE /orders/:id` → Hủy đơn hàng

**Queries (Read Operations)**
- ✓ `GET /orders` → Xem danh sách đơn hàng
- ✓ `GET /orders/:id` → Xem chi tiết đơn hàng

### ✅ Requirement 2: CQRS Architecture

- ✓ **Separated CommandService**
  - Xử lý createOrder
  - Xử lý cancelOrder
  - Publish events sau mỗi command

- ✓ **Separated QueryService**
  - Xử lý getAll
  - Xử lý getById
  - Nghe events từ EventBus để cập nhật

### ✅ Requirement 3: Event-Driven Synchronization

- ✓ **EventBus**
  - Publisher/Subscriber pattern
  - Loose coupling giữa services
  - Async event handling

- ✓ **Events**
  - `ORDER_CREATED` - When order is created
  - `ORDER_CANCELLED` - When order is cancelled

## Chi tiết Các Thành phần

### 1. Models (src/models/index.ts)

#### Write Model
```typescript
interface OrderEntity {
  id: string;
  customerId: string;
  totalAmount: number;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
}
```

#### Read Model
```typescript
interface OrderView {
  id: string;
  customerId: string;
  totalAmount: number;
  itemCount: number;          // Derived field
  status: string;
  statusLabel: string;        // Derived field (Vietnamese labels)
  createdAt: string;          // ISO format
  updatedAt: string;
  cancelledAt?: string;
}
```

#### Events
```typescript
type OrderEvent = OrderCreatedEvent | OrderCancelledEvent;

interface OrderCreatedEvent {
  type: 'ORDER_CREATED';
  orderId: string;
  customerId: string;
  totalAmount: number;
  itemCount: number;
  timestamp: Date;
}

interface OrderCancelledEvent {
  type: 'ORDER_CANCELLED';
  orderId: string;
  reason?: string;
  timestamp: Date;
}
```

### 2. EventBus (src/events/EventBus.ts)

```typescript
class EventBus {
  subscribe(eventType: string, handler: EventHandler): void
  publish(event: OrderEvent): void
  getSubscribers(): Map<string, EventHandler[]>
  clear(): void
}
```

**Key Features:**
- Simple pub/sub pattern
- Multiple subscribers per event
- Error handling for handlers
- In-memory implementation

### 3. CommandService (src/services/CommandService.ts)

```typescript
class CommandService {
  // Commands (write operations)
  createOrder(command: CreateOrderCommand): OrderEntity
  cancelOrder(command: CancelOrderCommand): OrderEntity
  
  // Internal operations
  getAllOrders(): OrderEntity[]
  getOrderById(id: string): OrderEntity | null
}
```

**Trách nhiệm:**
- Xử lý business logic cho ghi
- Lưu trữ Write Model (OrderEntity)
- **Publish events** khi command thực thi
- Validate business rules (không cancel confirmed order, v.v.)

### 4. QueryService (src/services/QueryService.ts)

```typescript
class QueryService {
  // Queries (read operations)
  getAllOrders(): OrderView[]
  getOrderById(id: string): OrderView | null
  getStatistics(): Statistics
  
  // Event handling
  private setupEventListeners(): void
  private entityToView(entity: OrderEntity): OrderView
}
```

**Trách nhiệm:**
- Xử lý business logic cho đọc
- Lưu trữ Read Model (OrderView)
- **Listen to events** từ EventBus
- Update read model khi events come in
- Cung cấp derived fields (statusLabel, itemCount)

**Event Listeners:**
```typescript
eventBus.subscribe('ORDER_CREATED', (event) => {
  // Cập nhật read model
  const view = create OrderView from event;
  this.orderViews.set(view.id, view);
});

eventBus.subscribe('ORDER_CANCELLED', (event) => {
  // Cập nhật read model
  const view = this.orderViews.get(event.orderId);
  view.status = 'cancelled';
  view.statusLabel = 'Đã hủy';
});
```

## Dòng chảy Yêu cầu

### CREATE Order Flow

```
POST /orders {customerId, items}
    ↓
OrderController.createOrder()
    ↓
CommandService.createOrder()
    ↓
✓ Create OrderEntity
✓ Store in write model Map
    ↓
EventBus.publish(OrderCreatedEvent)
    ↓
QueryService listens to ORDER_CREATED
    ↓
✓ Create OrderView from event
✓ Store in read model cache
    ↓
Return 201 Created
```

### CANCEL Order Flow

```
DELETE /orders/{id}
    ↓
OrderController.cancelOrder()
    ↓
CommandService.cancelOrder()
    ↓
✓ Validate order exists and can be cancelled
✓ Update OrderEntity status = 'cancelled'
    ↓
EventBus.publish(OrderCancelledEvent)
    ↓
QueryService listens to ORDER_CANCELLED
    ↓
✓ Find OrderView by id
✓ Update status and statusLabel
    ↓
Return 200 OK
```

### GET Orders Flow

```
GET /orders
    ↓
OrderController.getAllOrders()
    ↓
QueryService.getAllOrders()
    ↓
✓ Read from OrderView cache (no event bus involved!)
✓ Return array + statistics
    ↓
Return 200 OK
```

**Chú ý:** Read models hoàn toàn độc lập từ CommandService!

## API Examples

### 1. Tạo đơn hàng

```http
POST /orders
Content-Type: application/json

{
  "customerId": "CUST001",
  "items": [
    {
      "productId": "PROD001",
      "productName": "Laptop",
      "quantity": 1,
      "unitPrice": 15000000
    },
    {
      "productId": "PROD002",
      "productName": "Mouse",
      "quantity": 2,
      "unitPrice": 500000
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "CUST001",
    "totalAmount": 16000000,
    "items": [
      {
        "productId": "PROD001",
        "productName": "Laptop",
        "quantity": 1,
        "unitPrice": 15000000,
        "subtotal": 15000000
      },
      {
        "productId": "PROD002",
        "productName": "Mouse",
        "quantity": 2,
        "unitPrice": 500000,
        "subtotal": 1000000
      }
    ],
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### 2. Xem danh sách đơn hàng

```http
GET /orders
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "customerId": "CUST001",
      "totalAmount": 16000000,
      "itemCount": 2,
      "status": "pending",
      "statusLabel": "Chờ xử lý",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "statistics": {
    "total": 1,
    "pending": 1,
    "confirmed": 0,
    "cancelled": 0,
    "totalRevenue": 16000000
  }
}
```

### 3. Xem chi tiết đơn hàng

```http
GET /orders/{id}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "CUST001",
    "totalAmount": 16000000,
    "itemCount": 2,
    "status": "pending",
    "statusLabel": "Chờ xử lý",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### 4. Hủy đơn hàng

```http
DELETE /orders/{id}
Content-Type: application/json

{
  "reason": "Khách hàng yêu cầu hủy"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order {id} cancelled successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "CUST001",
    "totalAmount": 16000000,
    "items": [...],
    "status": "cancelled",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z",
    "cancelledAt": "2024-01-20T10:31:00.000Z"
  }
}
```

## Event Flow Visualization

```
┌─────────────────────────────────────────────────────┐
│         User sends POST /orders                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ CommandService     │
        │ .createOrder()     │
        └─┬──────────────┬───┘
          │              │
    Write│              │Publish
  OrderE │              │ Event
   ntity │              │
          │              ▼
          │    ┌──────────────────┐
          │    │    EventBus      │
          │    │  .publish(event) │
          │    └────────┬─────────┘
          │             │
          ▼             ▼
    ┌──────────┐   ┌─────────────────┐
    │OrderView │   │ QueryService    │
    │  Cache   │   │ .onOrderCreated()
    │ (Read    │   │                 │
    │  Model)  │   │ Update read     │
    └──────────┘   │ model cache     │
                   └─────────────────┘
```

## Server Console Output

Khi tạo order, bạn sẽ thấy:

```
POST /orders

✓ [CommandService] Created order: 550e8400-e29b-41d4-a716-446655440000
📢 Publishing event: ORDER_CREATED
✓ Subscribed to event: ORDER_CREATED
📥 [QueryService] Received ORDER_CREATED event: 550e8400-e29b-41d4-a716-446655440000
```

Logs này chứng tỏ:
- CommandService xử lý write
- Event được publish
- QueryService nghe event
- Read model được cập nhật

## Lợi ích của Event-Driven CQRS

### ✓ Loose Coupling
- CommandService không biết QueryService
- QueryService không call CommandService
- Chỉ thông qua events

### ✓ Scalability
- Có thể thêm nhiều subscribers
- Mỗi subscriber có thể handle async
- Dễ scale read operations

### ✓ Event Sourcing Ready
- Events là first-class citizens
- Dễ audit trail
- Dễ replay events

### ✓ Testability
- Dễ mock EventBus
- Dễ test messages
- Clear dependencies

## Cách Chạy

### 1. Cài đặt
```bash
npm install
```

### 2. Development
```bash
npm run dev
```

Server chạy tại `http://localhost:3001`

### 3. Build
```bash
npm run build
```

### 4. Production
```bash
npm start
```

## So sánh Bài 1 vs Bài 2

| Aspect | Bài 1 (TodoApp) | Bài 2 (OrderSystem) |
|--------|-----------------|---------------------|
| Sync mechanism | Manual in controller | Event-driven |
| Coupling | Tight (controller knows both) | Loose (via EventBus) |
| Query on Read | Direct Map access | Event-subscribed |
| Scalability | Limited | Better (event streaming) |
| Async capability | No | Yes (event handlers) |
| Event sourcing | Not ready | Ready |
| Complexity | Simple | Medium |

## Mở rộng (Future Improvements)

- [ ] Persist events to event store
- [ ] Add message queue (RabbitMQ, Kafka)
- [ ] Implement saga pattern for multi-step orders
- [ ] Add order status workflow (pending → confirmed → shipped)
- [ ] Database integration
- [ ] Event replay capability
- [ ] Projection versioning
- [ ] Idempotent event handlers

## Tài liệu Tham Khảo

- Event-Driven Architecture
- Pub/Sub Pattern
- Event Sourcing
- CQRS with Event Bus
