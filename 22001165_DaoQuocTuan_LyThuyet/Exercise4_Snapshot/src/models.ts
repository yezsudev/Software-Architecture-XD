export interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId: string;
}

export interface AccountCreatedEvent extends DomainEvent { type: 'AccountCreated'; accountHolder: string; initialBalance: number; }
export interface MoneyDepositedEvent extends DomainEvent { type: 'MoneyDeposited'; amount: number; description?: string; }
export interface MoneyWithdrawnEvent extends DomainEvent { type: 'MoneyWithdrawn'; amount: number; description?: string; }
export interface AccountClosedEvent extends DomainEvent { type: 'AccountClosed'; closureReason: string; }

export type BankAccountEvent = AccountCreatedEvent | MoneyDepositedEvent | MoneyWithdrawnEvent | AccountClosedEvent;

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
 * Snapshot: stored state at a specific event version
 * Allows replay to start from snapshot instead of event[0]
 */
export interface Snapshot {
  accountId: string;
  version: number;      // Number of events applied when snapshot was taken
  state: BankAccountState;
  createdAt: Date;
}
