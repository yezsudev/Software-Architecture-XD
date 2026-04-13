# Exercise 4: Snapshot Optimization — Event Sourcing

## 🎯 Problem

Without snapshots, loading an aggregate requires replaying **all events from the beginning**:

```
Account with 10,000 events:
    Load → replay event[0] → event[1] → ... → event[9999] → state
    Expensive! O(N) where N = total events
```

## ✅ Solution: Snapshots

Take a periodic snapshot of the state. On next load, start from snapshot and only replay **delta events**:

```
Snapshot at v1000:
    Load → restore snapshot state → replay event[1001]...[10000]
    O(K) where K = events since last snapshot (much smaller than N)
```

---

## 🔑 Snapshot Structure

```typescript
interface Snapshot {
  accountId: string;
  version: number;          // Event count when snapshot was taken
  state: BankAccountState;  // State at that version
  createdAt: Date;
}
```

---

## 📊 Loading Strategy

```
loadAccount(accountId):
  snapshot = snapshotStore.getLatest(accountId)

  if (snapshot) {
    // OPTIMIZED PATH
    account.loadFromSnapshot(snapshot.state, snapshot.version)
    deltaEvents = eventStore.getEventsSince(accountId, snapshot.version)
    account.applyDeltaEvents(deltaEvents)
  } else {
    // FALLBACK: full replay
    allEvents = eventStore.getEvents(accountId)
    account.loadFromHistory(allEvents)
  }
```

---

## 💻 Key Code

### SnapshotStore

```typescript
class SnapshotStore {
  save(accountId: string, version: number, state: BankAccountState): void {
    this.snapshots.set(accountId, { accountId, version, state, createdAt: new Date() });
  }

  getLatest(accountId: string): Snapshot | null {
    return this.snapshots.get(accountId) ?? null;
  }
}
```

### BankAccount — Two Load Paths

```typescript
// Path 1: Start from snapshot
loadFromSnapshot(snapshotState: BankAccountState, version: number): void {
  this.state = { ...snapshotState };  // Restore state directly
  this.version = version;             // Skip to snapshot version
}

// Path 2: Apply events after snapshot
applyDeltaEvents(events: BankAccountEvent[]): void {
  events.forEach(e => this.apply(e));   // Only new events!
  this.version += events.length;
}
```

### Auto-Snapshot Trigger

```typescript
const SNAPSHOT_EVERY = 3;  // Every 3 events (use 50-100 in production)

private checkAndSnapshot(accountId: string, account: BankAccount): void {
  const totalEvents = this.eventStore.getEventCount(accountId);
  if (totalEvents % SNAPSHOT_EVERY === 0) {
    this.snapshotStore.save(accountId, totalEvents, account.getState());
  }
}
```

---

## 🧪 Test Scenario

```bash
npm run dev  # Port 3008

# Create account (event #1)
curl -X POST http://localhost:3008/accounts \
  -H "Content-Type: application/json" \
  -d '{"accountId":"ACC001","accountHolder":"Bob","initialBalance":1000}'

# Deposit (event #2)
curl -X POST http://localhost:3008/accounts/ACC001/deposit \
  -d '{"amount":500}' -H "Content-Type: application/json"

# Withdraw (event #3) ← snapshot auto-created here!
curl -X POST http://localhost:3008/accounts/ACC001/withdraw \
  -d '{"amount":200}' -H "Content-Type: application/json"

# Check snapshot
curl http://localhost:3008/accounts/ACC001/snapshot
# → snapshot.version: 3, state.balance: 1300

# Deposit again (event #4)
curl -X POST http://localhost:3008/accounts/ACC001/deposit \
  -d '{"amount":100}' -H "Content-Type: application/json"

# Next load will use:
# snapshot (v3, $1300) + delta [event #4 +$100] = $1400
# Instead of replaying all 4 events!

# Delete snapshot to see full replay
curl -X DELETE http://localhost:3008/accounts/ACC001/snapshot

# Now load uses full replay (see console output difference)
curl http://localhost:3008/accounts/ACC001
```

---

## 📈 Console Output Comparison

**With snapshot:**
```
[Load] Using snapshot v3, replaying 1 delta events (skipped 3 events)
[BankAccount] Loaded from snapshot at v3 (balance: $1300)
[BankAccount] Applied 1 delta events (now at v4)
```

**Without snapshot (full replay):**
```
[Load] No snapshot, full replay of 4 events
[BankAccount] Full replay of 4 events (no snapshot)
```

---

## 📡 API

| Method | Path | Description |
|--------|------|-------------|
| POST | /accounts | Create account |
| POST | /accounts/:id/deposit | Deposit |
| POST | /accounts/:id/withdraw | Withdraw |
| **GET** | **/accounts/:id/snapshot** | **View latest snapshot** |
| **POST** | **/accounts/:id/snapshot** | **Force-create snapshot** |
| **DELETE** | **/accounts/:id/snapshot** | **Delete snapshot** |
| GET | /accounts/:id | Get account state |
| GET | /accounts/:id/history | View events |

---

## Port: 3008
