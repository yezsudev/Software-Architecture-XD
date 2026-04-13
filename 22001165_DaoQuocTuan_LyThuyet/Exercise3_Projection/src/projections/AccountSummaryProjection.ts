import { BankAccountEvent, AccountSummary, AccountCreatedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent } from '../models';

/**
 * AccountSummaryProjection — READ MODEL
 *
 * This is the "read side" of CQRS + Event Sourcing.
 *
 * How it works:
 * - Listens to events as they are written to EventStore
 * - Updates the AccountSummary immediately (projecting events into a view)
 * - Queries go directly to this store (no replay needed!)
 *
 * Benefits:
 * - Fast reads: no replay when querying
 * - Tailored fields: balance, totalDeposited, depositCount
 * - Can be rebuilt any time by replaying all events
 *
 * In production: this would be a separate database/service
 */
export class AccountSummaryProjection {
  // Read model storage: accountId → AccountSummary
  private store = new Map<string, AccountSummary>();

  /**
   * Apply an event to update the read model
   * Called every time a new event is appended
   */
  project(event: BankAccountEvent): void {
    const id = event.aggregateId;

    switch (event.type) {
      case 'AccountCreated': {
        const ce = event as AccountCreatedEvent;
        this.store.set(id, {
          accountId: id,
          accountHolder: ce.accountHolder,
          balance: ce.initialBalance,
          totalDeposited: 0,
          totalWithdrawn: 0,
          depositCount: 0,
          withdrawCount: 0,
          lastEventAt: ce.timestamp,
          isActive: true
        });
        break;
      }
      case 'MoneyDeposited': {
        const de = event as MoneyDepositedEvent;
        const summary = this.store.get(id);
        if (summary) {
          summary.balance += de.amount;
          summary.totalDeposited += de.amount;
          summary.depositCount++;
          summary.lastEventAt = de.timestamp;
        }
        break;
      }
      case 'MoneyWithdrawn': {
        const we = event as MoneyWithdrawnEvent;
        const summary = this.store.get(id);
        if (summary) {
          summary.balance -= we.amount;
          summary.totalWithdrawn += we.amount;
          summary.withdrawCount++;
          summary.lastEventAt = we.timestamp;
        }
        break;
      }
      case 'AccountClosed': {
        const summary = this.store.get(id);
        if (summary) {
          summary.isActive = false;
          summary.lastEventAt = event.timestamp;
        }
        break;
      }
    }

    console.log(`[Projection] Updated AccountSummary for ${id} via ${event.type}`);
  }

  /** Get summary for one account (fast — no replay!) */
  getSummary(accountId: string): AccountSummary | null {
    return this.store.get(accountId) ?? null;
  }

  /** Get all summaries */
  getAllSummaries(): AccountSummary[] {
    return Array.from(this.store.values());
  }

  /** Check if account exists in read model */
  has(accountId: string): boolean {
    return this.store.has(accountId);
  }

  /**
   * Rebuild projection from scratch using all stored events
   * Use this after restart or to fix inconsistency
   */
  rebuild(events: BankAccountEvent[]): void {
    this.store.clear();
    events.forEach(e => this.project(e));
    console.log(`[Projection] Rebuilt from ${events.length} events`);
  }
}
