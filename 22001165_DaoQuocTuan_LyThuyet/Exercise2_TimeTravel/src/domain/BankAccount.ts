import {
  BankAccountEvent,
  AccountCreatedEvent,
  MoneyDepositedEvent,
  MoneyWithdrawnEvent,
  AccountClosedEvent,
  BankAccountState,
  TimestampedState
} from '../models';

/**
 * BankAccount Aggregate Root - Extended with Time Travel
 * 
 * New capabilities:
 * 1. getStateAt(index)   - Replay events up to an index → view past states
 * 2. getTimeline()       - See state at every event checkpoint
 * 3. undoLastEvent()     - Adds compensating event to "reverse" last action
 * 
 * Key principle:
 * - Events are immutable (never deleted)
 * - Undo is a NEW event, not an edit
 * - Time travel = partial replay
 */
export class BankAccount {
  private accountId: string;
  private state: BankAccountState;
  private changes: BankAccountEvent[] = [];
  private version: number = 0;

  constructor(accountId: string) {
    this.accountId = accountId;
    this.state = this.getInitialState();
  }

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
   * Apply a single event to build state
   */
  private apply(event: BankAccountEvent): void {
    switch (event.type) {
      case 'AccountCreated':
        const ce = event as AccountCreatedEvent;
        this.state.accountHolder = ce.accountHolder;
        this.state.balance = ce.initialBalance;
        this.state.isActive = true;
        this.state.createdAt = ce.timestamp;
        this.state.transactionCount = 0;
        break;

      case 'MoneyDeposited':
        this.state.balance += (event as MoneyDepositedEvent).amount;
        this.state.transactionCount++;
        break;

      case 'MoneyWithdrawn':
        this.state.balance -= (event as MoneyWithdrawnEvent).amount;
        this.state.transactionCount++;
        break;

      case 'AccountClosed':
        this.state.isActive = false;
        this.state.closedAt = event.timestamp;
        break;
    }
  }

  /**
   * Replay events to reconstruct current state
   */
  loadFromHistory(events: BankAccountEvent[]): void {
    this.state = this.getInitialState();
    events.forEach(e => this.apply(e));
    this.version = events.length;
  }

  // ─── TIME TRAVEL METHODS ──────────────────────────────────────────────────

  /**
   * Get state at a specific event index
   * Hint: replay until index (not all events)
   *
   * Example:
   *   events = [Created, Deposit, Withdraw, Deposit]
   *   getStateAt(1) → state after "Deposit" (index 1)
   *
   * @param allEvents - Full event stream
   * @param index - Zero-based event index to stop at (inclusive)
   * @returns State at that point in time
   */
  static getStateAt(accountId: string, allEvents: BankAccountEvent[], index: number): BankAccountState {
    if (index < 0 || index >= allEvents.length) {
      throw new Error(`Invalid index: ${index}. Events: 0..${allEvents.length - 1}`);
    }

    // Replay up to (and including) the given index
    const eventsUpToIndex = allEvents.slice(0, index + 1);

    const account = new BankAccount(accountId);
    account.loadFromHistory(eventsUpToIndex);

    return account.getState();
  }

  /**
   * Get a timeline: state snapshot after every event
   * Useful for visualising how state evolved
   *
   * @param allEvents - Full event stream
   * @returns Array of { eventIndex, event, stateAfterEvent }
   */
  static getTimeline(accountId: string, allEvents: BankAccountEvent[]): TimestampedState[] {
    return allEvents.map((event, index) => {
      const state = BankAccount.getStateAt(accountId, allEvents, index);
      return {
        eventIndex: index,
        event: {
          type: event.type,
          timestamp: event.timestamp,
          amount: (event as any).amount,
          description: (event as any).description
        },
        stateAfterEvent: state
      };
    });
  }

  // ─── REGULAR METHODS ──────────────────────────────────────────────────────

  recordEvent(event: BankAccountEvent): void {
    this.apply(event);
    this.changes.push(event);
  }

  getUncommittedChanges(): BankAccountEvent[] {
    return this.changes;
  }

  markChangesAsCommitted(): void {
    this.changes = [];
    this.version++;
  }

  getState(): BankAccountState { return { ...this.state }; }
  getBalance(): number { return this.state.balance; }
  getAccountHolder(): string { return this.state.accountHolder; }
  isActive(): boolean { return this.state.isActive; }
  getTransactionCount(): number { return this.state.transactionCount; }
  getVersion(): number { return this.version; }
  canWithdraw(amount: number): boolean { return this.state.balance >= amount; }
}
