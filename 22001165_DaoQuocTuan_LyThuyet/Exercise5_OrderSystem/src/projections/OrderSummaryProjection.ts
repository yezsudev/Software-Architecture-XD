import { OrderEvent, OrderSummary, OrderItem, OrderCreatedEvent, ItemAddedEvent, ItemRemovedEvent } from '../models';

/**
 * OrderSummaryProjection — READ SIDE
 *
 * Maintains pre-computed OrderSummary objects.
 * Updated incrementally as events arrive — no replay for queries.
 *
 * Computed fields:
 * - totalPrice: sum(item.price * item.quantity)
 * - itemCount: distinct items in the order
 * - totalQuantity: sum of all quantities
 * - status: current order status
 */
export class OrderSummaryProjection {
  private store = new Map<string, OrderSummary>();

  project(event: OrderEvent): void {
    const id = event.aggregateId;

    switch (event.type) {
      case 'OrderCreated': {
        const e = event as OrderCreatedEvent;
        this.store.set(id, {
          orderId: id,
          customerId: e.customerId,
          status: 'draft',
          totalPrice: 0,
          itemCount: 0,
          totalQuantity: 0,
          items: [],
          createdAt: e.timestamp
        });
        break;
      }
      case 'ItemAdded': {
        const e = event as ItemAddedEvent;
        const summary = this.store.get(id);
        if (!summary) break;
        const existing = summary.items.find(i => i.itemId === e.itemId);
        if (existing) {
          existing.quantity += e.quantity;
        } else {
          summary.items.push({ itemId: e.itemId, name: e.name, price: e.price, quantity: e.quantity });
          summary.itemCount++;
        }
        // Recompute derived fields from items
        this.recompute(summary);
        break;
      }
      case 'ItemRemoved': {
        const e = event as ItemRemovedEvent;
        const summary = this.store.get(id);
        if (!summary) break;
        summary.items = summary.items.filter(i => i.itemId !== e.itemId);
        summary.itemCount = summary.items.length;
        this.recompute(summary);
        break;
      }
      case 'OrderConfirmed': {
        const summary = this.store.get(id);
        if (summary) { summary.status = 'confirmed'; summary.confirmedAt = event.timestamp; }
        break;
      }
      case 'OrderCancelled': {
        const summary = this.store.get(id);
        if (summary) { summary.status = 'cancelled'; summary.cancelledAt = event.timestamp; }
        break;
      }
    }

    console.log(`[Projection] OrderSummary updated for ${id} via ${event.type}`);
  }

  private recompute(summary: OrderSummary): void {
    summary.totalPrice = summary.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    summary.totalQuantity = summary.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  getSummary(orderId: string): OrderSummary | null { return this.store.get(orderId) ?? null; }
  getAllSummaries(): OrderSummary[] { return Array.from(this.store.values()); }
  has(orderId: string): boolean { return this.store.has(orderId); }

  rebuild(events: OrderEvent[]): void {
    this.store.clear();
    events.forEach(e => this.project(e));
    console.log(`[Projection] Rebuilt from ${events.length} events`);
  }
}
