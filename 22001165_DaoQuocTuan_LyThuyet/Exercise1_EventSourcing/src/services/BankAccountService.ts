import { v4 as uuid } from 'uuid';
import {
  DepositMoneyCommand,
  WithdrawMoneyCommand,
  MoneyDepositedEvent,
  MoneyWithdrawnEvent
} from './models';
import { BankAccount } from './domain/BankAccount';
import { EventStore } from './persistence/EventStore';

/**
 * BankAccountService - Command Handler
 * 
 * Responsibilities:
 * 1. Load aggregate from EventStore (via replay)
 * 2. Execute command (validate + create events)
 * 3. Persist events back to EventStore
 * 4. Return new state
 * 
 * Pattern: Command → Events → EventStore → State
 */
export class BankAccountService {
  constructor(private eventStore: EventStore) {}

  /**
   * Create new bank account
   * @param accountId - Unique account ID
   * @param accountHolder - Account owner name
   * @param initialBalance - Starting balance
   */
  createAccount(accountId: string, accountHolder: string, initialBalance: number = 0): BankAccount {
    if (!accountId || !accountHolder) {
      throw new Error('Account ID and holder name required');
    }

    if (initialBalance < 0) {
      throw new Error('Initial balance cannot be negative');
    }

    if (this.eventStore.exists(accountId)) {
      throw new Error('Account already exists');
    }

    // Create aggregate from scratch
    const account = new BankAccount(accountId);

    // Create AccountCreated event
    const event: any = {
      type: 'AccountCreated',
      aggregateId: accountId,
      timestamp: new Date(),
      accountHolder,
      initialBalance
    };

    // Apply and persist
    account.recordEvent(event);
    this.eventStore.append(event);
    account.markChangesAsCommitted();

    console.log(`[Service] Account created: ${accountHolder} (${accountId})`);
    return account;
  }

  /**
   * Deposit money to account
   * @param accountId - Account to deposit to
   * @param amount - Amount to deposit
   * @param description - Optional transaction description
   */
  depositMoney(accountId: string, amount: number, description?: string): BankAccount {
    // Validate
    if (amount <= 0) {
      throw new Error('Deposit amount must be positive');
    }

    // Load account from event history
    const account = this.getAccount(accountId);

    if (!account.isActive()) {
      throw new Error('Account is closed');
    }

    // Create MoneyDeposited event
    const event: MoneyDepositedEvent = {
      type: 'MoneyDeposited',
      aggregateId: accountId,
      timestamp: new Date(),
      amount,
      description: description || `Deposit of $${amount}`
    };

    // Apply and persist
    account.recordEvent(event);
    this.eventStore.append(event);
    account.markChangesAsCommitted();

    console.log(`[Service] Deposited $${amount} to ${accountId}`);
    return account;
  }

  /**
   * Withdraw money from account
   * @param accountId - Account to withdraw from
   * @param amount - Amount to withdraw
   * @param description - Optional transaction description
   */
  withdrawMoney(accountId: string, amount: number, description?: string): BankAccount {
    // Validate
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be positive');
    }

    // Load account from event history
    const account = this.getAccount(accountId);

    if (!account.isActive()) {
      throw new Error('Account is closed');
    }

    // Check sufficient funds
    if (!account.canWithdraw(amount)) {
      throw new Error(
        `Insufficient funds: balance $${account.getBalance()}, requested $${amount}`
      );
    }

    // Create MoneyWithdrawn event
    const event: MoneyWithdrawnEvent = {
      type: 'MoneyWithdrawn',
      aggregateId: accountId,
      timestamp: new Date(),
      amount,
      description: description || `Withdrawal of $${amount}`
    };

    // Apply and persist
    account.recordEvent(event);
    this.eventStore.append(event);
    account.markChangesAsCommitted();

    console.log(`[Service] Withdrew $${amount} from ${accountId}`);
    return account;
  }

  /**
   * Get account state (reconstructed from events)
   * 
   * CRITICAL: State is computed here via replay, not retrieved from DB
   * @param accountId - Account ID to load
   */
  getAccount(accountId: string): BankAccount {
    // Check if account exists
    if (!this.eventStore.exists(accountId)) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Create aggregate
    const account = new BankAccount(accountId);

    // Load all events from EventStore
    const events = this.eventStore.getEvents(accountId);

    // Replay events to reconstruct state
    account.loadFromHistory(events);

    return account;
  }

  /**
   * Get account balance (cheap operation - computer from events)
   */
  getBalance(accountId: string): number {
    const account = this.getAccount(accountId);
    return account.getBalance();
  }

  /**
   * Get complete account state
   */
  getAccountState(accountId: string) {
    const account = this.getAccount(accountId);
    return account.getState();
  }

  /**
   * Get full event history for an account
   * Useful for:
   * - Audit trail
   * - Debugging
   * - Replication to other systems
   * - Time-travel (replay up to any point)
   */
  getEventHistory(accountId: string) {
    return this.eventStore.getEvents(accountId);
  }

  /**
   * Show event stream for debugging
   */
  showEventStream(accountId: string): void {
    const events = this.eventStore.getEvents(accountId);
    this.eventStore.getEventStream(accountId);
  }

  /**
   * Get all events globally (for monitoring/auditing)
   */
  getAllEvents() {
    return this.eventStore.getAllEvents();
  }
}
