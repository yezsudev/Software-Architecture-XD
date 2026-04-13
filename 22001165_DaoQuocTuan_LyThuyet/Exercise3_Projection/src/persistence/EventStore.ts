import { BankAccountEvent, AccountSummary, AccountCreatedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent } from '../models';
import { AccountSummaryProjection } from '../projections/AccountSummaryProjection';

/**
 * EventStore — Write model storage
 * Notifies the Projection after every append (projection listener)
 */
export class EventStore {
  private eventLog = new Map<string, BankAccountEvent[]>();
  private listeners: Array<(event: BankAccountEvent) => void> = [];

  /**
   * Subscribe a projection to receive every new event
   * This is how the read model stays in sync with the write model
   */
  subscribe(listener: (event: BankAccountEvent) => void): void {
    this.listeners.push(listener);
  }

  append(event: BankAccountEvent): void {
    if (!this.eventLog.has(event.aggregateId)) {
      this.eventLog.set(event.aggregateId, []);
    }
    this.eventLog.get(event.aggregateId)!.push(event);

    // Notify all projection listeners (CQRS: write → read sync)
    this.listeners.forEach(listener => listener(event));

    console.log(`[EventStore] ${event.type} → ${event.aggregateId}`);
  }

  getEvents(aggregateId: string): BankAccountEvent[] {
    return this.eventLog.get(aggregateId) || [];
  }

  getAllEvents(): BankAccountEvent[] {
    const all: BankAccountEvent[] = [];
    this.eventLog.forEach(events => all.push(...events));
    return all.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  exists(aggregateId: string): boolean {
    return this.eventLog.has(aggregateId) && this.eventLog.get(aggregateId)!.length > 0;
  }
}
