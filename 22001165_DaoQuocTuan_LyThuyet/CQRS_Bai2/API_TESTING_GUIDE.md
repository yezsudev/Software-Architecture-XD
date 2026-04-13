# CQRS Order System - API Testing Guide

## Quick Test with cURL

### 1. Check Health
```bash
curl http://localhost:3001/health
```

### 2. Create First Order
```bash
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
      },
      {
        "productId": "PROD002",
        "productName": "Mouse",
        "quantity": 2,
        "unitPrice": 500000
      }
    ]
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "uuid-here",
    "customerId": "CUST001",
    "totalAmount": 16000000,
    "items": [...],
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### 3. Create Second Order (Different Customer)
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST002",
    "items": [
      {
        "productId": "PROD003",
        "productName": "Monitor",
        "quantity": 1,
        "unitPrice": 5000000
      }
    ]
  }'
```

### 4. Get All Orders
```bash
curl http://localhost:3001/orders
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "customerId": "CUST001",
      "totalAmount": 16000000,
      "itemCount": 2,
      "status": "pending",
      "statusLabel": "Chờ xử lý",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "id": "uuid-2",
      "customerId": "CUST002",
      "totalAmount": 5000000,
      "itemCount": 1,
      "status": "pending",
      "statusLabel": "Chờ xử lý",
      "createdAt": "2024-01-20T10:31:00.000Z",
      "updatedAt": "2024-01-20T10:31:00.000Z"
    }
  ],
  "statistics": {
    "total": 2,
    "pending": 2,
    "confirmed": 0,
    "cancelled": 0,
    "totalRevenue": 21000000
  }
}
```

**Notice: Read Model shows derived fields!**
- `itemCount` - calculated from items array
- `statusLabel` - Vietnamese labels
- `statistics` - query-side optimization

### 5. Get Order Details
```bash
# Replace uuid-1 with actual order ID from previous response
curl http://localhost:3001/orders/uuid-1
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
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

### 6. Cancel Order
```bash
# Replace uuid-1 with actual order ID
curl -X DELETE http://localhost:3001/orders/uuid-1 \
  -H "Content-Type: application/json" \
  -d '{"reason": "Khách hàng yêu cầu hủy"}'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Order uuid-1 cancelled successfully",
  "data": {
    "id": "uuid-1",
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

### 7. Check Updated Orders List
```bash
curl http://localhost:3001/orders
```

**Notice: The cancelled order now shows in read model!**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "customerId": "CUST001",
      "totalAmount": 16000000,
      "itemCount": 2,
      "status": "cancelled",
      "statusLabel": "Đã hủy",  // ← Changed!
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:31:00.000Z",
      "cancelledAt": "2024-01-20T10:31:00.000Z"
    },
    {
      "id": "uuid-2",
      "customerId": "CUST002",
      "totalAmount": 5000000,
      "itemCount": 1,
      "status": "pending",
      "statusLabel": "Chờ xử lý",
      "createdAt": "2024-01-20T10:31:00.000Z",
      "updatedAt": "2024-01-20T10:31:00.000Z"
    }
  ],
  "statistics": {
    "total": 2,
    "pending": 1,    // ← Changed
    "confirmed": 0,
    "cancelled": 1,  // ← Changed
    "totalRevenue": 21000000
  }
}
```

### 8. Try to Get Cancelled Order
```bash
curl http://localhost:3001/orders/uuid-1
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-1",
    "customerId": "CUST001",
    "totalAmount": 16000000,
    "itemCount": 2,
    "status": "cancelled",
    "statusLabel": "Đã hủy",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:31:00.000Z",
    "cancelledAt": "2024-01-20T10:31:00.000Z"
  }
}
```

## Console Output to Observe

When you run requests, watch the terminal output:

### On CREATE:
```
POST /orders

✓ [CommandService] Created order: 550e8400-e29b-41d4-a716-446655440000
📢 Publishing event: ORDER_CREATED
📥 [QueryService] Received ORDER_CREATED event: 550e8400-e29b-41d4-a716-446655440000
```

**What's happening:**
1. CommandService creates order in write model
2. CommandService publishes ORDER_CREATED event
3. EventBus routes event to subscribers
4. QueryService receives event
5. QueryService updates read model cache

### On CANCEL:
```
DELETE /orders/550e8400-e29b-41d4-a716-446655440000

✓ [CommandService] Cancelled order: 550e8400-e29b-41d4-a716-446655440000
📢 Publishing event: ORDER_CANCELLED
📥 [QueryService] Received ORDER_CANCELLED event: 550e8400-e29b-41d4-a716-446655440000
```

### On GET (No Events):
```
GET /orders

(No logs from EventBus - read-only operation!)
```

## PowerShell Examples

### Create Order
```powershell
$body = @{
    customerId = "CUST001"
    items = @(
        @{
            productId = "PROD001"
            productName = "Laptop"
            quantity = 1
            unitPrice = 15000000
        }
    )
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/orders" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertTo-Json
```

### Get All Orders
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/orders" -Method GET | ConvertTo-Json
```

### Cancel Order
```powershell
$id = "your-order-id"
$body = @{
    reason = "Khách hàng yêu cầu hủy"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/orders/$id" `
  -Method DELETE `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body | ConvertTo-Json
```

## Full Test Scenario

1. **Create Order 1** (CUST001, 2 items)
   - Check console: ORDER_CREATED event published
   - Check read model updated

2. **Create Order 2** (CUST002, 1 item)
   - Check console: Another ORDER_CREATED event
   - Check statistics changed

3. **Get All Orders**
   - Should show 2 pending orders
   - Statistics: total=2, pending=2, cancel=0

4. **Get Order Details**
   - Verify read model data matches

5. **Cancel Order 1**
   - Check console: ORDER_CANCELLED event published
   - QueryService updates read model

6. **Get All Orders Again**
   - Should show 1 pending, 1 cancelled
   - Statistics updated: pending=1, cancelled=1

7. **Verify Cached Read Model**
   - Get Order 1: status = "cancelled"
   - Verify cache was updated by event

## Error Cases

### Invalid Request (Missing customerId)
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": []}'
```

**Response (400):**
```json
{
  "error": "Missing required fields: customerId and items"
}
```

### Order Not Found
```bash
curl http://localhost:3001/orders/invalid-uuid
```

**Response (404):**
```json
{
  "error": "Order with id invalid-uuid not found"
}
```

### Cancel Non-existent Order
```bash
curl -X DELETE http://localhost:3001/orders/invalid-uuid \
  -H "Content-Type: application/json" \
  -d '{"reason": "test"}'
```

**Response (404):**
```json
{
  "error": "Order with id invalid-uuid not found"
}
```

## Key Observations

### Event-Driven Synchronization
- Write model updated immediately by CommandService
- Read model updated by EventBus subscription
- No tight coupling between services
- Can scale independently

### Derived Fields
- `itemCount` calculated from items
- `statusLabel` Vietnamese translation
- Query-side cached computation

### Statistics Optimization
- Calculated from read model on each query
- Fast because read model is optimized
- Shows: total, pending, confirmed, cancelled, totalRevenue

## Postman Collection

In Postman, create requests:

| Method | URL | Body |
|--------|-----|------|
| POST | http://localhost:3001/orders | `{"customerId":"CUST001","items":[...]}` |
| GET | http://localhost:3001/orders | - |
| GET | http://localhost:3001/orders/:id | - |
| DELETE | http://localhost:3001/orders/:id | `{"reason":"..."}` |

Then run the scenario: Create → List → Detail → Cancel → List → Detail
