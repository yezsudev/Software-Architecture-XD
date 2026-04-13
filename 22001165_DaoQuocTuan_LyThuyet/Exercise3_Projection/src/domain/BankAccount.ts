import { BankAccountEvent, AccountCreatedEvent, MoneyDepositedEvent, MoneyWithdrawnEvent, BankAccountState } from '../models';

export class BankAccount {
  private accountId: string;
  private state: BankAccountState;
  private changes: BankAccountEvent[] = [];
  private version = 0;

  constructor(accountId: string) {
    this.accountId = accountId;
    this.state = { accountId, accountHolder: '', balance: 0, isActive: false, createdAt: new Date(), transactionCount: 0 };
  }

  private apply(event: BankAccountEvent): void {
    switch (event.type) {
      case 'AccountCreated':
        const ce = event as AccountCreatedEvent;
        this.state = { ...this.state, accountHolder: ce.accountHolder, balance: ce.initialBalance, isActive: true, createdAt: ce.timestamp, transactionCount: 0 };
        break;
      case 'MoneyDeposited':
        this.state.balance += (event as MoneyDepositedEvent).amount;
        this.state.transactionCount++;
        break;
      case 'MoneyWithdrawn':
        this.state.balance -= (event as MoneyWithdrawnEvent).amount;
        this.state.transactionCount++;
        break;
      case 'AccountClosed':
        this.state.isActive = false;
        this.state.closedAt = event.timestamp;
        break;
    }
  }

  loadFromHistory(events: BankAccountEvent[]): void {
    this.state = { accountId: this.accountId, accountHolder: '', balance: 0, isActive: false, createdAt: new Date(), transactionCount: 0 };
    events.forEach(e => this.apply(e));
    this.version = events.length;
  }

  recordEvent(event: BankAccountEvent): void { this.apply(event); this.changes.push(event); }
  getUncommittedChanges(): BankAccountEvent[] { return this.changes; }
  markChangesAsCommitted(): void { this.changes = []; this.version++; }
  getState(): BankAccountState { return { ...this.state }; }
  getBalance(): number { return this.state.balance; }
  isActive(): boolean { return this.state.isActive; }
  getTransactionCount(): number { return this.state.transactionCount; }
  canWithdraw(amount: number): boolean { return this.state.balance >= amount; }
}
