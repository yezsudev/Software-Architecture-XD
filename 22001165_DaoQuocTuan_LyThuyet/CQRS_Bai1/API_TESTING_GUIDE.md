# CQRS TodoApp - API Testing Examples

## Sử dụng cURL hoặc Postman để test API

### 1. Check Health

```bash
curl http://localhost:3000/health
```

### 2. Tạo Todo (CREATE)

```bash
Ccurl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn CQRS",
    "description": "Study CQRS pattern and implement"
  }'
```

### 3. Tạo Todo khác

```bash
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy groceries",
    "description": "Milk, eggs, bread, cheese"
  }'
```

### 4. Lấy tất cả Todos (READ ALL)

```bash
curl http://localhost:3000/todos
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "title": "Learn CQRS",
      "description": "Study CQRS pattern and implement",
      "completed": false,
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "status": "pending"
    },
    {
      "id": "uuid-2",
      "title": "Buy groceries",
      "description": "Milk, eggs, bread, cheese",
      "completed": false,
      "createdAt": "2024-01-20T10:31:00.000Z",
      "updatedAt": "2024-01-20T10:31:00.000Z",
      "status": "pending"
    }
  ],
  "statistics": {
    "total": 2,
    "completed": 0,
    "pending": 2
  }
}
```

### 5. Lấy chi tiết Todo (READ ONE)

```bash
# Thay {id} bằng UUID thực tế
curl http://localhost:3000/todos/{id}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "title": "Learn CQRS",
    "description": "Study CQRS pattern and implement",
    "completed": false,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z",
    "status": "pending"
  }
}
```

### 6. Cập nhật Todo (UPDATE)

```bash
curl -X PUT http://localhost:3000/todos/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn CQRS - Advanced",
    "completed": true
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "title": "Learn CQRS - Advanced",
    "description": "Study CQRS pattern and implement",
    "completed": true,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:32:00.000Z"
  }
}
```

### 7. Xóa Todo (DELETE)

```bash
curl -X DELETE http://localhost:3000/todos/{id}
```

**Response:**

```json
{
  "success": true,
  "message": "Todo {id} deleted successfully"
}
```

### 8. Xem lại danh sách (verify deletion)

```bash
curl http://localhost:3000/todos
```

## PowerShell / Windows CMD Examples

Nếu sử dụng Windows, có thể dùng `Invoke-WebRequest` hoặc PowerShell aliases:

### Tạo Todo

```powershell
$body = @{
    title = "Learn CQRS"
    description = "Study CQRS pattern"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/todos" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

### Lấy tất cả Todos

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/todos" -Method GET
```

### Cập nhật Todo

```powershell
$id = "your-todo-id-here"
$body = @{
    title = "Learn CQRS - Advanced"
    completed = $true
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/todos/$id" `
  -Method PUT `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

### Xóa Todo

```powershell
$id = "your-todo-id-here"
Invoke-WebRequest -Uri "http://localhost:3000/todos/$id" -Method DELETE
```

## Sử dụng Postman

1. Mở Postman
2. Tạo collection mới: "CQRS TodoApp"
3. Tạo các request:


| Method | URL                               | Body (JSON)                            |
| ------ | --------------------------------- | -------------------------------------- |
| POST   | `http://localhost:3000/todos`     | `{"title":"...", "description":"..."}` |
| GET    | `http://localhost:3000/todos`     | -                                      |
| GET    | `http://localhost:3000/todos/:id` | -                                      |
| PUT    | `http://localhost:3000/todos/:id` | `{"title":"...", "completed":true}`    |
| DELETE | `http://localhost:3000/todos/:id` | -                                      |

## Dòng chảy kiểm thử (Test Flow)

1. **Tạo todo đầu tiên**

   - Payload: `{"title": "Task 1", "description": "Description 1"}`
   - Lưu ID trả về
2. **Tạo todo thứ hai**

   - Payload: `{"title": "Task 2", "description": "Description 2"}`
   - Lưu ID trả về
3. **Lấy tất cả todos** (verify 2 todos)
4. **Lấy todo đầu tiên** (verify data)
5. **Cập nhật todo thứ 2**

   - Payload: `{"title": "Task 2 Updated", "completed": true}`
6. **Lấy tất cả todos** (verify status thay đổi)
7. **Xóa todo đầu tiên**
8. **Lấy tất cả todos** (verify chỉ còn 1)
9. **Lấy todo đã xóa** (verify 404 error)

## Kiểm tra CQRS Pattern

Khi chạy server, chú ý các log messages:

- `✓ Created todo: {id}` - Từ CommandService
- `✓ Updated todo: {id}` - Từ CommandService
- `✓ Deleted todo: {id}` - Từ CommandService
- `✓ Synced X todos to read model` - Từ QueryService

Đây chứng tỏ Write Model (Commands) và Read Model (Queries) hoạt động độc lập!
