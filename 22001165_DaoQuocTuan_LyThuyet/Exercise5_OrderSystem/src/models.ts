// ─── DOMAIN EVENTS (Write Side) ──────────────────────────────────────────────

export interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId: string;  // Order ID
}

export interface OrderCreatedEvent extends DomainEvent {
  type: 'OrderCreated';
  customerId: string;
}

export interface ItemAddedEvent extends DomainEvent {
  type: 'ItemAdded';
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ItemRemovedEvent extends DomainEvent {
  type: 'ItemRemoved';
  itemId: string;
}

export interface OrderConfirmedEvent extends DomainEvent {
  type: 'OrderConfirmed';
}

export interface OrderCancelledEvent extends DomainEvent {
  type: 'OrderCancelled';
  reason: string;
}

export type OrderEvent =
  | OrderCreatedEvent
  | ItemAddedEvent
  | ItemRemovedEvent
  | OrderConfirmedEvent
  | OrderCancelledEvent;

// ─── WRITE MODEL (Aggregate State) ────────────────────────────────────────────

export type OrderStatus = 'draft' | 'confirmed' | 'cancelled';

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderState {
  orderId: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
}

// ─── READ MODEL (Projection) ───────────────────────────────────────────────────

/**
 * OrderSummary — pre-computed read model
 * Built from events, updated incrementally
 * Used for fast queries without replay
 */
export interface OrderSummary {
  orderId: string;
  customerId: string;
  status: OrderStatus;
  totalPrice: number;       // sum(item.price * item.quantity)
  itemCount: number;        // number of distinct items
  totalQuantity: number;    // sum of all quantities
  items: OrderItem[];
  createdAt: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
}

// ─── COMMANDS ─────────────────────────────────────────────────────────────────

export interface CreateOrderCommand { orderId: string; customerId: string; }
export interface AddItemCommand { orderId: string; itemId: string; name: string; price: number; quantity: number; }
export interface RemoveItemCommand { orderId: string; itemId: string; }
export interface ConfirmOrderCommand { orderId: string; }
export interface CancelOrderCommand { orderId: string; reason: string; }
