import { Order } from '../domain/Order';
import { EventStore } from '../persistence/EventStore';
import { OrderSummaryProjection } from '../projections/OrderSummaryProjection';
import {
  OrderEvent, OrderState, OrderSummary,
  ItemAddedEvent, ItemRemovedEvent
} from '../models';

/**
 * OrderService — Command Handler (Write Side)
 *
 * CQRS Separation:
 * - Commands → aggregate → events → EventStore (write side)
 * - Queries  → projection → OrderSummary (read side, no replay)
 *
 * Event flow:
 *   Command → Order.apply() → eventStore.append() → projection.project()
 */
export class OrderService {
  constructor(
    private eventStore: EventStore,
    private projection: OrderSummaryProjection
  ) {
    // Wire projection to EventStore events
    this.eventStore.subscribe(event => this.projection.project(event));
  }

  // ─── COMMANDS (Write Side) ─────────────────────────────────────────────────

  createOrder(orderId: string, customerId: string): Order {
    if (!orderId || !customerId) throw new Error('orderId and customerId required');
    if (this.eventStore.exists(orderId)) throw new Error('Order already exists');

    const order = new Order(orderId);
    const event: any = { type: 'OrderCreated', aggregateId: orderId, timestamp: new Date(), customerId };
    order.recordEvent(event);
    this.eventStore.append(event);
    order.markChangesAsCommitted();
    console.log(`[Service] Order created: ${orderId} for customer ${customerId}`);
    return order;
  }

  addItem(orderId: string, itemId: string, name: string, price: number, quantity: number): Order {
    if (price <= 0) throw new Error('Price must be positive');
    if (quantity <= 0) throw new Error('Quantity must be positive');

    const order = this.loadOrder(orderId);
    if (!order.canModify()) throw new Error(`Cannot add items to ${order.getStatus()} order`);

    const event: ItemAddedEvent = {
      type: 'ItemAdded', aggregateId: orderId, timestamp: new Date(),
      itemId, name, price, quantity
    };
    order.recordEvent(event);
    this.eventStore.append(event);
    order.markChangesAsCommitted();
    return order;
  }

  removeItem(orderId: string, itemId: string): Order {
    const order = this.loadOrder(orderId);
    if (!order.canModify()) throw new Error(`Cannot remove items from ${order.getStatus()} order`);
    if (!order.hasItem(itemId)) throw new Error(`Item ${itemId} not found in order`);

    const event: ItemRemovedEvent = {
      type: 'ItemRemoved', aggregateId: orderId, timestamp: new Date(), itemId
    };
    order.recordEvent(event);
    this.eventStore.append(event);
    order.markChangesAsCommitted();
    return order;
  }

  confirmOrder(orderId: string): Order {
    const order = this.loadOrder(orderId);
    if (!order.canModify()) throw new Error(`Cannot confirm ${order.getStatus()} order`);
    if (!order.hasItems()) throw new Error('Cannot confirm an empty order');

    const event: any = { type: 'OrderConfirmed', aggregateId: orderId, timestamp: new Date() };
    order.recordEvent(event);
    this.eventStore.append(event);
    order.markChangesAsCommitted();
    return order;
  }

  cancelOrder(orderId: string, reason: string): Order {
    const order = this.loadOrder(orderId);
    if (order.getStatus() === 'cancelled') throw new Error('Order already cancelled');

    const event: any = { type: 'OrderCancelled', aggregateId: orderId, timestamp: new Date(), reason };
    order.recordEvent(event);
    this.eventStore.append(event);
    order.markChangesAsCommitted();
    return order;
  }

  // ─── QUERIES (Read Side) ───────────────────────────────────────────────────

  /** Get order summary from READ MODEL — fast, no replay */
  getOrderSummary(orderId: string): OrderSummary {
    const summary = this.projection.getSummary(orderId);
    if (!summary) throw new Error(`Order not found: ${orderId}`);
    return summary;
  }

  getAllSummaries(): OrderSummary[] { return this.projection.getAllSummaries(); }

  /** Get full event history */
  getEventHistory(orderId: string): OrderEvent[] { return this.eventStore.getEvents(orderId); }

  /** Get order state from WRITE MODEL (requires replay) */
  getOrderState(orderId: string): OrderState { return this.loadOrder(orderId).getState(); }

  // ─── INTERNAL ─────────────────────────────────────────────────────────────

  private loadOrder(orderId: string): Order {
    if (!this.eventStore.exists(orderId)) throw new Error(`Order not found: ${orderId}`);
    const order = new Order(orderId);
    order.loadFromHistory(this.eventStore.getEvents(orderId));
    return order;
  }
}
