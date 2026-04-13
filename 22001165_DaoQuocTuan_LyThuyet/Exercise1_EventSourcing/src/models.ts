/**
 * Domain Events for Bank Account
 * Events are immutable records of what happened
 */

export interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId: string;  // Bank account ID
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
 * Bank Account State
 * Computed from events (not stored directly)
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
 * Command: Intent to perform action
 */
export interface DepositMoneyCommand {
  accountId: string;
  amount: number;
  description?: string;
}

export interface WithdrawMoneyCommand {
  accountId: string;
  amount: number;
  description?: string;
}
