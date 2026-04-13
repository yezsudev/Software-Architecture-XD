import { v4 as uuidv4 } from 'uuid';
import {
  OrderEntity,
  CreateOrderCommand,
  CancelOrderCommand,
  OrderCreatedEvent,
  OrderCancelledEvent,
} from '../models';
import { EventBus } from '../events/EventBus';

/**
 * CommandService - Handles all write operations for orders
 * Publishes events when commands are executed
 * This enables QueryService to stay in sync via event bus
 */
export class CommandService {
  // In-memory storage for write model (OrderEntity)
  private orders: Map<string, OrderEntity> = new Map();

  constructor(private eventBus: EventBus) {}

  /**
   * Create a new order command
   * @param command Create order command
   * @returns Created OrderEntity
   */
  createOrder(command: CreateOrderCommand): OrderEntity {
    const id = uuidv4();
    const now = new Date();

    // Calculate total amount
    const totalAmount = command.items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    const order: OrderEntity = {
      id,
      customerId: command.customerId,
      totalAmount,
      items: command.items.map((item) => ({
        ...item,
        subtotal: item.quantity * item.unitPrice,
      })),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.orders.set(id, order);
    console.log(`✓ [CommandService] Created order: ${id}`);

    // Publish OrderCreatedEvent
    const event: OrderCreatedEvent = {
      type: 'ORDER_CREATED',
      orderId: id,
      customerId: command.customerId,
      totalAmount,
      itemCount: command.items.length,
      timestamp: now,
    };

    this.eventBus.publish(event);

    return order;
  }

  /**
   * Cancel an order
   * @param command Cancel order command
   * @returns Updated OrderEntity with cancelled status
   */
  cancelOrder(command: CancelOrderCommand): OrderEntity {
    const order = this.orders.get(command.id);

    if (!order) {
      throw new Error(`Order with id ${command.id} not found`);
    }

    if (order.status === 'cancelled') {
      throw new Error(`Order ${command.id} is already cancelled`);
    }

    if (order.status === 'confirmed') {
      throw new Error(`Cannot cancel confirmed order ${command.id}`);
    }

    const now = new Date();
    order.status = 'cancelled';
    order.updatedAt = now;
    order.cancelledAt = now;

    this.orders.set(command.id, order);
    console.log(`✓ [CommandService] Cancelled order: ${command.id}`);

    // Publish OrderCancelledEvent
    const event: OrderCancelledEvent = {
      type: 'ORDER_CANCELLED',
      orderId: command.id,
      reason: command.reason,
      timestamp: now,
    };

    this.eventBus.publish(event);

    return order;
  }

  /**
   * Get all orders from write model (for syncing to read model)
   * @returns Array of all OrderEntity
   */
  getAllOrders(): OrderEntity[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get order by id from write model
   * @param id Order id
   * @returns OrderEntity or null
   */
  getOrderById(id: string): OrderEntity | null {
    return this.orders.get(id) || null;
  }
}
