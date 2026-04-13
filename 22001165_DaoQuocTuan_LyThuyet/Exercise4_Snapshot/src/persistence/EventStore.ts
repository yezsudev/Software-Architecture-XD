import { BankAccountEvent } from '../models';

export class EventStore {
  private eventLog = new Map<string, BankAccountEvent[]>();

  append(event: BankAccountEvent): void {
    if (!this.eventLog.has(event.aggregateId)) this.eventLog.set(event.aggregateId, []);
    this.eventLog.get(event.aggregateId)!.push(event);
    console.log(`[EventStore] #${this.getEventCount(event.aggregateId)} ${event.type} → ${event.aggregateId}`);
  }

  getEvents(aggregateId: string): BankAccountEvent[] { return this.eventLog.get(aggregateId) || []; }

  /**
   * Get events after a specific version
   * Used after snapshot load: only fetch events we haven't applied yet
   */
  getEventsSince(aggregateId: string, fromVersion: number): BankAccountEvent[] {
    return this.getEvents(aggregateId).slice(fromVersion);
  }

  exists(aggregateId: string): boolean {
    return this.eventLog.has(aggregateId) && this.eventLog.get(aggregateId)!.length > 0;
  }

  getEventCount(aggregateId: string): number { return this.getEvents(aggregateId).length; }
  getAllEvents(): BankAccountEvent[] {
    const all: BankAccountEvent[] = [];
    this.eventLog.forEach(events => all.push(...events));
    return all.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
