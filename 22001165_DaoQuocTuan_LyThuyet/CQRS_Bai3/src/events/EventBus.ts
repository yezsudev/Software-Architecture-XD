import { TicketEvent } from '../models';

/**
 * Event Handler type
 */
export type EventHandler = (event: TicketEvent) => void;

/**
 * EventBus - Event-driven architecture broker
 * Enables decoupling between CommandService and QueryService
 */
export class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
    console.log(`✓ Subscribed to event: ${eventType}`);
  }

  publish(event: TicketEvent): void {
    const eventType = event.type;
    console.log(`📢 Publishing event: ${eventType}`);

    const handlers = this.subscribers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          console.error(`❌ Error handling event ${eventType}:`, error);
        }
      });
    }
  }

  getSubscribers(): Map<string, EventHandler[]> {
    return this.subscribers;
  }

  clear(): void {
    this.subscribers.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
