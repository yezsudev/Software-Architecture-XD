# Exercise 3: Projection (Read Model) — Event Sourcing + CQRS

## 🎯 Concept

A **Projection** is a read model built by consuming events as they happen.

Instead of replaying all events on every query, we maintain a **pre-built view** that updates incrementally whenever a new event is saved.

```
WRITE SIDE:                              READ SIDE:
                                         (Projection)
Command (deposit)
    ↓                                  ┌──────────────────────┐
BankAccount.apply(event)               │  AccountSummary      │
    ↓                                  │  ─────────────────── │
EventStore.append(event) ──────────→  │  balance: computed   │
                                       │  totalDeposited: sum │
                                       │  depositCount: n     │
                                       └──────────────────────┘
```

---

## 🔑 Key Difference: Write Model vs Read Model

| | Write Model | Read Model (Projection) |
|--|-------------|--------------------------|
| **Data** | Events (source of truth) | AccountSummary (computed view) |
| **Query** | Requires replay | Direct lookup — fast! |
| **Update** | Append event | Apply event to projection |
| **Use case** | Commands | Queries |

---

## 📦 Projection — `AccountSummary`

```typescript
interface AccountSummary {
  accountId: string;
  accountHolder: string;
  balance: number;        // Current balance
  totalDeposited: number; // Sum of all deposits ever
  totalWithdrawn: number; // Sum of all withdrawals ever
  depositCount: number;   // How many deposits
  withdrawCount: number;  // How many withdrawals
  lastEventAt: Date;
  isActive: boolean;
}
```

These fields would be **expensive to compute** from events every time. The projection maintains them incrementally.

---

## 💻 Key Code

### Projection — `project(event)`

```typescript
class AccountSummaryProjection {
  private store = new Map<string, AccountSummary>();

  project(event: BankAccountEvent): void {
    switch (event.type) {
      case 'AccountCreated':
        this.store.set(id, { balance: event.initialBalance, totalDeposited: 0, ... });
        break;
      case 'MoneyDeposited':
        summary.balance += event.amount;
        summary.totalDeposited += event.amount;
        summary.depositCount++;
        break;
      case 'MoneyWithdrawn':
        summary.balance -= event.amount;
        summary.totalWithdrawn += event.amount;
        summary.withdrawCount++;
        break;
    }
  }

  getSummary(accountId: string): AccountSummary {
    return this.store.get(accountId);  // No replay! Instant!
  }
}
```

### EventStore Notifies Projection

```typescript
class EventStore {
  private listeners: Array<(event) => void> = [];

  subscribe(listener: (event) => void): void {
    this.listeners.push(listener);
  }

  append(event: BankAccountEvent): void {
    this.eventLog.get(event.aggregateId)!.push(event);
    // Notify all projections
    this.listeners.forEach(listener => listener(event));
  }
}

// Wiring: EventStore → Projection
eventStore.subscribe(event => projection.project(event));
```

---

## 📡 API

| Path | Side | Description |
|------|------|-------------|
| POST /accounts | Write | Create account |
| POST /accounts/:id/deposit | Write | Deposit money |
| POST /accounts/:id/withdraw | Write | Withdraw money |
| **GET /accounts/:id/summary** | **Read** | **Get projection (fast!)** |
| **GET /accounts/summaries/all** | **Read** | **List all projections** |
| POST /accounts/rebuild | Write | Rebuild projections |
| GET /accounts/:id | Write | State from events (replay) |
| GET /accounts/:id/history | Write | All events |

---

## 🧪 Test Scenario

```bash
npm run dev  # Port 3007

# 1. Create account
curl -X POST http://localhost:3007/accounts \
  -H "Content-Type: application/json" \
  -d '{"accountId":"ACC001","accountHolder":"Alice","initialBalance":1000}'

# 2. Transactions
curl -X POST http://localhost:3007/accounts/ACC001/deposit \
  -d '{"amount":600}' -H "Content-Type: application/json"

curl -X POST http://localhost:3007/accounts/ACC001/withdraw \
  -d '{"amount":200}' -H "Content-Type: application/json"

curl -X POST http://localhost:3007/accounts/ACC001/deposit \
  -d '{"amount":300}' -H "Content-Type: application/json"

# 3. Get READ MODEL (projection) — instant, no replay!
curl http://localhost:3007/accounts/ACC001/summary
```

**Expected projection result:**
```json
{
  "accountId": "ACC001",
  "accountHolder": "Alice",
  "balance": 1700,
  "totalDeposited": 900,
  "totalWithdrawn": 200,
  "depositCount": 2,
  "withdrawCount": 1,
  "message": "✓ From READ MODEL (projection) — no event replay needed"
}
```

### Verify: `totalDeposited` = 600 + 300 = 900, `balance` = 1000 + 900 - 200 = 1700

---

## Port: 3007
