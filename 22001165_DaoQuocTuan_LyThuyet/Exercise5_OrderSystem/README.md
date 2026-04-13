# Exercise 5: Order System — Event Sourcing + CQRS

## 🎯 Combines Everything

Exercise 5 applies all Event Sourcing and CQRS concepts to an Order domain:

```
Events: OrderCreated, ItemAdded, ItemRemoved, OrderConfirmed
Write side: command → Order aggregate → event → EventStore
Read side:  event → OrderSummaryProjection (totalPrice, status, itemCount)
```

---

## 📊 Architecture

```
WRITE SIDE                              READ SIDE
──────────────────────────────────────  ──────────────────────────────────
                                        
Command (AddItem)                        
    ↓                                   
Order.apply(ItemAdded)                   
    ↓                                   
EventStore.append(event) ──────────────→  OrderSummaryProjection.project(event)
                                         ↓
Queries → ────────────────────────────→  OrderSummary (totalPrice, status)
                                         (instant — no replay!)
```

---

## 📦 Domain Events

```typescript
OrderCreatedEvent     → { customerId }
ItemAddedEvent        → { itemId, name, price, quantity }
ItemRemovedEvent      → { itemId }
OrderConfirmedEvent   → {}
OrderCancelledEvent   → { reason }
```

---

## 📋 Read Model — `OrderSummary`

```typescript
interface OrderSummary {
  orderId: string;
  customerId: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  totalPrice: number;     // sum(price * quantity) — computed from items
  itemCount: number;      // distinct items
  totalQuantity: number;  // total units ordered
  items: OrderItem[];
}
```

---

## 💻 Key Code

### Order Aggregate — apply()

```typescript
private apply(event: OrderEvent): void {
  switch (event.type) {
    case 'OrderCreated':
      this.state.customerId = event.customerId;
      break;
    case 'ItemAdded':
      this.state.items.push({ itemId, name, price, quantity });
      break;
    case 'ItemRemoved':
      this.state.items = this.state.items.filter(i => i.itemId !== event.itemId);
      break;
    case 'OrderConfirmed':
      this.state.status = 'confirmed';
      break;
  }
}
```

### Projection — project()

```typescript
project(event: OrderEvent): void {
  switch (event.type) {
    case 'ItemAdded':
      summary.items.push(item);
      summary.totalPrice += item.price * item.quantity;  // Incrementally updated
      break;
    case 'ItemRemoved':
      summary.items = summary.items.filter(i => i.itemId !== event.itemId);
      this.recompute(summary);  // Recompute totals
      break;
  }
}

// recompute: totalPrice, totalQuantity from items list
```

---

## 🧪 Test Scenario

```bash
npm run dev  # Port 3009

# 1. Create order
curl -X POST http://localhost:3009/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD001","customerId":"CUST001"}'

# 2. Add items
curl -X POST http://localhost:3009/orders/ORD001/items \
  -d '{"itemId":"ITEM1","name":"Laptop","price":999.99,"quantity":1}' \
  -H "Content-Type: application/json"

curl -X POST http://localhost:3009/orders/ORD001/items \
  -d '{"itemId":"ITEM2","name":"Mouse","price":29.99,"quantity":2}' \
  -H "Content-Type: application/json"

# 3. Get read model (projection) — fast!
curl http://localhost:3009/orders/ORD001/summary
```

**Expected projection:**
```json
{
  "orderId": "ORD001",
  "status": "draft",
  "totalPrice": 1059.97,
  "itemCount": 2,
  "totalQuantity": 3,
  "items": [
    { "itemId": "ITEM1", "name": "Laptop", "price": 999.99, "quantity": 1 },
    { "itemId": "ITEM2", "name": "Mouse", "price": 29.99, "quantity": 2 }
  ]
}
```

```bash
# 4. Remove an item
curl -X DELETE http://localhost:3009/orders/ORD001/items/ITEM2
# → totalPrice becomes 999.99

# 5. Confirm order
curl -X POST http://localhost:3009/orders/ORD001/confirm
# → status: "confirmed"

# 6. Cannot add items after confirmation
curl -X POST http://localhost:3009/orders/ORD001/items \
  -d '{"itemId":"ITEM3","name":"Keyboard","price":59.99,"quantity":1}' \
  -H "Content-Type: application/json"
# → error: "Cannot add items to confirmed order"

# 7. View event history  
curl http://localhost:3009/orders/ORD001/history
# → OrderCreated, ItemAdded, ItemAdded, ItemRemoved, OrderConfirmed
```

---

## 📡 API Reference

### Write Side (Commands)
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | /orders | { orderId, customerId } | Create order |
| POST | /orders/:id/items | { itemId, name, price, qty } | Add item |
| DELETE | /orders/:id/items/:itemId | — | Remove item |
| POST | /orders/:id/confirm | — | Confirm order |
| POST | /orders/:id/cancel | { reason } | Cancel order |

### Read Side (Projections)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /orders/:id/summary | Order summary with totalPrice |
| GET | /orders | All order summaries |
| GET | /orders/:id/history | Complete event stream |
| GET | /orders/:id | Write model state (with replay) |

---

## 🔄 Business Rules (Enforced by Aggregate)

1. ❌ Cannot add items to confirmed/cancelled orders
2. ❌ Cannot confirm an empty order
3. ❌ Cannot remove an item that doesn't exist in order
4. ❌ Price and quantity must be positive
5. ✅ Can add multiple quantities of same item (quantity accumulates)

---

## Port: 3009
