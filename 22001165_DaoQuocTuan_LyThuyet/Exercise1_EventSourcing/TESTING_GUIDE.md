# Testing & Examples: Bank Account Event Sourcing

## 🚀 Quick Start

### 1. Start the Server

```bash
npm install
npm run dev
```

Expected output:
```
╔════════════════════════════════════════════════════════════╗
║   Bank Account Event Sourcing Service                      ║
║   Port: 3005                                               ║
║   Pattern: EVENT SOURCING                                  ║
║                                                            ║
║   State = replay(events)                                   ║
║   Balance = sum(deposits) - sum(withdrawals)               ║
║                                                            ║
║   Every transaction is an immutable event                  ║
║   Current state is computed on-demand                      ║
╚════════════════════════════════════════════════════════════╝
```

### 2. Test Health

```bash
curl http://localhost:3005/health
```

Response:
```json
{
  "status": "ok",
  "message": "Bank Account Event Sourcing Service",
  "pattern": "Event Sourcing",
  "version": "1.0.0"
}
```

---

## 📝 Test Scenarios

### Scenario 1: Basic Account Operations

#### Step 1a: Create Account

```bash
curl -X POST http://localhost:3005/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACC001",
    "accountHolder": "John Doe",
    "initialBalance": 1000
  }'
```

**Response:**
```json
{
  "message": "Account created",
  "accountId": "ACC001",
  "accountHolder": "John Doe",
  "balance": 1000,
  "isActive": true,
  "transactionCount": 0,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**What happened:**
- Created `AccountCreatedEvent`
- Stored in EventStore
- State computed: balance = initialBalance = 1000

**Events in EventStore:**
```
EventStore['ACC001'] = [
  {
    type: 'AccountCreated',
    accountHolder: 'John Doe',
    initialBalance: 1000,
    timestamp: '2024-01-15T10:30:00.000Z'
  }
]
```

#### Step 1b: Check Initial Balance

```bash
curl http://localhost:3005/accounts/ACC001/balance
```

**Response:**
```json
{
  "accountId": "ACC001",
  "balance": 1000,
  "message": "✓ Balance computed: sum(deposits) - sum(withdrawals)"
}
```

**State Reconstruction:**
```
Load: getEvents('ACC001') → [AccountCreatedEvent]
Replay: apply(AccountCreatedEvent) → balance = 1000
Result: balance = 1000 ✓
```

#### Step 1c: Deposit Money

```bash
curl -X POST http://localhost:3005/accounts/ACC001/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "description": "Salary deposit"
  }'
```

**Response:**
```json
{
  "accountId": "ACC001",
  "transaction": "DEPOSIT",
  "amount": 500,
  "newBalance": 1500,
  "transactionCount": 1,
  "message": "✓ Deposited $500. New balance: $1500"
}
```

**What happened:**
- Created `MoneyDepositedEvent`
- Stored in EventStore
- Applied to state: balance = 1000 + 500 = 1500
- Marked changes as committed

**Events in EventStore:**
```
EventStore['ACC001'] = [
  { type: 'AccountCreated', initialBalance: 1000 },
  { type: 'MoneyDeposited', amount: 500 }
]
```

#### Step 1d: Withdraw Money

```bash
curl -X POST http://localhost:3005/accounts/ACC001/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 300,
    "description": "ATM withdrawal"
  }'
```

**Response:**
```json
{
  "accountId": "ACC001",
  "transaction": "WITHDRAW",
  "amount": 300,
  "newBalance": 1200,
  "transactionCount": 2,
  "message": "✓ Withdrew $300. New balance: $1200"
}
```

**What happened:**
- Created `MoneyWithdrawnEvent`
- Stored in EventStore
- Applied to state: balance = 1500 - 300 = 1200

**Events in EventStore:**
```
EventStore['ACC001'] = [
  { type: 'AccountCreated', initialBalance: 1000 },
  { type: 'MoneyDeposited', amount: 500 },
  { type: 'MoneyWithdrawn', amount: 300 }
]
```

#### Step 1e: View Full Account State

```bash
curl http://localhost:3005/accounts/ACC001
```

**Response:**
```json
{
  "accountId": "ACC001",
  "accountHolder": "John Doe",
  "balance": 1200,
  "isActive": true,
  "transactionCount": 2,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "closedAt": null,
  "message": "✓ State computed from event replay"
}
```

**State Reconstruction Process:**
```
1. Load aggregate: new BankAccount('ACC001')
2. Get events: [AccountCreated, MoneyDeposited, MoneyWithdrawn]
3. Replay:
   - apply(AccountCreated) → balance = 1000
   - apply(MoneyDeposited) → balance = 1500
   - apply(MoneyWithdrawn) → balance = 1200
4. Return state: { balance: 1200, ... }

⚠️ IMPORTANT: balance: 1200 is COMPUTED at request time!
It's never stored in database.
```

#### Step 1f: View Event History (Complete Audit Trail)

```bash
curl http://localhost:3005/accounts/ACC001/history
```

**Response:**
```json
{
  "accountId": "ACC001",
  "eventCount": 3,
  "events": [
    {
      "type": "AccountCreated",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "accountHolder": "John Doe",
      "initialBalance": 1000
    },
    {
      "type": "MoneyDeposited",
      "timestamp": "2024-01-15T10:32:00.000Z",
      "amount": 500,
      "description": "Salary deposit"
    },
    {
      "type": "MoneyWithdrawn",
      "timestamp": "2024-01-15T10:34:00.000Z",
      "amount": 300,
      "description": "ATM withdrawal"
    }
  ],
  "message": "✓ Complete event stream (3 events)"
}
```

---

### Scenario 2: Multiple Transactions

#### Create Another Account

```bash
curl -X POST http://localhost:3005/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACC002",
    "accountHolder": "Jane Smith",
    "initialBalance": 2000
  }'
```

#### Perform Multiple Operations

```bash
# Deposit 1
curl -X POST http://localhost:3005/accounts/ACC002/deposit \
  -H "Content-Type: application/json" \
  -d '{ "amount": 1000, "description": "Bonus" }'

# Withdraw 1
curl -X POST http://localhost:3005/accounts/ACC002/withdraw \
  -H "Content-Type: application/json" \
  -d '{ "amount": 500, "description": "Shopping" }'

# Deposit 2
curl -X POST http://localhost:3005/accounts/ACC002/deposit \
  -H "Content-Type: application/json" \
  -d '{ "amount": 200, "description": "Refund" }'

# Withdraw 2
curl -X POST http://localhost:3005/accounts/ACC002/withdraw \
  -H "Content-Type: application/json" \
  -d '{ "amount": 100, "description": "Bill payment" }'
```

#### Check Final Balance

```bash
curl http://localhost:3005/accounts/ACC002/balance
```

**Response:**
```json
{
  "accountId": "ACC002",
  "balance": 2600,
  "message": "✓ Balance computed: sum(deposits) - sum(withdrawals)"
}
```

**Computation:**
```
Initial: 2000
+ Deposit (1000): 3000
- Withdraw (500): 2500
+ Deposit (200): 2700
- Withdraw (100): 2600 ✓
```

#### View All Transactions

```bash
curl http://localhost:3005/accounts/ACC002/history
```

**Response:**
```json
{
  "accountId": "ACC002",
  "eventCount": 5,
  "events": [
    { "type": "AccountCreated", "initialBalance": 2000, ... },
    { "type": "MoneyDeposited", "amount": 1000, "description": "Bonus" },
    { "type": "MoneyWithdrawn", "amount": 500, "description": "Shopping" },
    { "type": "MoneyDeposited", "amount": 200, "description": "Refund" },
    { "type": "MoneyWithdrawn", "amount": 100, "description": "Bill payment" }
  ],
  "message": "✓ Complete event stream (5 events)"
}
```

---

### Scenario 3: Error Handling

#### Try to Create Duplicate Account

```bash
curl -X POST http://localhost:3005/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "ACC001",
    "accountHolder": "Someone Else"
  }'
```

**Response (400):**
```json
{
  "error": "Account already exists"
}
```

#### Try to Withdraw More Than Balance

```bash
curl -X POST http://localhost:3005/accounts/ACC001/withdraw \
  -H "Content-Type: application/json" \
  -d '{ "amount": 5000 }'
```

**Response (400):**
```json
{
  "error": "Insufficient funds: balance $1200, requested $5000"
}
```

**What happened:**
```
1. Load account: Replay events → balance = 1200
2. Validate: check(1200 >= 5000) → false
3. Reject: Don't create event
4. Return: Error message
```

#### Try to Deposit Negative Amount

```bash
curl -X POST http://localhost:3005/accounts/ACC001/deposit \
  -H "Content-Type: application/json" \
  -d '{ "amount": -100 }'
```

**Response (400):**
```json
{
  "error": "Deposit amount must be positive"
}
```

#### Try to Access Non-existent Account

```bash
curl http://localhost:3005/accounts/ACC999
```

**Response (404):**
```json
{
  "error": "Account not found: ACC999"
}
```

---

### Scenario 4: View All Accounts

```bash
curl http://localhost:3005/accounts
```

**Response:**
```json
{
  "accountCount": 2,
  "accounts": [
    {
      "accountId": "ACC001",
      "accountHolder": "John Doe",
      "balance": 1200,
      "isActive": true,
      "transactionCount": 2,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "accountId": "ACC002",
      "accountHolder": "Jane Smith",
      "balance": 2600,
      "isActive": true,
      "transactionCount": 4,
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "message": "✓ All accounts (states computed from events)"
}
```

---

## 🔍 Key Concepts Verified

### 1. Balance Computed from Events

```
Event Stream: [Events...]
     ↓
Replay: Apply each event
     ↓
Final State: { balance: computed_value }
```

No balance field in database - only computed at runtime.

### 2. Complete Audit Trail

Every transaction visible in event history:
- What (event type)
- When (timestamp)
- How much (amount)
- Why (description)

### 3. Immutability

Events are never modified or deleted:
- Create account → permanent
- Deposit → permanent
- Withdraw → permanent
- Complete history preserved

### 4. State Reconstruction

Same result every time:
```
Reload account → Replay events → Same state
```

No inconsistency, no data corruption.

### 5. Time-Travel Capability

Could compute state at any point:
```typescript
// Example: Balance at 2024-01-15T10:32:00
const stateAt = (timepoint) => {
  const eventsUntilTime = events.filter(e => e.timestamp <= timepoint);
  return replay(eventsUntilTime);
};
```

---

## 📊 Console Output Examples

### When Creating Account

```
📨 POST /accounts

[Service] Account created: John Doe (ACC001)
[EventStore] Event appended: AccountCreated (ACC001)

{
  "message": "Account created",
  ...
}
```

### When Depositing Money

```
📨 POST /accounts/ACC001/deposit

[Replay] Loading 1 events for ACC001
  1/1: AccountCreated
[apply] AccountCreated: John Doe (init balance: $1000)
[Replay] Complete - State reconstructed (v1)

[apply] MoneyDeposited: +$500 (balance: $1500)
[Service] Deposited $500 to ACC001
[EventStore] Event appended: MoneyDeposited (ACC001)

{
  "newBalance": 1500,
  ...
}
```

### When Viewing History

```
📨 GET /accounts/ACC001/history

[Replay] Loading 2 events for ACC001
  1/2: AccountCreated
[apply] AccountCreated: John Doe (init balance: $1000)
  2/2: MoneyDeposited
[apply] MoneyDeposited: +$500 (balance: $1500)
[Replay] Complete - State reconstructed (v2)

=== Event Stream for ACC001 ===
1. AccountCreated @ 2024-01-15T10:30:00Z
2. MoneyDeposited @ 2024-01-15T10:32:00Z
   Amount: $500
===============================
```

---

## 🧪 Verification Checklist

After running tests, verify:

- [ ] Account can be created with initial balance
- [ ] Balance starts at initial value
- [ ] Deposit increases balance
- [ ] Withdraw decreases balance
- [ ] Cannot withdraw more than balance
- [ ] Cannot deposit/withdraw negative amounts
- [ ] Event history shows all transactions
- [ ] Event history has correct timestamps
- [ ] Cannot create duplicate account
- [ ] Multiple accounts work independently
- [ ] Reloading account gives same state
- [ ] All accounts listed correctly
- [ ] Balance always matches: initial + deposits - withdrawals

---

## 🔗 API Reference

### Create Account
```
POST /accounts
Body: { accountId, accountHolder, initialBalance? }
Returns: Account state
```

### Get Account
```
GET /accounts/:id
Returns: Full account state (computed)
```

### Get Balance
```
GET /accounts/:id/balance
Returns: { accountId, balance }
```

### Get History
```
GET /accounts/:id/history
Returns: Array of all events
```

### Deposit
```
POST /accounts/:id/deposit
Body: { amount, description? }
Returns: Updated state
```

### Withdraw
```
POST /accounts/:id/withdraw
Body: { amount, description? }
Returns: Updated state
```

### List All Accounts
```
GET /accounts
Returns: Array of all account states
```

### Health Check
```
GET /health
Returns: Service status
```

---

## 💡 Learning Notes

### Why State is Computed

Traditional approach:
```sql
UPDATE accounts SET balance = balance + 500 WHERE id = 'ACC001';
```

Event Sourcing approach:
```
INSERT INTO events (...) VALUES (...);
SELECT balance FROM (REPLAY events for ACC001);
```

Benefits:
- ✅ Complete audit trail
- ✅ Never lose data
- ✅ Time-travel capability
- ✅ Easy recovery
- ✅ Concurrent writes to same aggregate OK

### When to Use Event Sourcing

✅ Good for:
- Financial systems (audit trail required)
- Complex state with history
- CQRS patterns
- Distributed systems
- Compliance requirements

❌ Not ideal for:
- Simple CRUD operations
- No audit trail needed
- Very simple domain

---

**Happy Testing! 🎉**

See [README.md](./README.md) for more details.
