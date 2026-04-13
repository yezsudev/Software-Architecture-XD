import { BankAccountEvent } from './models';

/**
 * EventStore - Immutable event log
 * 
 * In Event Sourcing:
 * - Events are the source of truth
 * - Current state is computed from events
 * - Never delete events (audit trail)
 * - Only append new events
 * 
 * Production: Use PostgreSQL, MongoDB, EventStoreDB
 */
export class EventStore {
  // In-memory event log: aggregateId → events[]
  private eventLog = new Map<string, BankAccountEvent[]>();

  /**
   * Append event to log (immutable)
   * @param event - Event to store
   * @throws Error if aggregateId not valid
   */
  append(event: BankAccountEvent): void {
    if (!event.aggregateId) {
      throw new Error('Event must have aggregateId');
    }

    // Get or create event stream for this aggregate
    if (!this.eventLog.has(event.aggregateId)) {
      this.eventLog.set(event.aggregateId, []);
    }

    // Append (only append, never modify)
    this.eventLog.get(event.aggregateId)!.push(event);
    
    console.log(`[EventStore] Event appended: ${event.type} (${event.aggregateId})`);
  }

  /**
   * Get all events for an aggregate (for replaying)
   * @param aggregateId - Account ID
   * @returns Array of events in order
   */
  getEvents(aggregateId: string): BankAccountEvent[] {
    return this.eventLog.get(aggregateId) || [];
  }

  /**
   * Get events after a specific version (for catching up)
   * @param aggregateId - Account ID
   * @param fromVersion - Start from this event index
   * @returns Array of new events
   */
  getEventsSince(aggregateId: string, fromVersion: number): BankAccountEvent[] {
    const events = this.eventLog.get(aggregateId) || [];
    return events.slice(fromVersion);
  }

  /**
   * Get all events across all aggregates (for debugging/audit)
   */
  getAllEvents(): BankAccountEvent[] {
    const allEvents: BankAccountEvent[] = [];
    this.eventLog.forEach((events) => {
      allEvents.push(...events);
    });
    return allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get event count for an aggregate (for versioning)
   */
  getEventCount(aggregateId: string): number {
    return this.getEvents(aggregateId).length;
  }

  /**
   * Check if aggregate exists (has any events)
   */
  exists(aggregateId: string): boolean {
    return this.eventLog.has(aggregateId) && this.eventLog.get(aggregateId)!.length > 0;
  }

  /**
   * Clear all events (for testing only!)
   */
  clear(): void {
    this.eventLog.clear();
    console.log('[EventStore] All events cleared');
  }

  /**
   * Get event stream for debugging
   */
  getEventStream(aggregateId: string): BankAccountEvent[] {
    const events = this.getEvents(aggregateId);
    console.log(`\n=== Event Stream for ${aggregateId} ===`);
    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.type} @ ${event.timestamp.toISOString()}`);
      if (event.type === 'MoneyDeposited' || event.type === 'MoneyWithdrawn') {
        console.log(`   Amount: $${(event as any).amount}`);
      }
    });
    console.log('===============================\n');
    return events;
  }
}
