# CQRS TodoApp - Hướng Dẫn Bắt Đầu

## 📋 Yêu cầu

- Node.js (v14 hoặc cao hơn)
- npm hoặc yarn
- (Optional) Postman hoặc cURL để test API

## 🚀 Cài đặt & Chạy

### 1. Cài đặt Dependencies

```bash
# Vào folder project
cd CQRS_Bai1

# Cài đặt packages
npm install
```

### 2. Chạy Development Mode

```bash
npm run dev
```

Output:
```
╔════════════════════════════════════╗
║   CQRS TodoApp API Server Started   ║
╚════════════════════════════════════╝

Host: http://localhost:3000
Health: http://localhost:3000/health
Todos API: http://localhost:3000/todos

Commands (Write Operations):
  POST   /todos      - Create todo
  PUT    /todos/:id  - Update todo
  DELETE /todos/:id  - Delete todo

Queries (Read Operations):
  GET    /todos      - Get all todos
  GET    /todos/:id  - Get todo by id
```

### 3. Test API

Mở terminal mới và thử:

```bash
# Check health
curl http://localhost:3000/health

# Tạo todo
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn CQRS",
    "description": "Study CQRS pattern"
  }'

# Lấy tất cả todos
curl http://localhost:3000/todos
```

Xem chi tiết trong [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)

### 4. Build cho Production

```bash
npm run build
```

Folder `dist/` sẽ được tạo ra

### 5. Chạy Production

```bash
npm start
```

## 📁 Cấu Trúc Dự Án

```
CQRS_Bai1/
├── src/
│   ├── models/
│   │   └── index.ts              # TodoEntity, TodoView, Commands
│   │                            # Write Model & Read Model definitions
│   │
│   ├── services/
│   │   ├── CommandService.ts    # ⚙️ Write Operations
│   │   │                        # - createTodo()
│   │   │                        # - updateTodo()
│   │   │                        # - deleteTodo()
│   │   │
│   │   └── QueryService.ts      # ⚙️ Read Operations
│   │                            # - getAllTodos()
│   │                            # - getTodoById()
│   │                            # - getStatistics()
│   │
│   ├── controllers/
│   │   └── TodoController.ts    # 🎮 HTTP Request Handlers
│   │                            # - Orchestrates commands & queries
│   │                            # - Manages sync between models
│   │
│   ├── routes/
│   │   └── todoRoutes.ts        # 🛣️ API Routes Definition
│   │                            # - POST /todos
│   │                            # - GET /todos
│   │                            # - GET /todos/:id
│   │                            # - PUT /todos/:id
│   │                            # - DELETE /todos/:id
│   │
│   ├── app.ts                   # 🌐 Express App Setup
│   │
│   └── index.ts                 # 🚀 Server Entry Point
│
├── package.json                 # Project metadata & dependencies
├── tsconfig.json                # TypeScript configuration
├── .gitignore                   # Git ignore rules
│
├── README.md                    # Giới thiệu chi tiết
├── ARCHITECTURE.md              # CQRS pattern giải thích
├── API_TESTING_GUIDE.md         # Hướng dẫn test API
└── QUICK_START.md              # File này
```

## 🔄 CQRS Pattern Architecture

```
                    ┌─────────────────┐
                    │  HTTP Requests  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   TodoController │
                    └─┬──────────────┬─┘
                      │              │
         ┌────────────┘              └─────────────┐
         │                                         │
         ▼                                         ▼
    Create Command                           Get Query
    Update Command              
    Delete Command
         │                                         │
         ▼                                         ▼
   ┌──────────────┐                      ┌──────────────┐
   │CommandService│  ──Sync─Events──▶   │ QueryService │
   ├──────────────┤                      ├──────────────┤
   │ Write Model  │                      │  Read Model  │
   │ (TodoEntity) │                      │  (TodoView)  │
   └──────────────┘                      └──────────────┘
```

## 📖 Key Files Explanation

### models/index.ts
Định nghĩa 2 models khác nhau:

```typescript
// Write Model - Tối ưu cho ghi
TodoEntity {
  id, title, description, completed,
  createdAt, updatedAt
}

// Read Model - Tối ưu cho đọc
TodoView {
  id, title, description, completed,
  createdAt (ISO string), updatedAt (ISO string),
  status (derived field)
}
```

### services/CommandService.ts
Xử lý tất cả write operations:
- `createTodo()` - Tạo todo mới
- `updateTodo()` - Cập nhật todo
- `deleteTodo()` - Xóa todo

### services/QueryService.ts
Xử lý tất cả read operations:
- `getAllTodos()` - Lấy tất cả
- `getTodoById()` - Lấy 1 todo
- `getStatistics()` - Thống kê

### controllers/TodoController.ts
Điều phối giữa services:
- HTTP handlers
- Validation
- Sync write model → read model

## 🧪 Testing Flow

1. **Tạo todos**
   ```bash
   POST /todos
   ```

2. **Lấy danh sách**
   ```bash
   GET /todos
   ```

3. **Cập nhật**
   ```bash
   PUT /todos/{id}
   ```

4. **Lấy chi tiết**
   ```bash
   GET /todos/{id}
   ```

5. **Xóa**
   ```bash
   DELETE /todos/{id}
   ```

Xem chi tiết: [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)

## 💡 CQRS Pattern Benefits

✅ **Separation of Concerns** - Tách read & write logic
✅ **Performance** - Mỗi model được tối ưu
✅ **Scalability** - Read & write scale riêng
✅ **Flexibility** - Dễ thêm caching, events, etc.
✅ **Testability** - Dễ test từng service

## 🔍 Console Output

Khi chạy, bạn sẽ thấy logs từ CQRS pattern:

```
POST /todos
✓ Created todo: 550e8400-e29b-41d4-a716-446655440000
✓ Synced 1 todos to read model

GET /todos
(Query từ Read Model, không từ Write Model)

PUT /todos/550e8400-e29b-41d4-a716-446655440000
✓ Updated todo: 550e8400-e29b-41d4-a716-446655440000
✓ Synced 1 todos to read model
```

Logs này chứng tỏ:
- CommandService xử lý ghi
- QueryService xử lý đọc
- Sync tự động từ write model sang read model

## 📚 Tài Liệu

- [README.md](README.md) - Giới thiệu toàn bộ project
- [ARCHITECTURE.md](ARCHITECTURE.md) - CQRS pattern chi tiết
- [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) - Cách test API

## ❓ Troubleshooting

### Port 3000 already in use
```bash
# Dùng port khác
PORT=3001 npm run dev
```

### Module not found errors
```bash
# Xoá node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
```bash
# Rebuild
npm run build
```

## 🎯 Hands-on Practice

1. Thêm validation cho title & description
2. Thêm error handling cho edge cases
3. Thêm logging/analytics
4. Thêm caching layer
5. Thêm database (MongoDB/PostgreSQL)
6. Thêm message queue (simulating async sync)
7. Thêm unit tests

## 📞 Support

Xem các file documentation:
- Architecture questions → [ARCHITECTURE.md](ARCHITECTURE.md)
- API usage → [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)
- Project overview → [README.md](README.md)

---

**Happy learning! 🚀**
