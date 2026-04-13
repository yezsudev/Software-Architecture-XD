# CQRS TodoApp - Bài 1

## Giới thiệu

Đây là một ứng dụng TodoApp được xây dựng theo mô hình **CQRS (Command Query Responsibility Segregation)**. Mô hình này tách biệt các hoạt động ghi (write) và đọc (read) để tối ưu hóa hiệu năng và khả năng mở rộng.

## Kiến trúc CQRS

```
┌─────────────────────────────────────────────────────────────┐
│                        HTTP Requests                         │
└────────────┬────────────────────────────────────────┬────────┘
             │                                        │
             ↓                                        ↓
    ┌─────────────────┐                    ┌──────────────────┐
    │  CommandService │                    │  QueryService    │
    │  (Write Model)  │                    │  (Read Model)    │
    └────────┬────────┘                    └────────┬─────────┘
             │                                      │
             ↓                                      ↓
    ┌─────────────────────┐            ┌────────────────────┐
    │   TodoEntity        │            │    TodoView        │
    │ (Write Optimized)   │            │ (Read Optimized)   │
    └─────────────────────┘            └────────────────────┘
             │                                      ↑
             │         Sync (Event Sourcing)        │
             └──────────────────────────────────────┘
```

## Cấu trúc Dự án

```
CQRS_Bai1/
├── src/
│   ├── models/
│   │   └── index.ts           # Models: TodoEntity, TodoView, Commands
│   ├── services/
│   │   ├── CommandService.ts  # Xử lý ghi (Create, Update, Delete)
│   │   └── QueryService.ts    # Xử lý đọc (Get)
│   ├── controllers/
│   │   └── TodoController.ts  # Điều phối Commands & Queries
│   ├── routes/
│   │   └── todoRoutes.ts      # Định nghĩa API endpoints
│   ├── app.ts                 # Cấu hình Express app
│   └── index.ts               # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Yêu cầu Chức năng

### 1. Tách biệt CommandService và QueryService ✓

**CommandService** (Write Model)
- Quản lý việc tạo, cập nhật, xóa todos
- Lưu trữ dữ liệu trong `TodoEntity`
- Không được sử dụng trực tiếp để truy vấn

**QueryService** (Read Model)
- Quản lý việc truy vấn todos
- Lưu trữ dữ liệu dạng `TodoView` (tối ưu hóa cho đọc)
- Nhận dữ liệu đã xử lý từ Write Model qua quá trình sync

### 2. Hai Model Khác Nhau ✓

**Write Model (TodoEntity)**
```typescript
interface TodoEntity {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
- Tập trung vào việc lưu trữ dữ liệu
- Được tối ưu hóa cho ghi

**Read Model (TodoView)**
```typescript
interface TodoView {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;           // ISO format
  updatedAt: string;           // ISO format
  status: string;              // Derived field
}
```
- Tập trung vào việc hiển thị dữ liệu
- Được tối ưu hóa cho đọc
- Có thêm derived fields (status) cho hiệu năng query

### 3. API Endpoints ✓

#### Commands (Write Operations)

**Tạo todo mới**
```http
POST /todos
Content-Type: application/json

{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread"
}
```
Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "completed": false,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Cập nhật todo**
```http
PUT /todos/{id}
Content-Type: application/json

{
  "title": "Buy groceries and cook",
  "completed": true
}
```

**Xóa todo**
```http
DELETE /todos/{id}
```

#### Queries (Read Operations)

**Lấy danh sách tất cả todos**
```http
GET /todos
```
Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Buy groceries",
      "description": "Milk, eggs, bread",
      "completed": false,
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "status": "pending"
    }
  ],
  "statistics": {
    "total": 1,
    "completed": 0,
    "pending": 1
  }
}
```

**Lấy chi tiết todo**
```http
GET /todos/{id}
```
Response:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "completed": false,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z",
    "status": "pending"
  }
}
```

## Cài đặt & Chạy

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Chạy development mode
```bash
npm run dev
```

### 3. Build production
```bash
npm run build
```

### 4. Chạy production
```bash
npm start
```

Server sẽ chạy tại `http://localhost:3000`

## Ưu điểm của CQRS Pattern

1. **Tách biệt quan tâm (Separation of Concerns)**
   - CommandService chỉ xử lý ghi
   - QueryService chỉ xử lý đọc
   - Mỗi service có trách nhiệm riêng biệt

2. **Tối ưu hóa hiệu năng**
   - Write Model được tối ưu cho ghi
   - Read Model được tối ưu cho đọc
   - Có thể cache data trên Read Model

3. **Khả năng mở rộng (Scalability)**
   - Read Model có thể được scale riêng
   - Write Model có thể được scale riêng
   - Có thể sử dụng database khác nhau

4. **Khả năng bảo trì (Maintainability)**
   - Code dễ hiểu hơn
   - Dễ kiểm thử (testing)
   - Dễ mở rộng chức năng

5. **Event Sourcing Ready**
   - Cấu trúc hỗ trợ Event Sourcing
   - Dễ theo dõi lịch sử thay đổi
   - Dễ triển khai audit trail

## Những cải tiến có thể thêm

- [ ] Sử dụng Event Sourcing thực sự
- [ ] Thêm database (MongoDB, PostgreSQL)
- [ ] Message Queue để async sync (RabbitMQ, Kafka)
- [ ] Caching layer (Redis)
- [ ] Authentication & Authorization
- [ ] Input validation & sanitization
- [ ] Logging & Monitoring
- [ ] Unit tests & Integration tests

## Tài liệu tham khảo

- [CQRS Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
