# Exercise 1: Bank Account Event Sourcing

## 📌 What is Event Sourcing?

Event Sourcing is an architectural pattern where:

1. **State is never stored directly** - Only events are stored
2. **Events are immutable facts** - What happened is recorded permanently
3. **Current state is computed** - By replaying events from the beginning
4. **Complete audit trail** - Every change is visible in the event log

### Classic Pattern

```
Traditional Database:
┌─────────────────┐
│  Account State  │ ← Balance: $1000 (current state only)
└─────────────────┘

Event Sourcing:
┌─────────────────────────────────────────┐
│          Event Stream (append-only)     │
├─────────────────────────────────────────┤
│ 1. AccountCreated (initialBalance: 500) │
│ 2. MoneyDeposited (amount: 300)         │
│ 3. MoneyWithdrawn (amount: 100)         │
│ 4. MoneyDeposited (amount: 200)         │
└─────────────────────────────────────────┘
                    ↓
         Current Balance: $900
         (computed: 500 + 300 - 100 + 200)
```

---

## 🎯 Bank Account Exercise

### Domain Events

```typescript
// Event 1: Account is created
{
  type: 'AccountCreated',
  accountHolder: 'John Doe',
  initialBalance: 500
}

// Event 2: Money deposited
{
  type: 'MoneyDeposited',
  amount: 300,
  description: 'Monthly salary'
}

// Event 3: Money withdrawn
{
  type: 'MoneyWithdrawn',
  amount: 100,
  description: 'ATM withdrawal'
}

// Event 4: More money deposited
{
  type: 'MoneyDeposited',
  amount: 200,
  description: 'Bonus'
}
```

### State Reconstruction

Starting with **empty state**:

```
Initial:      balance = $0
Event 1:  (+) balance = $500  (AccountCreated with initialBalance)
Event 2:  (+) balance = $800  (MoneyDeposited $300)
Event 3:  (-) balance = $700  (MoneyWithdrawn $100)
Event 4:  (+) balance = $900  (MoneyDeposited $200)

Final State: balance = $900 ✓
```

**Key insight**: The current balance IS NOT STORED. It's computed from the event stream.

---

## 🏗️ Architecture

### Core Components

```
┌──────────────────────────────────────────────────────────┐
│                    HTTP Request                          │
└──────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────┐
│                   Express Routes                         │
│  (POST /accounts/:id/deposit, /withdraw, GET /:id)      │
└──────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────┐
│              BankAccountService                          │
│  - Handles commands (deposit, withdraw)                  │
│  - Calls aggregate to process                            │
│  - Persists events to EventStore                         │
└──────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────┐
│             BankAccount (Aggregate Root)                 │
│  - apply(event): Apply single event to state             │
│  - loadFromHistory(events): Replay events                │
│  - getBalance(): Get current balance                     │
└──────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────┐
│                    EventStore                            │
│  - Store events immutably                                │
│  - Retrieve events for aggregate                         │
│  - Query event history                                   │
└──────────────────────────────────────────────────────────┘
```

### Key Methods

#### `apply(event)` - Apply Single Event

```typescript
private apply(event: BankAccountEvent): void {
  switch (event.type) {
    case 'AccountCreated':
      this.state.balance = event.initialBalance;
      this.state.isActive = true;
      break;
    
    case 'MoneyDeposited':
      this.state.balance += event.amount;
      break;
    
    case 'MoneyWithdrawn':
      this.state.balance -= event.amount;
      break;
  }
}
```

#### `loadFromHistory(events)` - Replay Events

```typescript
loadFromHistory(events: BankAccountEvent[]): void {
  this.state = this.getInitialState();  // Start empty
  
  // Apply each event in order
  events.forEach((event) => {
    this.apply(event);  // State evolves through each event
  });
}
```

#### `getBalance()` - Get Computed Balance

```typescript
getBalance(): number {
  return this.state.balance;  // Computed value, not fetched from DB
}
```

---

## 📊 Data Flow Examples

### Deposit $300 to account 'ACC001'

```
REQUEST:
POST /accounts/ACC001/deposit
{
  "amount": 300,
  "description": "Monthly salary"
}

PROCESSING:
1. Load account: Replay all existing events
2. Check: Account exists and is active ✓
3. Create event: 
   {
     type: 'MoneyDeposited',
     amount: 300,
     description: 'Monthly salary',
     timestamp: 2024-01-15T10:30:00Z
   }
4. Apply to state: state.balance += 300
5. Persist: EventStore.append(event)
6. Return: New balance

RESPONSE:
{
  "accountId": "ACC001",
  "transaction": "DEPOSIT",
  "amount": 300,
  "newBalance": 1000,
  "message": "✓ Deposited $300. New balance: $1000"
}
```

### Get Account Balance (retrieves from events)

```
REQUEST:
GET /accounts/ACC001

PROCESSING:
1. Load events from EventStore for ACC001
2. Replay events:
   - AccountCreated (balance = 500)
   - MoneyDeposited (balance = 800)
   - MoneyWithdrawn (balance = 700)
   - MoneyDeposited (balance = 900)
3. Return reconstructed state

RESPONSE:
{
  "accountId": "ACC001",
  "accountHolder": "John Doe",
  "balance": 900,
  "isActive": true,
  "transactionCount": 3,
  "createdAt": "2024-01-15T09:00:00Z"
}

⚠️ IMPORTANT: balance: 900 is COMPUTED, not stored in database!
It's the result of: 500 + 300 - 100 + 200 = 900
```

### View Event History (audit trail)

```
REQUEST:
GET /accounts/ACC001/history

RESPONSE:
{
  "accountId": "ACC001",
  "eventCount": 4,
  "events": [
    {
      "type": "AccountCreated",
      "timestamp": "2024-01-15T09:00:00Z",
      "accountHolder": "John Doe",
      "initialBalance": 500
    },
    {
      "type": "MoneyDeposited",
      "timestamp": "2024-01-15T09:30:00Z",
      "amount": 300,
      "description": "Monthly salary"
    },
    {
      "type": "MoneyWithdrawn",
      "timestamp": "2024-01-15T10:00:00Z",
      "amount": 100,
      "description": "ATM withdrawal"
    },
    {
      "type": "MoneyDeposited",
      "timestamp": "2024-01-15T10:30:00Z",
      "amount": 200,
      "description": "Bonus"
    }
  ]
}
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm
- TypeScript globally or local installation

### Installation

```bash
# Navigate to project
cd Exercise1_EventSourcing

# Install dependencies
npm install

# Build TypeScript
npm run build
```

### Running

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build && npm start
```

Service starts on **port 3005**.

---

## 🧪 API Examples

### 1. Create Account

```bash
curl -X POST http://localhost:3005/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACC001",
    "accountHolder": "John Doe",
    "initialBalance": 500
  }'
```

### 2. Check Balance

```bash
curl http://localhost:3005/accounts/ACC001/balance
```

### 3. Deposit Money

```bash
curl -X POST http://localhost:3005/accounts/ACC001/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 300,
    "description": "Monthly salary"
  }'
```

### 4. Withdraw Money

```bash
curl -X POST http://localhost:3005/accounts/ACC001/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "description": "ATM withdrawal"
  }'
```

### 5. View Event History

```bash
curl http://localhost:3005/accounts/ACC001/history
```

### 6. View All Accounts

```bash
curl http://localhost:3005/accounts
```

---

## ✨ Key Concepts Demonstrated

### 1. Event Immutability
- Events are NEVER modified or deleted
- Only new events are appended
- Complete audit trail preserved

### 2. State Derived from Events
```typescript
currentState = initialState + apply(event1) + apply(event2) + ...
```

### 3. Time-Travel Capability
```typescript
// Get balance at any point in time
const stateAt(timestamp) {
  const eventsUntilTime = events.filter(e => e.timestamp <= timestamp);
  return replay(eventsUntilTime);
}
```

### 4. No Direct State Storage
- Database contains ONLY events
- Current state is computed on-demand
- Eliminates state corruption

### 5. Complete Audit Trail
- Every transaction visible
- Why changes were made (descriptions)
- When they occurred (timestamps)

---

## 📈 Advantages over Traditional CRUD

| Aspect | CRUD | Event Sourcing |
|--------|------|-----------------|
| **State Storage** | Current state | Event stream |
| **Audit Trail** | Need extra logging | Built-in complete |
| **Time-travel** | Not possible | Easy - replay events |
| **State Corruption** | Possible | Impossible - immutable events |
| **Concurrency** | Lock-based | Append-only log |
| **Recovery** | Restore from backup | Replay from events |
| **Scalability** | Shared DB | Independent read replicas |

---

## 🔄 Comparison with Previous Exercises

| Exercise | Pattern | State Storage | Scaling |
|----------|---------|---------------|---------|
| **Bài 1** | Manual CQRS | In-memory objects | Single process |
| **Bài 2** | Event-driven CQRS | In-memory + Events | Single process, loose coupling |
| **Bài 3** | Database CQRS | Database + Events | Still single process |
| **Bài 4** | Microservices CQRS | 2 services, EventBus | Independent services |
| **Exercise 1** | Event Sourcing | Events only (no state storage) | **Pure event log** |

---

## 🎓 Learning Outcomes

After completing this exercise, you should understand:

1. ✅ **Event Sourcing Pattern** - State as function of events
2. ✅ **apply()** - How to apply single event to state
3. ✅ **Replay** - Reconstruct state from event history
4. ✅ **Immutability** - Why events are immutable
5. ✅ **Audit Trail** - Complete transaction history
6. ✅ **Time-travel** - Compute state at any point
7. ✅ **Eventual Consistency** - Distributed system implications

---

## 📚 Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design
- See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for examples
- Modify the code to add new event types
- Build read models separately (CQRS + Event Sourcing)

---

## 📝 Files Structure

```
Exercise1_EventSourcing/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── app.ts                   # Express setup
│   ├── models.ts                # Domain events and state
│   ├── domain/
│   │   └── BankAccount.ts       # Aggregate root (apply, replay)
│   ├── persistence/
│   │   └── EventStore.ts        # Event storage layer
│   ├── services/
│   │   └── BankAccountService.ts # Business logic
│   └── routes/
│       └── accountRoutes.ts     # HTTP endpoints
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── README.md                    # This file
├── ARCHITECTURE.md              # Design details
└── TESTING_GUIDE.md             # API examples
```

---

## 🤔 Questions?

Key questions this exercise answers:

- **Q: Where is balance stored?**
  A: Nowhere! It's computed: sum(deposits) - sum(withdrawals)

- **Q: How do we recover after crash?**
  A: Replay events from EventStore

- **Q: Can we see transaction history?**
  A: Yes! Full event stream is the audit trail

- **Q: What if an event was wrong?**
  A: Add a compensating event (e.g., "MoneyReturnedEvent")

---

**Last Updated:** January 2024  
**Pattern:** Event Sourcing  
**Version:** 1.0.0
