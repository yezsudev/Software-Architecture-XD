import { BankAccountEvent } from '../models';

/**
 * EventStore - Immutable append-only event log
 * Extended for Time Travel with index-based access
 */
export class EventStore {
  private eventLog = new Map<string, BankAccountEvent[]>();

  append(event: BankAccountEvent): void {
    if (!this.eventLog.has(event.aggregateId)) {
      this.eventLog.set(event.aggregateId, []);
    }
    this.eventLog.get(event.aggregateId)!.push(event);
    console.log(`[EventStore] #${this.getEventCount(event.aggregateId)} ${event.type} → ${event.aggregateId}`);
  }

  getEvents(aggregateId: string): BankAccountEvent[] {
    return this.eventLog.get(aggregateId) || [];
  }

  /**
   * Get events starting from a specific version (for time-travel / snapshot)
   */
  getEventsSince(aggregateId: string, fromVersion: number): BankAccountEvent[] {
    const events = this.eventLog.get(aggregateId) || [];
    return events.slice(fromVersion);
  }

  /**
   * Get event at specific index (for undo inspection)
   */
  getEventAt(aggregateId: string, index: number): BankAccountEvent | null {
    const events = this.getEvents(aggregateId);
    return events[index] ?? null;
  }

  exists(aggregateId: string): boolean {
    return this.eventLog.has(aggregateId) && this.eventLog.get(aggregateId)!.length > 0;
  }

  getEventCount(aggregateId: string): number {
    return this.getEvents(aggregateId).length;
  }

  getAllEvents(): BankAccountEvent[] {
    const all: BankAccountEvent[] = [];
    this.eventLog.forEach(events => all.push(...events));
    return all.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  clear(): void {
    this.eventLog.clear();
  }
}
