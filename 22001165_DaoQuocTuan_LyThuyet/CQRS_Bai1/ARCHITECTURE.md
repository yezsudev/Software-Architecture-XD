# CQRS Pattern - Giải Thích Chi Tiết

## 1. Khái niệm CQRS

**CQRS** (Command Query Responsibility Segregation) là một mô hình kiến trúc phần mềm được phát triển bởi Greg Young. Nó tách biệt các hoạt động đọc (read) và ghi (write) thành các xử lý (handler) khác nhau.

### Nguyên tắc cơ bản

```
Một hệ thống được chia thành 2 phần:

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────┐                    ┌──────────────────┐   │
│  │   COMMANDS   │                    │     QUERIES      │   │
│  │  (Write Side)│                    │   (Read Side)    │   │
│  ├──────────────┤                    ├──────────────────┤   │
│  │ • Create     │                    │ • GetAll         │   │
│  │ • Update     │                    │ • GetById        │   │
│  │ • Delete     │                    │ • GetStatistics  │   │
│  └──────┬───────┘                    └─────────┬────────┘   │
│         │                                      │            │
│         ▼                                      ▼            │
│  ┌──────────────┐                    ┌──────────────────┐   │
│  │ Write Model  │─────────────────▶  │   Read Model     │   │
│  │              │   Sync Event       │                  │   │
│  └──────────────┘                    └──────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 2. So sánh: Traditional CRUD vs CQRS

### Traditional CRUD Model

```
Client ─────▶ Single Model ◀───── Client
             (Read/Write)
```

Vấn đề:
- Một model được sử dụng cho cả read và write
- Model phải đáp ứng nhu cầu của cả hai hoạt động
- Hiệu năng bị ảnh hưởng
- Logic phức tạp hơn

### CQRS Model

```
Client ────▶ Write Model ◀───── Write Commands
Client ────▶ Read Model  ◀───── Read Queries
```

Lợi ích:
- Tách biệt 2 mối quan tâm (Separation of Concerns)
- Mỗi model được tối ưu cho mục đích cụ thể
- Dễ scale
- Dễ hiểu và bảo trì

## 3. Thành phần trong CQRS TodoApp

### A. Models

#### Write Model (TodoEntity)
```typescript
interface TodoEntity {
  id: string;                    // Unique identifier
  title: string;                 // Tính đơn giản, không parsing
  description: string;
  completed: boolean;
  createdAt: Date;              // JavaScript Date object
  updatedAt: Date;              // Dễ thao tác
}
```
- Tập trung vào **tính nhất quán dữ liệu** (consistency)
- Audit trail đầy đủ
- Được tối ưu để **ghi nhanh**

#### Read Model (TodoView)
```typescript
interface TodoView {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;             // ISO string format
  updatedAt: string;             // Dễ serialize cho API
  status: string;                // Derived field
}
```
- Tập trung vào **performance**
- Có derived fields (status) được tính trước
- Được tối ưu để **đọc nhanh**

### B. CommandService (Write Side)

```typescript
class CommandService {
  // Chỉ xử lý: Create, Update, Delete
  createTodo(command: CreateTodoCommand): TodoEntity
  updateTodo(command: UpdateTodoCommand): TodoEntity
  deleteTodo(command: DeleteTodoCommand): boolean
}
```

Trách nhiệm:
- Xác thực business rules
- Đảm bảo tính nhất quán dữ liệu
- Lưu trữ Write Model

### C. QueryService (Read Side)

```typescript
class QueryService {
  // Chỉ xử lý: Read operations
  getAllTodos(): TodoView[]
  getTodoById(id: string): TodoView | null
  getStatistics(): Statistics
}
```

Trách nhiệm:
- Trả về dữ liệu từ Read Model
- Tối ưu hóa cho hiệu năng query
- Không thay đổi dữ liệu

### D. TodoController

```typescript
class TodoController {
  constructor(
    private commandService: CommandService,
    private queryService: QueryService
  )
}
```

Trách nhiệm:
- Nhận HTTP requests
- Route tới đúng service
- Sync Write Model sang Read Model
- Trả về responses

## 4. Dòng chảy yêu cầu

### Request CREATE (Command)

```
POST /todos
{
  "title": "Learn CQRS",
  "description": "Study architecture"
}
    │
    ▼
┌─────────────────┐
│   Controller    │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│  CommandService      │
│  .createTodo()       │
└────────┬─────────────┘
         │
         ▼
    Write Model
   (TodoEntity)
   stored in Map
    │
    │ Trigger Sync
    │
    ▼
┌──────────────────────┐
│  QueryService        │
│  .syncFromWriteModel()
└────────┬─────────────┘
         │
         ▼
    Read Model
   (TodoView)
   cached in Map
         │
         ▼
   Return Response
   (201 Created)
```

### Request GET (Query)

```
GET /todos/:id
    │
    ▼
┌─────────────────┐
│   Controller    │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│  QueryService        │
│  .getTodoById()      │
└────────┬─────────────┘
         │
         ▼
   Read Model
   (TodoView)
   fetch from cache
         │
         ▼
   Return Response
   (200 OK)
```

**Chú ý**: Query không bao giờ truy cập Write Model trực tiếp!

## 5. Lợi ích của CQRS

### ✓ Separation of Concerns
- CommandService chỉ quan tâm đến ghi
- QueryService chỉ quan tâm đến đọc
- Code dễ hiểu và bảo trì

### ✓ Performance Optimization
- Write Model có thể sử dụng transaction logs
- Read Model có thể sử dụng denormalization
- Mỗi model được tối ưu cho mục đích

### ✓ Scalability
```
┌────────────────┐
│ Load Balancer  │
├────────┬───────┤
│        │       │
▼        ▼       ▼
┌──────────────────────┐
│  Multiple Read       │
│  Model Replicas      │  (có thể scale out)
│  (Caching, Cache DBs)│
└──────────────────────┘

┌──────────────────────┐
│  Write Model         │  (có thể sử dụng
│  (Single Source)     │   database riêng)
└──────────────────────┘
```

### ✓ Flexibility
- Có thể sử dụng database khác nhau
- Có thể implement caching dễ dàng
- Có thể thêm subscriptions, notifications

### ✓ Testing
- CommandService dễ test (isolation)
- QueryService dễ test (no side effects)
- Có thể mock services độc lập

## 6. Thách thức của CQRS

### ⚠️ Eventual Consistency
- Read Model có thể không phản ánh ngay Write Model
- Cần xử lý trường hợp không nhất quán tạm thời

```
Command ──▶ Write Model Updated ──▶ Event ──▶ Read Model Updated
            (immediately)                      (eventually)
```

### ⚠️ Complexity
- Kiến trúc phức tạp hơn CRUD truyền thống
- Cần quản lý 2 models
- Cần implement sync mechanism

### ⚠️ Data Consistency
- Cần đảm bảo dữ liệu consistent giữa 2 models
- Có thể xảy ra data loss nếu sync fails
- Cần audit logs/event sourcing

## 7. Mở rộng: Event Sourcing

CQRS thường đi kèm với **Event Sourcing**:

```
┌─────────────────────────────────────────────────┐
│          EventStore (Single Source of Truth)    │
│                                                  │
│ Event 1: TodoCreated { id, title, ... }        │
│ Event 2: TodoUpdated { id, completed: true }   │
│ Event 3: TodoDeleted { id }                    │
└──────────┬──────────────────────────────────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
Write Model    Read Model
(Rebuild)      (Projections)
```

Lợi ích:
- Audit trail đầy đủ
- Có thể xem lịch sử thay đổi
- Có thể time-travel debugging
- Có thể rebuild models

## 8. Khi nào dùng CQRS?

### ✓ Nên dùng:
- Ứng dụng có read/write khác nhau về mức độ
- Cần high scalability cho read operations
- Có phức tạp business logic
- Cần audit trail
- Có distributed systems

### ✗ Không nên dùng:
- Ứng dụng CRUD đơn giản
- Team nhỏ và không experienced
- Không có scaling needs
- Performance không critical
- Eventual consistency không acceptable

## 9. Ví dụ thực tế

### E-commerce Platform

```
┌──────────────────────┐
│   Customer Orders    │
│  (Commands)          │
│ • Place Order        │
│ • Cancel Order       │
└──────────────┬───────┘
               │
               ▼
         Write Model
        (Order DB)
        - Full data
        - Transactions
               │
               ▼
        ┌────────────────┐
        │ Events/Queues  │
        └────────┬───────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    Inventory DB    Analytics Cache
    (Replicas)      (Elasticsearch)
    - Fast reads    - Fast searches
    - Cached        - Aggregations
```

### Social Media Feed

```
┌──────────────────────┐
│   User Actions       │
│  (Commands)          │
│ • Post Tweet         │
│ • Like Tweet         │
│ • Comment            │
└──────────────┬───────┘
               │
               ▼
         Activity Log
        (Write Model)
               │
               ▼
         ┌────────────────┐
         │ Event Stream   │
         └────────┬───────┘
                  │
    ┌─────────────┤
    │             │
    ▼             ▼
Timeline DB   Trending DB
(User Feed)   (Statistics)
- Dense       - Analytics
- Cached      - Aggregated
```

## 10. Best Practices

1. **Keep models simple**
   - Write Model: chỉ cần nhất thiết
   - Read Model: tối ưu cho query

2. **Implement strong sync mechanism**
   - Event bus/streaming
   - Ensure consistency
   - Handle failures

3. **Versioning**
   - Command versions
   - Event versions
   - Model versions

4. **Logging & Monitoring**
   - Track all commands
   - Monitor sync lag
   - Alert on inconsistencies

5. **Testing strategy**
   - Unit tests cho services
   - Integration tests cho flow
   - Consistency tests

## Tài liệu Tham Khảo

- Martin Fowler - CQRS Pattern
- Greg Young - CQRS Documents
- Microsoft Azure Docs - CQRS Pattern
- Event Sourcing by Ford
