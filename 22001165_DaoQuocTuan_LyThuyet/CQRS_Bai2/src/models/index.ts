/**
 * Write Model - OrderEntity
 * Used for write operations (create, cancel)
 */
export interface OrderEntity {
  id: string;
  customerId: string;
  totalAmount: number;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
}

/**
 * Order item in the order
 */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Read Model - OrderView
 * Used for read operations (get list)
 * Optimized for queries with derived fields
 */
export interface OrderView {
  id: string;
  customerId: string;
  totalAmount: number;
  itemCount: number;
  status: string;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
}

/**
 * Command DTOs
 */
export interface CreateOrderCommand {
  customerId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface CancelOrderCommand {
  id: string;
  reason?: string;
}

/**
 * Events - Emitted from CommandService
 */
export type OrderEvent = OrderCreatedEvent | OrderCancelledEvent;

export interface OrderCreatedEvent {
  type: 'ORDER_CREATED';
  orderId: string;
  customerId: string;
  totalAmount: number;
  itemCount: number;
  timestamp: Date;
}

export interface OrderCancelledEvent {
  type: 'ORDER_CANCELLED';
  orderId: string;
  reason?: string;
  timestamp: Date;
}
