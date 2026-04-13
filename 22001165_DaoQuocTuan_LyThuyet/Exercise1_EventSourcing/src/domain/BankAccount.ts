import {
  BankAccountEvent,
  AccountCreatedEvent,
  MoneyDepositedEvent,
  MoneyWithdrawnEvent,
  AccountClosedEvent,
  BankAccountState
} from './models';

/**
 * BankAccount Aggregate Root
 * 
 * Core Event Sourcing Pattern:
 * - State is NEVER stored directly
 * - State is computed from events using apply()
 * - Full state reconstruction happens via replay()
 * - Each event is immutable fact
 * 
 * Key Methods:
 * - apply(event): Update state based on single event
 * - replay(events): Reconstruct entire state from event history
 * - getState(): Return current computed state
 * - getBalance(): Return current balance (derived from state)
 */
export class BankAccount {
  private accountId: string;
  private state: BankAccountState;
  private changes: BankAccountEvent[] = [];
  private version: number = 0;

  /**
   * Initialize aggregate (before any events)
   */
  constructor(accountId: string) {
    this.accountId = accountId;
    this.state = this.getInitialState();
  }

  /**
   * Get initial empty state (account doesn't exist yet)
   */
  private getInitialState(): BankAccountState {
    return {
      accountId: this.accountId,
      accountHolder: '',
      balance: 0,
      isActive: false,
      createdAt: new Date(),
      transactionCount: 0
    };
  }

  /**
   * Apply a single event to state
   * 
   * This is the HEART of Event Sourcing:
   * Current State = Initial State + apply(event1) + apply(event2) + ...
   * 
   * @param event - Single event to apply
   */
  private apply(event: BankAccountEvent): void {
    switch (event.type) {
      case 'AccountCreated':
        const createdEvent = event as AccountCreatedEvent;
        this.state = {
          ...this.state,
          accountHolder: createdEvent.accountHolder,
          balance: createdEvent.initialBalance,
          isActive: true,
          createdAt: createdEvent.timestamp,
          transactionCount: 0
        };
        console.log(`[apply] AccountCreated: ${createdEvent.accountHolder} (init balance: $${createdEvent.initialBalance})`);
        break;

      case 'MoneyDeposited':
        const depositEvent = event as MoneyDepositedEvent;
        this.state.balance += depositEvent.amount;
        this.state.transactionCount++;
        console.log(`[apply] MoneyDeposited: +$${depositEvent.amount} (balance: $${this.state.balance})`);
        break;

      case 'MoneyWithdrawn':
        const withdrawEvent = event as MoneyWithdrawnEvent;
        this.state.balance -= withdrawEvent.amount;
        this.state.transactionCount++;
        console.log(`[apply] MoneyWithdrawn: -$${withdrawEvent.amount} (balance: $${this.state.balance})`);
        break;

      case 'AccountClosed':
        const closedEvent = event as AccountClosedEvent;
        this.state.isActive = false;
        this.state.closedAt = closedEvent.timestamp;
        console.log(`[apply] AccountClosed: ${closedEvent.closureReason}`);
        break;

      default:
        console.warn(`[apply] Unknown event type: ${(event as any).type}`);
    }
  }

  /**
   * Replay all events to reconstruct current state
   * 
   * This is how we recover state without storing it:
   * 1. Start with empty state
   * 2. Load all events from EventStore
   * 3. Apply each event in order
   * 4. Final state is current state
   * 
   * @param events - All events for this aggregate
   */
  loadFromHistory(events: BankAccountEvent[]): void {
    // Reset state
    this.state = this.getInitialState();
    
    console.log(`\n[Replay] Loading ${events.length} events for ${this.accountId}`);
    
    if (events.length === 0) {
      console.log('[Replay] No events found - account does not exist\n');
      return;
    }

    // Apply each event in order (this is replay)
    events.forEach((event, index) => {
      console.log(`  ${index + 1}/${events.length}: ${event.type}`);
      this.apply(event);
    });

    this.version = events.length;
    console.log(`[Replay] Complete - State reconstructed (v${this.version})\n`);
  }

  /**
   * Record a new event that happened
   * This adds to uncommitted changes (will be persisted later)
   */
  recordEvent(event: BankAccountEvent): void {
    this.apply(event);
    this.changes.push(event);
  }

  /**
   * Get uncommitted changes (for persisting to EventStore)
   */
  getUncommittedChanges(): BankAccountEvent[] {
    return this.changes;
  }

  /**
   * Clear uncommitted changes (after persisting)
   */
  markChangesAsCommitted(): void {
    this.changes = [];
    this.version++;
  }

  /**
   * Get current account state (computed from events)
   * 
   * IMPORTANT: This state is NOT stored in database
   * It's computed on-the-fly from the event stream
   * Safe to compute anytime (pure function of events)
   */
  getState(): BankAccountState {
    return { ...this.state };
  }

  /**
   * Get current balance (computed from events)
   * Balance = sum(deposits) - sum(withdrawals)
   */
  getBalance(): number {
    return this.state.balance;
  }

  /**
   * Get account holder name
   */
  getAccountHolder(): string {
    return this.state.accountHolder;
  }

  /**
   * Check if account is active
   */
  isActive(): boolean {
    return this.state.isActive;
  }

  /**
   * Get transaction count
   */
  getTransactionCount(): number {
    return this.state.transactionCount;
  }

  /**
   * Get version (total events applied)
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Validate balance is not negative
   */
  canWithdraw(amount: number): boolean {
    return this.state.balance >= amount;
  }

  /**
   * Full state for debugging
   */
  toString(): string {
    return `
BankAccount(${this.accountId}):
  Holder: ${this.state.accountHolder}
  Balance: $${this.state.balance.toFixed(2)}
  Active: ${this.state.isActive}
  Transactions: ${this.state.transactionCount}
  Created: ${this.state.createdAt.toISOString()}
  Version: ${this.version}
    `;
  }
}
