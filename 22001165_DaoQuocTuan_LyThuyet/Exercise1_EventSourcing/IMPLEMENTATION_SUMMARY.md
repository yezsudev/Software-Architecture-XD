# Exercise 1: Event Sourcing - Complete Implementation ✅

## 📦 Project Structure

```
Exercise1_EventSourcing/
├── src/
│   ├── index.ts                          # Server entry point (port 3005)
│   ├── app.ts                            # Express app setup
│   ├── models.ts                         # Domain events & state (89 lines)
│   │
│   ├── domain/
│   │   └── BankAccount.ts                # Aggregate root with apply() & replay()
│   │                                     # apply(event): Apply single event
│   │                                     # loadFromHistory(events): Replay to compute state
│   │
│   ├── persistence/
│   │   └── EventStore.ts                 # Immutable event log
│   │                                     # append(), getEvents(), getAllEvents()
│   │
│   ├── services/
│   │   └── BankAccountService.ts         # Command handler
│   │                                     # createAccount(), depositMoney(), withdrawMoney()
│   │
│   └── routes/
│       └── accountRoutes.ts              # REST API endpoints
│                                         # POST /accounts, GET /balance, POST /deposit, etc.
│
├── package.json                          # Dependencies (express, typescript, uuid)
├── tsconfig.json                         # TypeScript configuration
├── README.md                             # Full documentation (350+ lines)
├── ARCHITECTURE.md                       # Design & patterns (400+ lines)
├── TESTING_GUIDE.md                      # Examples & test scenarios (500+ lines)
└── QUICK_START.md                        # Quick reference
```

---

## 🎯 What You'll Learn

### Event Sourcing Pattern

**Traditional Database (CRUD):**
```
UPDATE accounts SET balance = 1200 WHERE id = 'ACC001';
```

**Event Sourcing:**
```
AppendEvent: { type: 'MoneyWithdrawn', amount: 300, timestamp: ... }
GetBalance: Replay all events → balance = sum(deposits) - sum(withdrawals)
```

### Core Methods Implemented

#### 1️⃣ `apply(event)` - Apply Single Event
```typescript
class BankAccount {
  private apply(event: BankAccountEvent): void {
    switch (event.type) {
      case 'MoneyDeposited':
        this.state.balance += event.amount;  // Update state
        break;
      case 'MoneyWithdrawn':
        this.state.balance -= event.amount;  // Update state
        break;
      // ... more cases
    }
  }
}
```

**Purpose**: Pure function that transforms state based on event.

#### 2️⃣ `loadFromHistory(events)` - Replay Events
```typescript
loadFromHistory(events: BankAccountEvent[]): void {
  this.state = this.getInitialState();  // Start empty
  
  // Replay: apply each event in order
  events.forEach((event) => {
    this.apply(event);  // State evolves
  });
}
```

**Purpose**: Reconstruct current state from complete event history.

#### 3️⃣ `getBalance()` - Get Computed Balance
```typescript
getBalance(): number {
  return this.state.balance;  // COMPUTED, not fetched from DB
}
```

**Key Insight**: Balance is derived value, never stored directly.

---

## 📊 How It Works

### Request Flow: Deposit $300

```
1. HTTP Request
   POST /accounts/ACC001/deposit
   { "amount": 300 }

2. Route Handler
   → accountRoutes.ts

3. Service Layer
   → BankAccountService.depositMoney()

4. Aggregate Loading (REPLAY)
   - Create: new BankAccount('ACC001')
   - Fetch: eventStore.getEvents('ACC001')
   - load: account.loadFromHistory(events)
     * Reset state to empty
     * Apply each event in order
     * Final state: computed balance

5. Validation
   - Check: account.isActive() ✓
   - Check: amount > 0 ✓

6. Event Creation
   - Create: MoneyDepositedEvent { amount: 300, timestamp: now }

7. Apply to Aggregate
   - account.recordEvent(event)
   - apply() → state.balance += 300

8. Persist to EventStore
   - eventStore.append(event)
   - Event is now permanent

9. Return Response
   - { newBalance: 1200, message: "✓ Deposited $300" }
```

### State Reconstruction Example

```
Events in EventStore:
  1. AccountCreated(initialBalance: 500)
  2. MoneyDeposited(amount: 300)
  3. MoneyWithdrawn(amount: 100)
  4. MoneyDeposited(amount: 200)

Replay Process:
  Initial state: { balance: 0 }
  apply(AccountCreated) → balance = 500
  apply(MoneyDeposited) → balance = 800
  apply(MoneyWithdrawn) → balance = 700
  apply(MoneyDeposited) → balance = 900

Final State: { balance: 900 }
```

---

## 🚀 Key Features

### 1. Immutable Event Log
- Events are **never modified or deleted**
- Only **append-only** operations
- Complete **audit trail** preserved

### 2. State Computation
- State is **derived from events**
- No direct state storage
- Recomputed on **every load** (guarantees correctness)

### 3. Domain Events Defined
```typescript
// Events that can happen
- AccountCreatedEvent
- MoneyDepositedEvent
- MoneyWithdrawnEvent
- AccountClosedEvent
```

### 4. REST API
```
POST   /accounts                    Create account
GET    /accounts/:id                Get account state (computed)
GET    /accounts/:id/balance        Get balance (computed)
GET    /accounts/:id/history        View all events
POST   /accounts/:id/deposit        Deposit money
POST   /accounts/:id/withdraw       Withdraw money
GET    /accounts                    List all accounts
```

### 5. Complete Documentation
- **README.md**: Pattern explanation, examples
- **ARCHITECTURE.md**: Design, components, flow
- **TESTING_GUIDE.md**: Test scenarios, console output
- **QUICK_START.md**: 5-minute setup

---

## 📈 Comparison: Exercise 1 vs Bài 1-4

| Aspect | Bài 1 | Bài 2 | Bài 3 | Bài 4 | Exercise 1 |
|--------|-------|-------|-------|-------|-----------|
| **Pattern** | Manual CQRS | Event-Driven | DB CQRS | Microservices | **Event Sourcing** |
| **State Storage** | In-memory | In-memory | Database | 2 DB (cmd/query) | **Events Only** |
| **How to Get State** | Direct read | Direct read | Query DB | Query cache | **Replay events** |
| **Audit Trail** | Manual log | Events | Event table | Event table | **All events** |
| **Time-Travel** | ❌ Not possible | ❌ Not possible | ❌ Not possible | ❌ Not possible | ✅ **Yes** |
| **Recovery** | Reboot | Reboot | Restore DB | Run replay | ✅ **Replay events** |
| **Scalability** | Single process | Single process | Single process | Multiple services | **Read replicas** |
| **apply() method** | ❌ | ❌ | ❌ | ❌ | ✅ **Core feature** |
| **replay() method** | ❌ | ❌ | ❌ | ❌ | ✅ **Core feature** |

---

## ✨ Teaching Value

This exercise demonstrates:

1. ✅ **What is Event Sourcing** - Complete pattern explanation
2. ✅ **Why Events Matter** - Audit trail, recovery, time-travel
3. ✅ **apply(event)** - Core method that evolves state
4. ✅ **Replay** - Reconstruct state from history
5. ✅ **Immutability** - Why events are permanent
6. ✅ **Derived State** - Balance computed, not stored
7. ✅ **Complete Audit Trail** - Every transaction visible
8. ✅ **Advanced Architecture** - Beyond basic CRUD

---

## 🧪 Testing Scenario

### Complete Test Sequence

```bash
# 1. Create account with $1000
POST /accounts
→ Event: AccountCreated(initialBalance: 1000)
→ Balance: $1000

# 2. Deposit $500
POST /accounts/ACC001/deposit
→ Event: MoneyDeposited(amount: 500)
→ Balance: $1500 (computed: 1000 + 500)

# 3. Withdraw $300
POST /accounts/ACC001/withdraw
→ Event: MoneyWithdrawn(amount: 300)
→ Balance: $1200 (computed: 1000 + 500 - 300)

# 4. View history
GET /accounts/ACC001/history
→ Shows [AccountCreated, MoneyDeposited, MoneyWithdrawn]
→ Complete audit trail

# 5. Check balance
GET /accounts/ACC001/balance
→ Balance: $1200 (recomputed from events)

# Verification:
# ✓ Balance is always computed correctly
# ✓ All events visible in history
# ✓ No direct storage of balance
# ✓ Can replay at any time
```

---

## 🔑 Key Code Examples

### Creating Account
```typescript
// Command
service.createAccount('ACC001', 'John Doe', 1000)

// Result
- Event created: AccountCreatedEvent
- Event stored: eventStore.append(event)
- State computed: balance = 1000
```

### Depositing Money
```typescript
// Load aggregate (replay events)
const account = service.getAccount('ACC001');
// account.state.balance = 1200 (from events)

// Create event
const event = new MoneyDepositedEvent(amount: 500);

// Apply to state
account.recordEvent(event);
// account.state.balance = 1700

// Persist
eventStore.append(event);
```

### Getting Balance
```typescript
// Method 1: Direct (recomputes state)
const balance = service.getBalance('ACC001');
// Loads all events, replays, returns balance

// Method 2: Already loaded
const account = service.getAccount('ACC001');
const balance = account.getBalance();
```

---

## 📚 File Sizes & Content

| File | Lines | Purpose |
|------|-------|---------|
| models.ts | 89 | Domain events, state, commands |
| BankAccount.ts | 250+ | Aggregate with apply() & replay() |
| EventStore.ts | 120+ | Event persistence |
| BankAccountService.ts | 180+ | Command handler |
| accountRoutes.ts | 220+ | REST endpoints |
| app.ts | 50 | Express setup |
| index.ts | 30 | Server entry |
| README.md | 350+ | Complete explanation |
| ARCHITECTURE.md | 400+ | Design details |
| TESTING_GUIDE.md | 500+ | Examples & tests |

**Total: 2,000+ lines of production code + documentation**

---

## 🎓 Learning Outcomes

You will understand:

- **What is Event Sourcing?** Event = source of truth
- **apply(event)** Applies one event to state
- **replay(events)** Reconstructs state from all events
- **Immutability** Events never change
- **No Direct Storage** Balance = computed value
- **Complete Audit** Every transaction logged
- **Time-Travel** Compute state at any point
- **Recovery** Rebuild from events
- **Advanced Architecture** Beyond traditional CRUD

---

## 🚀 Getting Started

### 1. Install
```bash
cd Exercise1_EventSourcing
npm install
```

### 2. Run
```bash
npm run dev
```

### 3. Test
```bash
curl -X POST http://localhost:3005/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "test",
    "accountHolder": "Test User",
    "initialBalance": 1000
  }'
```

### 4. Read Docs
- **QUICK_START.md** - 5 minutes
- **README.md** - Full explanation
- **TESTING_GUIDE.md** - Examples

---

## 🎯 Next Steps

1. ✅ Read [README.md](./README.md) - Understand pattern
2. ✅ Study [BankAccount.ts](./src/domain/BankAccount.ts) - Focus on apply() & loadFromHistory()
3. ✅ Learn [ARCHITECTURE.md](./ARCHITECTURE.md) - Full design
4. ✅ Follow [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Run examples
5. ✅ Run [QUICK_START.md](./QUICK_START.md) - Get it working

---

## 💡 Key Insight

**Traditional Database:** "What is the current balance?"
```sql
SELECT balance FROM accounts WHERE id = 'ACC001';
```

**Event Sourcing:** "What transactions happened?"
```
Events = [Created($1000), Deposit($500), Withdraw($300)]
Balance = sum(deposits) - sum(withdrawals) = $1200
```

Store events, compute state.

---

**Status:** ✅ Complete Implementation
**Port:** 3005
**Pattern:** Event Sourcing
**Version:** 1.0.0

**Total Deliverables So Far:**
- ✅ Bài 1: TodoApp CQRS
- ✅ Bài 2: Order System (Event-Driven)
- ✅ Bài 3: Train Ticket (DB Persistence)
- ✅ Bài 4: Microservices CQRS
- ✅ Exercise 1: Event Sourcing (THIS)

**Total Code:** 5,000+ lines across all exercises
