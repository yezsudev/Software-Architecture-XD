import { Router, Request, Response } from 'express';
import { BankAccountService } from '../services/BankAccountService';

export function createRoutes(service: BankAccountService): Router {
  const router = Router();

  // ─── COMMANDS (Write Side) ─────────────────────────────────────────────────

  router.post('/', (req: Request, res: Response) => {
    try {
      const { accountId, accountHolder, initialBalance = 0 } = req.body;
      if (!accountId || !accountHolder) return res.status(400).json({ error: 'accountId and accountHolder required' });
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

  // ─── QUERY: Read Model (Projection) ───────────────────────────────────────

  /**
   * GET /accounts/:id/summary
   * Get AccountSummary from the READ MODEL (no event replay!)
   *
   * This is the projection: fast, pre-built, updatable incrementally
   * Fields: balance, totalDeposited, totalWithdrawn, depositCount, withdrawCount
   */
  router.get('/:accountId/summary', (req: Request, res: Response) => {
    try {
      const summary = service.getAccountSummary(req.params.accountId);
      res.json({
        ...summary,
        message: '✓ From READ MODEL (projection) — no event replay needed'
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  /**
   * GET /summaries
   * List all account summaries from READ MODEL
   */
  router.get('/summaries/all', (_req: Request, res: Response) => {
    try {
      const summaries = service.getAllSummaries();
      res.json({
        count: summaries.length,
        summaries,
        message: '✓ All account summaries from projection'
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  /**
   * POST /rebuild
   * Force rebuild all projections from events
   */
  router.post('/rebuild', (_req: Request, res: Response) => {
    service.rebuildProjection();
    res.json({ message: '✓ Projection rebuilt from events' });
  });

  // ─── STANDARD QUERIES ─────────────────────────────────────────────────────

  router.get('/:accountId', (req: Request, res: Response) => {
    try {
      const state = service.getAccountState(req.params.accountId);
      res.json({ ...state, message: '✓ State from WRITE MODEL (event replay)' });
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
          description: (e as any).description
        }))
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  return router;
}
