# Quick Start Guide: Event Sourcing

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
cd Exercise1_EventSourcing
npm install
```

### 2. Start Server
```bash
npm run dev
```

Output:
```
Bank Account Event Sourcing Service
Port: 3005
```

### 3. Create Account
```bash
curl -X POST http://localhost:3005/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "myaccount",
    "accountHolder": "Your Name",
    "initialBalance": 1000
  }'
```

### 4. Deposit Money
```bash
curl -X POST http://localhost:3005/accounts/myaccount/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}'
```

### 5. Check Balance
```bash
curl http://localhost:3005/accounts/myaccount/balance
```

### 6. View History
```bash
curl http://localhost:3005/accounts/myaccount/history
```

---

## 🎯 Key Concept

**State is COMPUTED from events, not stored in database:**

```
Events: [AccountCreated($1000), Deposit($500), Withdraw($100)]
         ↓ (apply each in order)
State: { balance: $1400 }
```

---

## 📌 Core Methods

### apply(event)
Applies single event to state:
```typescript
// balance = 1000, then deposit 500
apply(MoneyDepositedEvent { amount: 500 })
// balance = 1500
```

### loadFromHistory(events)
Replays all events:
```typescript
events = [AccountCreated, Deposit, Withdraw]
replay(events)  // balance = computed from all events
```

### getBalance()
Returns computed balance (no database lookup):
```typescript
return state.balance;  // Derived, not fetched
```

---

## 🔗 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /accounts | Create new account |
| GET | /accounts/:id | Get account state |
| GET | /accounts/:id/balance | Get balance |
| GET | /accounts/:id/history | View all events |
| POST | /accounts/:id/deposit | Deposit money |
| POST | /accounts/:id/withdraw | Withdraw money |
| GET | /accounts | List all accounts |

---

## ✅ Checklist

- [ ] npm install succeeded
- [ ] Server running on port 3005
- [ ] Can create account
- [ ] Can deposit/withdraw
- [ ] Balance is correct
- [ ] Can view event history
- [ ] History shows all transactions

---

## 📚 Learn More

- **README.md** - Full explanation
- **ARCHITECTURE.md** - Design details  
- **TESTING_GUIDE.md** - Examples & scenarios

---

**Ready to start? Run: `npm run dev`**
