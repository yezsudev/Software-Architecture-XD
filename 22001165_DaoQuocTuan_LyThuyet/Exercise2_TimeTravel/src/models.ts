/**
 * Domain Events for Bank Account (same as Exercise 1)
 */
export interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId: string;
  _undone?: boolean;  // Soft undo marker
}

export interface AccountCreatedEvent extends DomainEvent {
  type: 'AccountCreated';
  accountHolder: string;
  initialBalance: number;
}

export interface MoneyDepositedEvent extends DomainEvent {
  type: 'MoneyDeposited';
  amount: number;
  description?: string;
}

export interface MoneyWithdrawnEvent extends DomainEvent {
  type: 'MoneyWithdrawn';
  amount: number;
  description?: string;
}

export interface AccountClosedEvent extends DomainEvent {
  type: 'AccountClosed';
  closureReason: string;
}

export type BankAccountEvent =
  | AccountCreatedEvent
  | MoneyDepositedEvent
  | MoneyWithdrawnEvent
  | AccountClosedEvent;

/**
 * State at a specific point in time
 */
export interface BankAccountState {
  accountId: string;
  accountHolder: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  closedAt?: Date;
  transactionCount: number;
}

/**
 * Time Travel: State at a specific event index
 */
export interface TimestampedState {
  eventIndex: number;
  event: {
    type: string;
    timestamp: Date;
    amount?: number;
    description?: string;
  };
  stateAfterEvent: BankAccountState;
}
