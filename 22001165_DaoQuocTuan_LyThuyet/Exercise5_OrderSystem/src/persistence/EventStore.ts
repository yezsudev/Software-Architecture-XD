import { OrderEvent } from '../models';

/**
 * EventStore — Write side storage (append-only event log)
 * Notifies listeners after every append (for read-side projections)
 */
export class EventStore {
  private eventLog = new Map<string, OrderEvent[]>();
  private listeners: Array<(event: OrderEvent) => void> = [];

  subscribe(listener: (event: OrderEvent) => void): void {
    this.listeners.push(listener);
  }

  append(event: OrderEvent): void {
    if (!this.eventLog.has(event.aggregateId)) this.eventLog.set(event.aggregateId, []);
    this.eventLog.get(event.aggregateId)!.push(event);
    // Fan-out to all projection listeners
    this.listeners.forEach(fn => fn(event));
    console.log(`[EventStore] ${event.type} → ${event.aggregateId}`);
  }

  getEvents(orderId: string): OrderEvent[] { return this.eventLog.get(orderId) || []; }
  exists(orderId: string): boolean { return this.eventLog.has(orderId) && this.eventLog.get(orderId)!.length > 0; }
  getAllEvents(): OrderEvent[] {
    const all: OrderEvent[] = [];
    this.eventLog.forEach(events => all.push(...events));
    return all.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
