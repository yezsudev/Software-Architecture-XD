import { BankAccount } from '../domain/BankAccount';
import { EventStore } from '../persistence/EventStore';
import {
  BankAccountEvent,
  BankAccountState,
  TimestampedState,
  MoneyDepositedEvent,
  MoneyWithdrawnEvent
} from '../models';

/**
 * BankAccountService - Command Handler + Time Travel
 *
 * New operations (Exercise 2):
 * - getStateAt(accountId, index)   → past state via partial replay
 * - getTimeline(accountId)         → state at every checkpoint
 * - undoLastEvent(accountId)       → compensating event (immutable undo)
 */
export class BankAccountService {
  constructor(private eventStore: EventStore) {}

  // ─── COMMANDS ─────────────────────────────────────────────────────────────

  createAccount(accountId: string, accountHolder: string, initialBalance = 0): BankAccount {
    if (!accountId || !accountHolder) throw new Error('accountId and accountHolder required');
    if (initialBalance < 0) throw new Error('Initial balance cannot be negative');
    if (this.eventStore.exists(accountId)) throw new Error('Account already exists');

    const account = new BankAccount(accountId);
    const event: any = {
      type: 'AccountCreated',
      aggregateId: accountId,
      timestamp: new Date(),
      accountHolder,
      initialBalance
    };
    account.recordEvent(event);
    this.eventStore.append(event);
    account.markChangesAsCommitted();
    return account;
  }

  depositMoney(accountId: string, amount: number, description?: string): BankAccount {
    if (amount <= 0) throw new Error('Deposit amount must be positive');
    const account = this.loadAccount(accountId);
    if (!account.isActive()) throw new Error('Account is closed');

    const event: MoneyDepositedEvent = {
      type: 'MoneyDeposited', aggregateId: accountId,
      timestamp: new Date(), amount,
      description: description || `Deposit of $${amount}`
    };
    account.recordEvent(event);
    this.eventStore.append(event);
    account.markChangesAsCommitted();
    return account;
  }

  withdrawMoney(accountId: string, amount: number, description?: string): BankAccount {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');
    const account = this.loadAccount(accountId);
    if (!account.isActive()) throw new Error('Account is closed');
    if (!account.canWithdraw(amount)) {
      throw new Error(`Insufficient funds: balance $${account.getBalance()}, requested $${amount}`);
    }

    const event: MoneyWithdrawnEvent = {
      type: 'MoneyWithdrawn', aggregateId: accountId,
      timestamp: new Date(), amount,
      description: description || `Withdrawal of $${amount}`
    };
    account.recordEvent(event);
    this.eventStore.append(event);
    account.markChangesAsCommitted();
    return account;
  }

  // ─── TIME TRAVEL ──────────────────────────────────────────────────────────

  /**
   * Get state at a specific event index (past state)
   *
   * Hint: replay events until index
   * index 0 → state after first event (AccountCreated)
   * index 1 → state after second event
   * ...
   */
  getStateAt(accountId: string, index: number): BankAccountState {
    if (!this.eventStore.exists(accountId)) throw new Error(`Account not found: ${accountId}`);
    const events = this.eventStore.getEvents(accountId);
    return BankAccount.getStateAt(accountId, events, index);
  }

  /**
   * Get complete timeline: state at every event checkpoint
   * Allows viewing how account balance changed over time
   */
  getTimeline(accountId: string): TimestampedState[] {
    if (!this.eventStore.exists(accountId)) throw new Error(`Account not found: ${accountId}`);
    const events = this.eventStore.getEvents(accountId);
    return BankAccount.getTimeline(accountId, events);
  }

  /**
   * Undo last event by creating a compensating event
   *
   * Event Sourcing principle: Never delete events!
   * Undo = add a new "reversing" event to the stream
   *
   * If last was MoneyDeposited($300) → add MoneyWithdrawn($300, "Undo")
   * If last was MoneyWithdrawn($300) → add MoneyDeposited($300, "Undo")
   * If last was AccountCreated       → cannot undo (account creation)
   *
   * @returns The compensating event that was added, or null if not undoable
   */
  undoLastEvent(accountId: string): BankAccountEvent | null {
    if (!this.eventStore.exists(accountId)) throw new Error(`Account not found: ${accountId}`);

    const events = this.eventStore.getEvents(accountId);
    const lastEvent = events[events.length - 1];

    if (!lastEvent) return null;

    let compensatingEvent: BankAccountEvent | null = null;

    if (lastEvent.type === 'MoneyDeposited') {
      const de = lastEvent as MoneyDepositedEvent;
      compensatingEvent = {
        type: 'MoneyWithdrawn',
        aggregateId: accountId,
        timestamp: new Date(),
        amount: de.amount,
        description: `↩ Undo: ${de.description || 'deposit'}`
      } as MoneyWithdrawnEvent;
    } else if (lastEvent.type === 'MoneyWithdrawn') {
      const we = lastEvent as MoneyWithdrawnEvent;
      compensatingEvent = {
        type: 'MoneyDeposited',
        aggregateId: accountId,
        timestamp: new Date(),
        amount: we.amount,
        description: `↩ Undo: ${we.description || 'withdrawal'}`
      } as MoneyDepositedEvent;
    } else {
      throw new Error(`Cannot undo event of type: ${lastEvent.type}`);
    }

    this.eventStore.append(compensatingEvent);
    console.log(`[Service] Undo: added compensating event ${compensatingEvent.type} for ${lastEvent.type}`);
    return compensatingEvent;
  }

  // ─── READS ────────────────────────────────────────────────────────────────

  loadAccount(accountId: string): BankAccount {
    if (!this.eventStore.exists(accountId)) throw new Error(`Account not found: ${accountId}`);
    const account = new BankAccount(accountId);
    account.loadFromHistory(this.eventStore.getEvents(accountId));
    return account;
  }

  getBalance(accountId: string): number {
    return this.loadAccount(accountId).getBalance();
  }

  getAccountState(accountId: string): BankAccountState {
    return this.loadAccount(accountId).getState();
  }

  getEventHistory(accountId: string): BankAccountEvent[] {
    return this.eventStore.getEvents(accountId);
  }

  getAllEvents(): BankAccountEvent[] {
    return this.eventStore.getAllEvents();
  }
}
