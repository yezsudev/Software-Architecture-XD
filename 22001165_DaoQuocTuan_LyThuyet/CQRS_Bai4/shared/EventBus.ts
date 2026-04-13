/**
 * Shared EventBus - Message Broker Simulation (Kafka/RabbitMQ)
 * 
 * This is a GLOBAL event broker that both microservices connect to.
 * In production, use Kafka, RabbitMQ, or AWS SNS/SQS.
 * 
 * Pattern:
 * 1. CommandService publishes events to EventBus
 * 2. QueryService subscribes to EventBus
 * 3. Both services are decoupled
 */

export interface EventHandler {
  (event: any): void | Promise<void>;
}

export class EventBus {
  // Global subscribers map: eventType → [handlers]
  private static subscribers = new Map<string, EventHandler[]>();

  /**
   * Subscribe to an event type
   * Can be called from any microservice
   * 
   * @param eventType - Event type (e.g., 'TICKET_BOOKED')
   * @param handler - Function to call when event is published
   */
  static subscribe(eventType: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
    console.log(`✓ EventBus: Subscriber registered for "${eventType}"`);
  }

  /**
   * Publish an event to all subscribers
   * Can be called from any microservice
   * 
   * @param event - Event object with 'type' property
   */
  static publish(event: any): void {
    const eventType = event.type;
    const handlers = this.subscribers.get(eventType) || [];

    console.log(`📢 EventBus: Publishing "${eventType}" event to ${handlers.length} subscribers`);

    // Call each handler, isolated so one error doesn't affect others
    handlers.forEach((handler, index) => {
      try {
        handler(event);
        console.log(`  ✓ Handler ${index + 1} processed event`);
      } catch (error) {
        console.error(`  ✗ Handler ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /**
   * Get all subscribers (for debugging)
   */
  static getSubscribers(): Map<string, EventHandler[]> {
    return this.subscribers;
  }

  /**
   * Clear all subscribers (for testing)
   */
  static clear(): void {
    this.subscribers.clear();
    console.log('✓ EventBus cleared');
  }
}
