import {
  OrderEvent, OrderCreatedEvent, ItemAddedEvent, ItemRemovedEvent,
  OrderConfirmedEvent, OrderCancelledEvent, OrderState, OrderItem, OrderStatus
} from '../models';

/**
 * Order Aggregate Root — Write Side
 *
 * Encapsulates order business logic:
 * - Cannot add items to confirmed/cancelled orders
 * - Cannot confirm an empty order
 * - Cannot remove item that doesn't exist
 *
 * State is computed from events via apply()
 */
export class Order {
  private state: OrderState;
  private changes: OrderEvent[] = [];

  constructor(orderId: string) {
    this.state = {
      orderId,
      customerId: '',
      status: 'draft',
      items: [],
      createdAt: new Date()
    };
  }

  private apply(event: OrderEvent): void {
    switch (event.type) {
      case 'OrderCreated': {
        const e = event as OrderCreatedEvent;
        this.state.customerId = e.customerId;
        this.state.createdAt = e.timestamp;
        this.state.status = 'draft';
        break;
      }
      case 'ItemAdded': {
        const e = event as ItemAddedEvent;
        const existing = this.state.items.find(i => i.itemId === e.itemId);
        if (existing) {
          existing.quantity += e.quantity;  // Increase quantity if item exists
        } else {
          this.state.items.push({ itemId: e.itemId, name: e.name, price: e.price, quantity: e.quantity });
        }
        break;
      }
      case 'ItemRemoved': {
        const e = event as ItemRemovedEvent;
        this.state.items = this.state.items.filter(i => i.itemId !== e.itemId);
        break;
      }
      case 'OrderConfirmed': {
        this.state.status = 'confirmed';
        this.state.confirmedAt = event.timestamp;
        break;
      }
      case 'OrderCancelled': {
        this.state.status = 'cancelled';
        this.state.cancelledAt = event.timestamp;
        break;
      }
    }
  }

  loadFromHistory(events: OrderEvent[]): void {
    const orderId = this.state.orderId;
    this.state = { orderId, customerId: '', status: 'draft', items: [], createdAt: new Date() };
    events.forEach(e => this.apply(e));
  }

  recordEvent(event: OrderEvent): void {
    this.apply(event);
    this.changes.push(event);
  }

  // ─── BUSINESS RULE CHECKS ──────────────────────────────────────────────────

  canModify(): boolean { return this.state.status === 'draft'; }
  hasItem(itemId: string): boolean { return this.state.items.some(i => i.itemId === itemId); }
  hasItems(): boolean { return this.state.items.length > 0; }
  getTotalPrice(): number { return this.state.items.reduce((sum, i) => sum + i.price * i.quantity, 0); }

  // ─── ACCESSORS ────────────────────────────────────────────────────────────

  getUncommittedChanges(): OrderEvent[] { return this.changes; }
  markChangesAsCommitted(): void { this.changes = []; }
  getState(): OrderState { return { ...this.state, items: [...this.state.items] }; }
  getOrderId(): string { return this.state.orderId; }
  getStatus(): OrderStatus { return this.state.status; }
}
