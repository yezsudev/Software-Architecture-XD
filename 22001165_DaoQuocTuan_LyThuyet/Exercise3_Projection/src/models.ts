/** Same events as Exercise 1 */
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

/** Write-side state (aggregate, not stored directly) */
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
 * Read-side projection (stored, fast to query)
 *
 * Built from events as they are appended.
 * Separate from write model — optimized for reading.
 */
export interface AccountSummary {
  accountId: string;
  accountHolder: string;
  balance: number;          // Current balance
  totalDeposited: number;   // Sum of all deposits
  totalWithdrawn: number;   // Sum of all withdrawals
  depositCount: number;     // Number of deposits
  withdrawCount: number;    // Number of withdrawals
  lastEventAt: Date;        // Last activity timestamp
  isActive: boolean;
}
