import { Router, Request, Response } from 'express';
import { BankAccountService } from '../services/BankAccountService';

export function createRoutes(service: BankAccountService): Router {
  const router = Router();

  // ─── COMMANDS ─────────────────────────────────────────────────────────────

  router.post('/', (req: Request, res: Response) => {
    try {
      const { accountId, accountHolder, initialBalance = 0 } = req.body;
      if (!accountId || !accountHolder) {
        return res.status(400).json({ error: 'accountId and accountHolder required' });
      }
      const account = service.createAccount(accountId, accountHolder, initialBalance);
      res.status(201).json({ ...account.getState(), message: 'Account created' });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.post('/:accountId/deposit', (req: Request, res: Response) => {
    try {
      const { amount, description } = req.body;
      const account = service.depositMoney(req.params.accountId, amount, description);
      res.json({ newBalance: account.getBalance(), transactionCount: account.getTransactionCount() });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.post('/:accountId/withdraw', (req: Request, res: Response) => {
    try {
      const { amount, description } = req.body;
      const account = service.withdrawMoney(req.params.accountId, amount, description);
      res.json({ newBalance: account.getBalance(), transactionCount: account.getTransactionCount() });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ─── TIME TRAVEL ──────────────────────────────────────────────────────────

  /**
   * GET /accounts/:id/state/:index
   * View state at a specific event index (past state)
   *
   * index = 0  → state after AccountCreated
   * index = 1  → state after second event
   *
   * Example: 4 events → index 0..3
   */
  router.get('/:accountId/state/:index', (req: Request, res: Response) => {
    try {
      const index = parseInt(req.params.index);
      if (isNaN(index)) return res.status(400).json({ error: 'index must be a number' });

      const state = service.getStateAt(req.params.accountId, index);
      const events = service.getEventHistory(req.params.accountId);

      res.json({
        accountId: req.params.accountId,
        requestedIndex: index,
        eventAtIndex: {
          type: events[index].type,
          timestamp: events[index].timestamp,
          amount: (events[index] as any).amount
        },
        stateAtIndex: state,
        totalEvents: events.length,
        message: `✓ Past state at event[${index}] (replayed ${index + 1}/${events.length} events)`
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  /**
   * GET /accounts/:id/timeline
   * View full timeline: state after every event
   *
   * Shows how balance evolved step-by-step
   */
  router.get('/:accountId/timeline', (req: Request, res: Response) => {
    try {
      const timeline = service.getTimeline(req.params.accountId);

      res.json({
        accountId: req.params.accountId,
        totalEvents: timeline.length,
        timeline: timeline.map(t => ({
          step: t.eventIndex + 1,
          event: t.event.type,
          amount: t.event.amount,
          description: t.event.description,
          timestamp: t.event.timestamp,
          balanceAfter: t.stateAfterEvent.balance
        })),
        message: `✓ Balance evolution across ${timeline.length} events`
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  /**
   * DELETE /accounts/:id/undo
   * Undo last event by adding a compensating event
   *
   * Warning: Cannot undo AccountCreated
   */
  router.delete('/:accountId/undo', (req: Request, res: Response) => {
    try {
      const compensating = service.undoLastEvent(req.params.accountId);
      const account = service.loadAccount(req.params.accountId);

      res.json({
        accountId: req.params.accountId,
        compensatingEvent: compensating?.type,
        newBalance: account.getBalance(),
        totalEvents: service.getEventHistory(req.params.accountId).length,
        message: `✓ Undo applied via compensating event. New balance: $${account.getBalance()}`
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ─── READS ────────────────────────────────────────────────────────────────

  router.get('/:accountId', (req: Request, res: Response) => {
    try {
      const state = service.getAccountState(req.params.accountId);
      res.json({ ...state, message: '✓ State computed from event replay' });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  router.get('/:accountId/balance', (req: Request, res: Response) => {
    try {
      res.json({ accountId: req.params.accountId, balance: service.getBalance(req.params.accountId) });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  router.get('/:accountId/history', (req: Request, res: Response) => {
    try {
      const events = service.getEventHistory(req.params.accountId);
      res.json({
        accountId: req.params.accountId,
        eventCount: events.length,
        events: events.map((e, i) => ({
          index: i,
          type: e.type,
          timestamp: e.timestamp,
          amount: (e as any).amount,
          description: (e as any).description,
          accountHolder: (e as any).accountHolder,
          initialBalance: (e as any).initialBalance
        }))
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  router.get('/', (_req: Request, res: Response) => {
    try {
      const events = service.getAllEvents();
      const accounts = new Map<string, any>();
      events.forEach((e: any) => {
        if (!accounts.has(e.aggregateId)) accounts.set(e.aggregateId, { accountId: e.aggregateId, balance: 0 });
        if (e.type === 'AccountCreated') { accounts.get(e.aggregateId).accountHolder = e.accountHolder; accounts.get(e.aggregateId).balance = e.initialBalance; }
        if (e.type === 'MoneyDeposited') accounts.get(e.aggregateId).balance += e.amount;
        if (e.type === 'MoneyWithdrawn') accounts.get(e.aggregateId).balance -= e.amount;
      });
      res.json({ accountCount: accounts.size, accounts: Array.from(accounts.values()) });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  return router;
}
