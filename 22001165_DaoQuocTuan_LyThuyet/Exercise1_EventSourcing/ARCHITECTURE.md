# Architecture: Event Sourcing Pattern

## 🏗️ System Design

### Overview

```
HTTP Client
    ↓
[Express Routes]
    ↓
[BankAccountService] ← Command Handler
    ↓
[BankAccount Aggregate]  ← apply(event), loadFromHistory()
    ↓
[EventStore] ← Immutable Event Log
    ↓
Events: [{type, aggregateId, timestamp, ...}]
```

---

## 📦 Core Components

### 1. **Domain Models** (`src/models.ts`)

Defines the language of the system:

```typescript
// Domain Events (Facts that happened)
interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId: string;  // Which account this is about
}

// Event Types
interface AccountCreatedEvent extends DomainEvent {
  type: 'AccountCreated';
  accountHolder: string;
  initialBalance: number;
}

interface MoneyDepositedEvent extends DomainEvent {
  type: 'MoneyDeposited';
  amount: number;
  description?: string;
}

interface MoneyWithdrawnEvent extends DomainEvent {
  type: 'MoneyWithdrawn';
  amount: number;
  description?: string;
}

// Current State (computed, not stored)
interface BankAccountState {
  accountId: string;
  accountHolder: string;
  balance: number;  // COMPUTED: sum(deposits) - sum(withdrawals)
  isActive: boolean;
  createdAt: Date;
  transactionCount: number;
}
```

**Key Insight**: State interface describes what we compute, not what we store.

---

### 2. **Aggregate Root** (`src/domain/BankAccount.ts`)

The heart of event sourcing - manages state computation.

#### Constructor
```typescript
constructor(accountId: string) {
  this.accountId = accountId;
  this.state = this.getInitialState();  // Start with empty state
}
```

#### `apply(event)` - Apply Single Event

```typescript
private apply(event: BankAccountEvent): void {
  switch (event.type) {
    case 'AccountCreated':
      this.state.balance = event.initialBalance;
      this.state.isActive = true;
      break;
    
    case 'MoneyDeposited':
      this.state.balance += event.amount;  // Increase balance
      this.state.transactionCount++;
      break;
    
    case 'MoneyWithdrawn':
      this.state.balance -= event.amount;  // Decrease balance
      this.state.transactionCount++;
      break;
    
    case 'AccountClosed':
      this.state.isActive = false;
      break;
  }
}
```

**How it works:**
- Takes ONE event
- Updates state based on event type
- Pure function: same event → same state change

#### `loadFromHistory(events)` - Compute State

```typescript
loadFromHistory(events: BankAccountEvent[]): void {
  this.state = this.getInitialState();  // Reset to empty
  
  // Replay: apply each event in order
  events.forEach((event) => {
    this.apply(event);
  });
  
  // After replay: state = initial + all event effects
}
```

**The magic of event sourcing:**
```
Initial State:
  balance: 0

Apply Event 1 (AccountCreated, $500):
  balance: 500

Apply Event 2 (Deposit, $300):
  balance: 800

Apply Event 3 (Withdraw, $100):
  balance: 700

Apply Event 4 (Deposit, $200):
  balance: 900  ← Final computed state
```

#### State Queries

```typescript
getBalance(): number {
  return this.state.balance;  // Derived value
}

getState(): BankAccountState {
  return { ...this.state };  // Full state snapshot
}
```

**Important**: These methods return COMPUTED state, not stored state.

#### Recording Changes

```typescript
recordEvent(event: BankAccountEvent): void {
  this.apply(event);           // Update state
  this.changes.push(event);    // Track uncommitted
}

getUncommittedChanges(): BankAccountEvent[] {
  return this.changes;  // For persistence
}

markChangesAsCommitted(): void {
  this.changes = [];  // Clear after saving
  this.version++;
}
```

---

### 3. **EventStore** (`src/persistence/EventStore.ts`)

The single source of truth - stores all events.

#### Core Operations

```typescript
// Store event (append-only)
append(event: BankAccountEvent): void {
  if (!this.eventLog.has(aggregateId)) {
    this.eventLog.set(aggregateId, []);
  }
  this.eventLog.get(aggregateId)!.push(event);
}

// Retrieve all events for an account
getEvents(aggregateId: string): BankAccountEvent[] {
  return this.eventLog.get(aggregateId) || [];
}

// Check if aggregate exists
exists(aggregateId: string): boolean {
  return this.eventLog.has(aggregateId);
}
```

**Design Pattern: Append-Only Log**
- Events are added to the end
- Events are NEVER modified
- Events are NEVER deleted
- Complete history preserved

#### Storage Structure

```
EventStore:
  Map<accountId, BankAccountEvent[]>

Example:
  'ACC001' → [
    { type: 'AccountCreated', ... },
    { type: 'MoneyDeposited', amount: 300, ... },
    { type: 'MoneyWithdrawn', amount: 100, ... }
  ]
  
  'ACC002' → [
    { type: 'AccountCreated', ... },
    { type: 'MoneyDeposited', amount: 500, ... }
  ]
```

---

### 4. **Service** (`src/services/BankAccountService.ts`)

Orchestrates aggregate + event store.

#### Command Handler Pattern

```typescript
depositMoney(accountId: string, amount: number): BankAccount {
  // 1. Load aggregate (replay events)
  const account = this.getAccount(accountId);
  
  // 2. Validate command
  if (amount <= 0) throw new Error('...');
  if (!account.isActive()) throw new Error('...');
  
  // 3. Create event
  const event: MoneyDepositedEvent = {
    type: 'MoneyDeposited',
    amount,
    timestamp: new Date(),
    aggregateId: accountId
  };
  
  // 4. Apply to aggregate
  account.recordEvent(event);
  
  // 5. Persist to EventStore
  this.eventStore.append(event);
  account.markChangesAsCommitted();
  
  // 6. Return updated aggregate
  return account;
}
```

**Command → Events → State**
```
Command: "Deposit $300"
    ↓ (validate)
Event: MoneyDepositedEvent { amount: 300 }
    ↓ (store)
EventStore: [saved]
    ↓ (apply)
State: balance += 300
```

#### State Reconstruction

```typescript
getAccount(accountId: string): BankAccount {
  // Load aggregate
  const account = new BankAccount(accountId);
  
  // Fetch events from store
  const events = this.eventStore.getEvents(accountId);
  
  // Reconstruct state by replaying
  account.loadFromHistory(events);
  
  return account;  // Full state computed
}
```

**Every time we load an account:**
1. Start with empty state
2. Fetch all events
3. Apply each event in order
4. State is now current

---

### 5. **Routes** (`src/routes/accountRoutes.ts`)

REST API endpoints.

```
POST   /accounts                 → Create account
GET    /accounts/:id              → Get state (computed)
GET    /accounts/:id/balance      → Get balance (computed)
GET    /accounts/:id/history      → Get all events
POST   /accounts/:id/deposit      → Deposit command
POST   /accounts/:id/withdraw     → Withdraw command
```

---

## 🔄 Request Flow

### Example: Deposit Money

```
1. HTTP Request
   POST /accounts/ACC001/deposit
   { "amount": 300 }

2. Route Handler
   - Extract accountId: "ACC001"
   - Call service.depositMoney(accountId, amount)

3. Service Layer
   - Load account: loadFromEventStore
     * Create BankAccount aggregate
     * Fetch all events for ACC001
     * Replay events to compute state
   
   - Validate: Check(account.isActive, amount > 0)
   
   - Create event:
     { type: 'MoneyDeposited', amount: 300, ... }
   
   - Record to aggregate:
     - Call account.recordEvent(event)
     - apply() is called → state.balance += 300
     - event added to changes[]
   
   - Persist to EventStore:
     - eventStore.append(event)
     - Event is now permanent
   
   - Mark committed:
     - account.markChangesAsCommitted()
     - Clear changes[], increment version

4. Return Response
   {
     "newBalance": 1000,
     "message": "✓ Deposited $300"
   }
```

### State After Each Event

```
Account ACC001 created with $500:
  EventStore: [AccountCreated]
  State: { balance: 500, transactionCount: 0 }

Deposit $300:
  EventStore: [AccountCreated, MoneyDeposited($300)]
  State: { balance: 800, transactionCount: 1 }

Withdraw $100:
  EventStore: [AccountCreated, MoneyDeposited($300), MoneyWithdrawn($100)]
  State: { balance: 700, transactionCount: 2 }
```

---

## 🎯 Key Design Patterns

### 1. **Event Sourcing Pattern**

State is derived from events:
```typescript
const state = events.reduce(
  (state, event) => applyEvent(state, event),
  initialState
);
```

### 2. **Aggregate Pattern**

Encapsulates domain logic:
```typescript
class BankAccount {
  // Owns state and events
  private state: BankAccountState;
  private changes: BankAccountEvent[];
  
  // Controls state changes
  private apply(event) { ... }
  loadFromHistory(events) { ... }
}
```

### 3. **Command Handler Pattern**

Commands create events:
```typescript
// Command
{ accountId, amount, type: "DepositCommand" }

// Processing
1. Load aggregate
2. Validate
3. Create event
4. Persist

// Result
MoneyDepositedEvent stored in EventStore
```

### 4. **Immutability Pattern**

Events are immutable:
```typescript
// Write event
eventStore.append(event);

// Read event (always safe)
const events = eventStore.getEvents(accountId);

// History is permanent - cannot change the past
```

---

## 💾 Persistence Details

### In-Memory Storage (Current Implementation)

```typescript
private eventLog = new Map<string, BankAccountEvent[]>();
```

Production alternatives:
- **PostgreSQL**: `events` table with JSONB
- **MongoDB**: Collection with aggregateId index
- **EventStoreDB**: Purpose-built event store
- **Kafka**: Event streams for distributed systems
- **DynamoDB**: Append-only design pattern

### Storage Format

Each event stored with:
```typescript
{
  aggregateId: "ACC001",      // Which account
  type: "MoneyDeposited",     // What happened
  timestamp: Date,            // When
  amount: 300,                // Domain data
  description: "Salary"       // Why
}
```

### Query Patterns

```typescript
// Single stream
getEvents('ACC001')

// Multiple streams
getAllEvents()

// Point-in-time state
getEventsSince('ACC001', fromIndex)

// Existence check
exists('ACC001')
```

---

## 🔐 Invariants (Business Rules)

### Account Cannot be Created Twice
```typescript
if (this.eventStore.exists(accountId)) {
  throw new Error('Account already exists');
}
```

### Cannot Withdraw More Than Balance
```typescript
if (!account.canWithdraw(amount)) {
  throw new Error('Insufficient funds');
}
```

### Cannot Deposit/Withdraw Closed Account
```typescript
if (!account.isActive()) {
  throw new Error('Account is closed');
}
```

### Amount Must Be Positive
```typescript
if (amount <= 0) {
  throw new Error('Amount must be positive');
}
```

---

## 🔍 Debugging & Monitoring

### View Event Stream

```typescript
eventStore.getEventStream(accountId);

Output:
=== Event Stream for ACC001 ===
1. AccountCreated @ 2024-01-15T09:00:00Z
2. MoneyDeposited @ 2024-01-15T09:30:00Z
   Amount: $300
3. MoneyWithdrawn @ 2024-01-15T10:00:00Z
   Amount: $100
===============================
```

### Get All Events Globally

```typescript
const allEvents = eventStore.getAllEvents();
// Shows complete audit trail across all accounts
```

### Check Event Count

```typescript
eventStore.getEventCount(accountId);  // Version number
```

---

## 🚀 Scalability Considerations

### Current Design (In-Memory)
- Single instance
- Events in memory
- Perfect for learning

### Scaling to Production

#### 1. EventStore Persistence
```
Disk storage → Never lose events
```

#### 2. Read Models (CQRS)
```
EventStore → EventBus → Separate read database
                      → Query service
```

#### 3. Command Service
```
LoadAggregate → Execute command → Generate event
```

#### 4. Projection Service
```
EventBus → Event stream → Build read models
```

#### 5. Distributed
```
Event store replicated across regions
Subscribers update local read models
```

---

## 📊 Comparison with Previous Patterns

| Aspect | Bài 4 (Microservices) | Exercise 1 (Event Sourcing) |
|--------|----------------------|---------------------------|
| **State Storage** | Database (write), Cache (read) | Events only |
| **Current State** | Stored directly | Computed from events |
| **Audit Trail** | Event log + DB state | Complete in events |
| **Time-travel** | Difficult | Natural |
| **Snapshot Needed** | For performance | Optional |
| **Recovery** | Restore DB backup | Replay events |

---

## ✅ Checklist for Understanding

After reading this document, you should understand:

- [ ] What is event sourcing
- [ ] Why store events instead of state
- [ ] How apply() works
- [ ] How replay() works
- [ ] Why state is computed, not stored
- [ ] How to load an aggregate
- [ ] How commands create events
- [ ] How EventStore works
- [ ] The complete request flow
- [ ] Scaling considerations

---

**Next**: See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for practical examples.
