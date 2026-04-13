import { OrderView, OrderEntity, OrderCreatedEvent, OrderCancelledEvent } from '../models';
import { EventBus } from '../events/EventBus';

/**
 * QueryService - Handles all read operations
 * Maintains Read Model (OrderView)
 * Listens to events from EventBus to stay in sync with Write Model
 */
export class QueryService {
  // Read model cache (OrderView)
  private orderViews: Map<string, OrderView> = new Map();

  constructor(private eventBus: EventBus) {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   * This demonstrates event-driven synchronization
   */
  private setupEventListeners(): void {
    // Listen to ORDER_CREATED events
    this.eventBus.subscribe('ORDER_CREATED', (event) => {
      const createdEvent = event as OrderCreatedEvent;
      console.log(`📥 [QueryService] Received ORDER_CREATED event: ${createdEvent.orderId}`);

      const view: OrderView = {
        id: createdEvent.orderId,
        customerId: createdEvent.customerId,
        totalAmount: createdEvent.totalAmount,
        itemCount: createdEvent.itemCount,
        status: 'pending',
        statusLabel: 'Chờ xử lý',
        createdAt: createdEvent.timestamp.toISOString(),
        updatedAt: createdEvent.timestamp.toISOString(),
      };

      this.orderViews.set(createdEvent.orderId, view);
    });

    // Listen to ORDER_CANCELLED events
    this.eventBus.subscribe('ORDER_CANCELLED', (event) => {
      const cancelledEvent = event as OrderCancelledEvent;
      console.log(`📥 [QueryService] Received ORDER_CANCELLED event: ${cancelledEvent.orderId}`);

      const view = this.orderViews.get(cancelledEvent.orderId);
      if (view) {
        view.status = 'cancelled';
        view.statusLabel = 'Đã hủy';
        view.updatedAt = cancelledEvent.timestamp.toISOString();
        view.cancelledAt = cancelledEvent.timestamp.toISOString();
        this.orderViews.set(cancelledEvent.orderId, view);
      }
    });

    console.log('✓ [QueryService] Event listeners initialized');
  }

  /**
   * Sync data from write model to read model
   * Can be used for initial load
   * @param orders Array of OrderEntity from write model
   */
  syncFromWriteModel(orders: OrderEntity[]): void {
    this.orderViews.clear();

    orders.forEach((order) => {
      const view = this.entityToView(order);
      this.orderViews.set(order.id, view);
    });

    console.log(`✓ [QueryService] Synced ${orders.length} orders to read model`);
  }

  /**
   * Convert OrderEntity (write model) to OrderView (read model)
   * @param entity OrderEntity from write model
   * @returns OrderView for read operations
   */
  private entityToView(entity: OrderEntity): OrderView {
    const statusLabels: { [key: string]: string } = {
      pending: 'Chờ xử lý',
      confirmed: 'Xác nhận',
      cancelled: 'Đã hủy',
    };

    return {
      id: entity.id,
      customerId: entity.customerId,
      totalAmount: entity.totalAmount,
      itemCount: entity.items.length,
      status: entity.status,
      statusLabel: statusLabels[entity.status] || entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      cancelledAt: entity.cancelledAt ? entity.cancelledAt.toISOString() : undefined,
    };
  }

  /**
   * Get all orders from read model
   * @returns Array of OrderView
   */
  getAllOrders(): OrderView[] {
    return Array.from(this.orderViews.values());
  }

  /**
   * Get order by id from read model
   * @param id Order id
   * @returns OrderView or null if not found
   */
  getOrderById(id: string): OrderView | null {
    return this.orderViews.get(id) || null;
  }

  /**
   * Get statistics from read model
   * Example of query-side optimization
   * @returns Statistics object
   */
  getStatistics(): {
    total: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    totalRevenue: number;
  } {
    const orders = Array.from(this.orderViews.values());

    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    };
  }
}
