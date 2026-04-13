# Exercise 2: Time Travel / Undo — Event Sourcing

## 🎯 New Concepts

### Time Travel
Because events are stored in order, we can **replay up to any point** to get a past state:

```
Events: [Created($1000), Deposit($500), Withdraw($300), Deposit($200)]
                0              1              2              3

getStateAt(0) → balance: $1000  (just after creation)
getStateAt(1) → balance: $1500  (after deposit)
getStateAt(2) → balance: $1200  (after withdrawal)
getStateAt(3) → balance: $1400  (current state)
```

### Undo (Compensating Event)
Events are **immutable** — we cannot delete or edit them. Instead, undo is a new event:

```
Last event: MoneyDeposited($500)   → compensating: MoneyWithdrawn($500, "↩ Undo")
Last event: MoneyWithdrawn($300)   → compensating: MoneyDeposited($300, "↩ Undo")
```

The event stream grows, but the old event is preserved (audit trail).

---

## 📡 API Endpoints

### New Time Travel Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | /accounts/:id/state/:index | State at event[index] |
| GET | /accounts/:id/timeline | Balance at every step |
| DELETE | /accounts/:id/undo | Undo last event |

### Standard Endpoints (from Exercise 1)
| Method | Path | Purpose |
|--------|------|---------|
| POST | /accounts | Create account |
| POST | /accounts/:id/deposit | Deposit money |
| POST | /accounts/:id/withdraw | Withdraw money |
| GET | /accounts/:id | Current state |
| GET | /accounts/:id/balance | Current balance |
| GET | /accounts/:id/history | Full event log |

---

## 💻 Key Code

### `getStateAt(index)` — Time Travel

```typescript
static getStateAt(accountId: string, allEvents: BankAccountEvent[], index: number): BankAccountState {
  // Replay only up to the specified index
  const eventsUpToIndex = allEvents.slice(0, index + 1);

  const account = new BankAccount(accountId);
  account.loadFromHistory(eventsUpToIndex);  // Partial replay!
  return account.getState();
}
```

### `getTimeline()` — Full History

```typescript
static getTimeline(accountId: string, allEvents: BankAccountEvent[]): TimestampedState[] {
  return allEvents.map((event, index) => ({
    eventIndex: index,
    event,
    stateAfterEvent: BankAccount.getStateAt(accountId, allEvents, index)
  }));
}
```

### `undoLastEvent()` — Compensating Event

```typescript
undoLastEvent(accountId: string): BankAccountEvent | null {
  const events = this.eventStore.getEvents(accountId);
  const lastEvent = events[events.length - 1];

  // Create compensating event based on type
  if (lastEvent.type === 'MoneyDeposited') {
    return {
      type: 'MoneyWithdrawn',
      amount: lastEvent.amount,
      description: '↩ Undo: ' + lastEvent.description
    };
  }
  if (lastEvent.type === 'MoneyWithdrawn') {
    return {
      type: 'MoneyDeposited',
      amount: lastEvent.amount,
      description: '↩ Undo: ' + lastEvent.description
    };
  }
}
```

---

## 🧪 Test Scenario

```bash
# Start server
npm run dev  # Port 3006

# 1. Create account
curl -X POST http://localhost:3006/accounts \
  -H "Content-Type: application/json" \
  -d '{"accountId":"ACC001","accountHolder":"John","initialBalance":1000}'

# 2. Multiple transactions
curl -X POST http://localhost:3006/accounts/ACC001/deposit \
  -d '{"amount":500}'  -H "Content-Type: application/json"

curl -X POST http://localhost:3006/accounts/ACC001/withdraw \
  -d '{"amount":300}'  -H "Content-Type: application/json"

curl -X POST http://localhost:3006/accounts/ACC001/deposit \
  -d '{"amount":200}'  -H "Content-Type: application/json"

# Events so far: [Created, Deposit, Withdraw, Deposit] (index 0-3)

# 3. Time travel: state after first deposit (index 1)
curl http://localhost:3006/accounts/ACC001/state/1
# → balance: 1500

# 4. Time travel: state right after creation (index 0)
curl http://localhost:3006/accounts/ACC001/state/0
# → balance: 1000

# 5. Full timeline
curl http://localhost:3006/accounts/ACC001/timeline
# → balance evolution: 1000 → 1500 → 1200 → 1400

# 6. Undo last event (Deposit $200)
curl -X DELETE http://localhost:3006/accounts/ACC001/undo
# → adds compensating MoneyWithdrawn($200, "↩ Undo")
# → new balance: 1200

# 7. View event history including compensating event
curl http://localhost:3006/accounts/ACC001/history
```

---

## 🔑 Key Takeaway

**Time Travel = Partial Replay**
```
getAllEvents() → [E0, E1, E2, E3]
getStateAt(2) → replay [E0, E1, E2] → state at time of E2
```

**Undo = New Event (Not Deletion)**
```
EventLog: [Deposit($500), ..., MoneyWithdrawn($500, "↩ Undo")]
                                ↑ compensating event added to end
```

The original `Deposit($500)` event is **preserved forever** in the log.

---

## Port: 3006
