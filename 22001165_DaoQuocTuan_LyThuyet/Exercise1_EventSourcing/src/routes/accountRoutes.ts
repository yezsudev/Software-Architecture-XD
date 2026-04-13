import { Router, Request, Response } from 'express';
import { BankAccountService } from '../services/BankAccountService';

/**
 * Bank Account Routes
 * 
 * API Endpoints:
 * - POST   /accounts                 - Create new account
 * - GET    /accounts/:id             - Get account state
 * - GET    /accounts/:id/balance     - Get balance
 * - GET    /accounts/:id/history     - Get event history
 * - POST   /accounts/:id/deposit     - Deposit money
 * - POST   /accounts/:id/withdraw    - Withdraw money
 * 
 * IMPORTANT: All responses show state COMPUTED from events
 * NO state is directly stored in database
 */
export function createBankAccountRoutes(service: BankAccountService): Router {
  const router = Router();

  /**
   * POST /accounts
   * Create new bank account
   * 
   * Body:
   * {
   *   "accountId": "uuid or custom ID",
   *   "accountHolder": "John Doe",
   *   "initialBalance": 1000
   * }
   */
  router.post('/', (req: Request, res: Response) => {
    try {
      const { accountId, accountHolder, initialBalance = 0 } = req.body;

      if (!accountId || !accountHolder) {
        return res.status(400).json({
          error: 'Missing required fields: accountId, accountHolder'
        });
      }

      const account = service.createAccount(accountId, accountHolder, initialBalance);
      const state = account.getState();

      res.status(201).json({
        message: 'Account created',
        accountId: state.accountId,
        accountHolder: state.accountHolder,
        balance: state.balance,
        isActive: state.isActive,
        transactionCount: state.transactionCount,
        createdAt: state.createdAt
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * GET /accounts/:id
   * Get full account state (reconstructed from events)
   * 
   * Response includes:
   * - Current balance (computed from deposits - withdrawals)
   * - Account holder, status, transaction count
   * - Timestamps
   */
  router.get('/:accountId', (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const state = service.getAccountState(accountId);

      res.status(200).json({
        accountId: state.accountId,
        accountHolder: state.accountHolder,
        balance: state.balance,
        isActive: state.isActive,
        transactionCount: state.transactionCount,
        createdAt: state.createdAt,
        closedAt: state.closedAt,
        message: '✓ State computed from event replay'
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * GET /accounts/:id/balance
   * Get just the current balance (derived from events)
   * 
   * Simple, fast response showing computed balance
   */
  router.get('/:accountId/balance', (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const balance = service.getBalance(accountId);

      res.status(200).json({
        accountId,
        balance,
        message: '✓ Balance computed: sum(deposits) - sum(withdrawals)'
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * GET /accounts/:id/history
   * Get complete event history (event stream)
   * 
   * Shows every transaction that happened
   * Useful for:
   * - Audit trail
   * - Debugging
   * - Replication
   * - Time-travel capability
   */
  router.get('/:accountId/history', (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const events = service.getEventHistory(accountId);

      // Display events
      console.log(`\n📋 Event History for ${accountId}:`);
      service.showEventStream(accountId);

      res.status(200).json({
        accountId,
        eventCount: events.length,
        events: events.map((e: any) => ({
          type: e.type,
          timestamp: e.timestamp,
          ...(e.accountHolder && { accountHolder: e.accountHolder }),
          ...(e.initialBalance !== undefined && { initialBalance: e.initialBalance }),
          ...(e.amount && { amount: e.amount }),
          ...(e.description && { description: e.description }),
          ...(e.closureReason && { closureReason: e.closureReason })
        })),
        message: `✓ Complete event stream (${events.length} events)`
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * POST /accounts/:id/deposit
   * Deposit money to account
   * 
   * Body:
   * {
   *   "amount": 500,
   *   "description": "Monthly salary"
   * }
   */
  router.post('/:accountId/deposit', (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          error: 'Amount must be positive'
        });
      }

      const account = service.depositMoney(accountId, amount, description);

      res.status(200).json({
        accountId,
        transaction: 'DEPOSIT',
        amount,
        newBalance: account.getBalance(),
        transactionCount: account.getTransactionCount(),
        message: `✓ Deposited $${amount}. New balance: $${account.getBalance()}`
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * POST /accounts/:id/withdraw
   * Withdraw money from account
   * 
   * Body:
   * {
   *   "amount": 200,
   *   "description": "ATM withdrawal"
   * }
   */
  router.post('/:accountId/withdraw', (req: Request, res: Response) => {
    try {
      const { accountId } = req.params;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          error: 'Amount must be positive'
        });
      }

      const account = service.withdrawMoney(accountId, amount, description);

      res.status(200).json({
        accountId,
        transaction: 'WITHDRAW',
        amount,
        newBalance: account.getBalance(),
        transactionCount: account.getTransactionCount(),
        message: `✓ Withdrew $${amount}. New balance: $${account.getBalance()}`
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * GET /accounts
   * List all accounts (get all event streams)
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      const events = service.getAllEvents();
      
      // Group events by accountId to find all accounts
      const accounts = new Map<string, any>();
      
      events.forEach((e: any) => {
        if (!accounts.has(e.aggregateId)) {
          accounts.set(e.aggregateId, {
            accountId: e.aggregateId,
            balance: 0,
            isActive: false,
            transactionCount: 0
          });
        }
        
        if (e.type === 'AccountCreated') {
          accounts.get(e.aggregateId)!.accountHolder = e.accountHolder;
          accounts.get(e.aggregateId)!.isActive = true;
          accounts.get(e.aggregateId)!.createdAt = e.timestamp;
        }
        if (e.type === 'MoneyDeposited') {
          accounts.get(e.aggregateId)!.balance += e.amount;
          accounts.get(e.aggregateId)!.transactionCount++;
        }
        if (e.type === 'MoneyWithdrawn') {
          accounts.get(e.aggregateId)!.balance -= e.amount;
          accounts.get(e.aggregateId)!.transactionCount++;
        }
      });

      res.status(200).json({
        accountCount: accounts.size,
        accounts: Array.from(accounts.values()),
        message: '✓ All accounts (states computed from events)'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
