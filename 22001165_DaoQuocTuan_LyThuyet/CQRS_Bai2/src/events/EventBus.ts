import { OrderEvent } from '../models';

/**
 * Event Handler type
 */
export type EventHandler = (event: OrderEvent) => void;

/**
 * EventBus - Simple in-memory event bus
 * Enables decoupling between CommandService and QueryService
 * through event-driven architecture
 */
export class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();

  /**
   * Subscribe to specific event type
   * @param eventType Event type to listen for
   * @param handler Callback function when event is published
   */
  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
    console.log(`✓ Subscribed to event: ${eventType}`);
  }

  /**
   * Publish event to all subscribers
   * @param event Event to publish
   */
  publish(event: OrderEvent): void {
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

  /**
   * Get all subscribers for debugging
   */
  getSubscribers(): Map<string, EventHandler[]> {
    return this.subscribers;
  }

  /**
   * Clear all subscribers
   */
  clear(): void {
    this.subscribers.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
