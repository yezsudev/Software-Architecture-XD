import { BankAccount } from '../domain/BankAccount';
import { EventStore } from '../persistence/EventStore';
import { AccountSummaryProjection } from '../projections/AccountSummaryProjection';
import { BankAccountEvent, BankAccountState, AccountSummary, MoneyDepositedEvent, MoneyWithdrawnEvent } from '../models';

/**
 * BankAccountService
 *
 * Write commands go through aggregate → EventStore (write model)
 * Read queries go directly to AccountSummaryProjection (read model)
 *
 * This demonstrates proper CQRS separation:
 * - Commands: modify state via events
 * - Queries: read from projection (no replay!)
 */
export class BankAccountService {
  constructor(
    private eventStore: EventStore,
    private projection: AccountSummaryProjection
  ) {
    // Wire projection to receive every event from EventStore
    this.eventStore.subscribe(event => this.projection.project(event));
  }

  // ─── COMMANDS (Write Side) ─────────────────────────────────────────────────

  createAccount(accountId: string, accountHolder: string, initialBalance = 0): BankAccount {
    if (!accountId || !accountHolder) throw new Error('accountId and accountHolder required');
    if (initialBalance < 0) throw new Error('Initial balance cannot be negative');
    if (this.eventStore.exists(accountId)) throw new Error('Account already exists');

    const account = new BankAccount(accountId);
    const event: any = { type: 'AccountCreated', aggregateId: accountId, timestamp: new Date(), accountHolder, initialBalance };
    account.recordEvent(event);
    this.eventStore.append(event);  // → Projection updated automatically
    account.markChangesAsCommitted();
    return account;
  }

  depositMoney(accountId: string, amount: number, description?: string): BankAccount {
    if (amount <= 0) throw new Error('Deposit amount must be positive');
    const account = this.loadAccount(accountId);
    if (!account.isActive()) throw new Error('Account is closed');

    const event: MoneyDepositedEvent = {
      type: 'MoneyDeposited', aggregateId: accountId, timestamp: new Date(), amount,
      description: description || `Deposit of $${amount}`
    };
    account.recordEvent(event);
    this.eventStore.append(event);  // → Projection updated automatically
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
      type: 'MoneyWithdrawn', aggregateId: accountId, timestamp: new Date(), amount,
      description: description || `Withdrawal of $${amount}`
    };
    account.recordEvent(event);
    this.eventStore.append(event);  // → Projection updated automatically
    account.markChangesAsCommitted();
    return account;
  }

  // ─── QUERIES (Read Side) ───────────────────────────────────────────────────

  /**
   * Get account summary from READ MODEL (fast — no replay!)
   * This is the projection result, built incrementally from events
   */
  getAccountSummary(accountId: string): AccountSummary {
    const summary = this.projection.getSummary(accountId);
    if (!summary) throw new Error(`Account not found: ${accountId}`);
    return summary;
  }

  getAllSummaries(): AccountSummary[] {
    return this.projection.getAllSummaries();
  }

  /**
   * Get account state from WRITE MODEL (requires replay)
   * Use getAccountSummary() for faster reads
   */
  getAccountState(accountId: string): BankAccountState {
    return this.loadAccount(accountId).getState();
  }

  getEventHistory(accountId: string): BankAccountEvent[] {
    return this.eventStore.getEvents(accountId);
  }

  /**
   * Rebuild read model from scratch (recovery)
   */
  rebuildProjection(): void {
    const allEvents = this.eventStore.getAllEvents();
    this.projection.rebuild(allEvents);
  }

  // ─── INTERNAL ─────────────────────────────────────────────────────────────

  private loadAccount(accountId: string): BankAccount {
    if (!this.eventStore.exists(accountId)) throw new Error(`Account not found: ${accountId}`);
    const account = new BankAccount(accountId);
    account.loadFromHistory(this.eventStore.getEvents(accountId));
    return account;
  }
}
