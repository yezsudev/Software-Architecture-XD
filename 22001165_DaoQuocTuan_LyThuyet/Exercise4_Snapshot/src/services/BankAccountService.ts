import { BankAccount } from '../domain/BankAccount';
import { EventStore } from '../persistence/EventStore';
import { SnapshotStore } from '../persistence/SnapshotStore';
import { BankAccountEvent, BankAccountState, Snapshot, MoneyDepositedEvent, MoneyWithdrawnEvent } from '../models';

/**
 * Snapshot frequency — take snapshot every N events
 * Low value (e.g. 3) to demonstrate snapshots quickly in testing
 * Production: typically 50 or 100
 */
const SNAPSHOT_EVERY = 3;

/**
 * BankAccountService with Snapshot Optimization
 *
 * Loading strategy:
 *   1. Check SnapshotStore for latest snapshot
 *   2a. Snapshot found → load state + apply ONLY events after snapshot (delta)
 *   2b. No snapshot   → full replay from event[0]
 *   3. After write, check if snapshot threshold reached → save snapshot
 */
export class BankAccountService {
  constructor(
    private eventStore: EventStore,
    private snapshotStore: SnapshotStore
  ) {}

  // ─── COMMANDS ─────────────────────────────────────────────────────────────

  createAccount(accountId: string, accountHolder: string, initialBalance = 0): BankAccount {
    if (!accountId || !accountHolder) throw new Error('accountId and accountHolder required');
    if (initialBalance < 0) throw new Error('Initial balance cannot be negative');
    if (this.eventStore.exists(accountId)) throw new Error('Account already exists');

    const account = new BankAccount(accountId);
    const event: any = { type: 'AccountCreated', aggregateId: accountId, timestamp: new Date(), accountHolder, initialBalance };
    account.recordEvent(event);
    this.eventStore.append(event);
    account.markChangesAsCommitted();
    this.checkAndSnapshot(accountId, account);
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
    this.eventStore.append(event);
    account.markChangesAsCommitted();
    this.checkAndSnapshot(accountId, account);
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
    this.eventStore.append(event);
    account.markChangesAsCommitted();
    this.checkAndSnapshot(accountId, account);
    return account;
  }

  // ─── SNAPSHOT-OPTIMIZED LOAD ───────────────────────────────────────────────

  /**
   * Load account with snapshot optimization
   *
   * Strategy:
   *   snapshot found → load snapshot + replay events since snapshot version
   *   no snapshot    → full replay from event[0]
   */
  loadAccount(accountId: string): BankAccount {
    if (!this.eventStore.exists(accountId)) throw new Error(`Account not found: ${accountId}`);

    const account = new BankAccount(accountId);
    const snapshot = this.snapshotStore.getLatest(accountId);

    if (snapshot) {
      // Optimized: load from snapshot + only new events
      const totalEvents = this.eventStore.getEventCount(accountId);
      const eventsAfterSnapshot = this.eventStore.getEventsSince(accountId, snapshot.version);

      console.log(`\n[Load] Using snapshot v${snapshot.version}, replaying ${eventsAfterSnapshot.length} delta events (skipped ${snapshot.version} events)`);

      account.loadFromSnapshot(snapshot.state, snapshot.version);
      if (eventsAfterSnapshot.length > 0) {
        account.applyDeltaEvents(eventsAfterSnapshot);
      }
    } else {
      // Fallback: full replay from beginning
      const allEvents = this.eventStore.getEvents(accountId);
      console.log(`\n[Load] No snapshot, full replay of ${allEvents.length} events`);
      account.loadFromHistory(allEvents);
    }

    return account;
  }

  /**
   * Check if we should save a snapshot after current version
   * Auto-triggers every SNAPSHOT_EVERY events
   */
  private checkAndSnapshot(accountId: string, account: BankAccount): void {
    const totalEvents = this.eventStore.getEventCount(accountId);

    if (totalEvents % SNAPSHOT_EVERY === 0) {
      this.snapshotStore.save(accountId, totalEvents, account.getState());
      console.log(`[Service] Auto-snapshot at event #${totalEvents}`);
    }
  }

  /**
   * Force-create a snapshot right now
   */
  forceSnapshot(accountId: string): Snapshot {
    const account = this.loadAccount(accountId);
    const version = this.eventStore.getEventCount(accountId);
    this.snapshotStore.save(accountId, version, account.getState());
    return this.snapshotStore.getLatest(accountId)!;
  }

  /**
   * Delete snapshot (force full replay on next load - for testing)
   */
  deleteSnapshot(accountId: string): void {
    this.snapshotStore.delete(accountId);
    console.log(`[Service] Snapshot deleted for ${accountId}`);
  }

  // ─── READS ────────────────────────────────────────────────────────────────

  getAccountState(accountId: string): BankAccountState { return this.loadAccount(accountId).getState(); }
  getBalance(accountId: string): number { return this.loadAccount(accountId).getBalance(); }
  getEventHistory(accountId: string): BankAccountEvent[] { return this.eventStore.getEvents(accountId); }
  getEventCount(accountId: string): number { return this.eventStore.getEventCount(accountId); }
  getLatestSnapshot(accountId: string): Snapshot | null { return this.snapshotStore.getLatest(accountId); }
  getAllSnapshots(): Snapshot[] { return this.snapshotStore.getAllSnapshots(); }
  getSnapshotEvery(): number { return SNAPSHOT_EVERY; }
}
