import { Router, Request, Response } from 'express';
import { BankAccountService } from '../services/BankAccountService';

export function createRoutes(service: BankAccountService): Router {
  const router = Router();

  // ─── COMMANDS ─────────────────────────────────────────────────────────────

  router.post('/', (req: Request, res: Response) => {
    try {
      const { accountId, accountHolder, initialBalance = 0 } = req.body;
      if (!accountId || !accountHolder) return res.status(400).json({ error: 'accountId and accountHolder required' });
      const account = service.createAccount(accountId, accountHolder, initialBalance);
      res.status(201).json({ ...account.getState(), totalEvents: service.getEventCount(accountId), message: 'Account created' });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.post('/:accountId/deposit', (req: Request, res: Response) => {
    try {
      const { amount, description } = req.body;
      const account = service.depositMoney(req.params.accountId, amount, description);
      const snapshot = service.getLatestSnapshot(req.params.accountId);
      res.json({
        newBalance: account.getBalance(),
        totalEvents: service.getEventCount(req.params.accountId),
        latestSnapshot: snapshot ? `v${snapshot.version}` : 'none',
        snapshotEvery: service.getSnapshotEvery()
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  router.post('/:accountId/withdraw', (req: Request, res: Response) => {
    try {
      const { amount, description } = req.body;
      const account = service.withdrawMoney(req.params.accountId, amount, description);
      const snapshot = service.getLatestSnapshot(req.params.accountId);
      res.json({
        newBalance: account.getBalance(),
        totalEvents: service.getEventCount(req.params.accountId),
        latestSnapshot: snapshot ? `v${snapshot.version}` : 'none'
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ─── SNAPSHOT ROUTES ──────────────────────────────────────────────────────

  /**
   * GET /accounts/:id/snapshot
   * View latest snapshot (for debugging/demonstration)
   */
  router.get('/:accountId/snapshot', (req: Request, res: Response) => {
    try {
      const snapshot = service.getLatestSnapshot(req.params.accountId);
      if (!snapshot) return res.json({ accountId: req.params.accountId, snapshot: null, message: 'No snapshot yet' });

      const totalEvents = service.getEventCount(req.params.accountId);
      const deltaEvents = totalEvents - snapshot.version;

      res.json({
        accountId: req.params.accountId,
        snapshot: {
          version: snapshot.version,
          state: snapshot.state,
          createdAt: snapshot.createdAt
        },
        totalEvents,
        deltaEvents,
        message: `✓ Snapshot at v${snapshot.version}. Next load will replay only ${deltaEvents} delta event(s).`
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  /**
   * POST /accounts/:id/snapshot
   * Force-create a snapshot now
   */
  router.post('/:accountId/snapshot', (req: Request, res: Response) => {
    try {
      const snapshot = service.forceSnapshot(req.params.accountId);
      res.json({ accountId: req.params.accountId, snapshot, message: `✓ Snapshot created at v${snapshot.version}` });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  /**
   * DELETE /accounts/:id/snapshot
   * Delete snapshot (forces full replay on next load — for demo)
   */
  router.delete('/:accountId/snapshot', (req: Request, res: Response) => {
    service.deleteSnapshot(req.params.accountId);
    res.json({ message: `✓ Snapshot deleted. Next load will do full replay.` });
  });

  // ─── READS ────────────────────────────────────────────────────────────────

  router.get('/:accountId', (req: Request, res: Response) => {
    try {
      const state = service.getAccountState(req.params.accountId);
      const snapshot = service.getLatestSnapshot(req.params.accountId);
      const totalEvents = service.getEventCount(req.params.accountId);
      res.json({
        ...state,
        totalEvents,
        latestSnapshot: snapshot ? `v${snapshot.version}` : 'none',
        message: '✓ State loaded (snapshot-optimized)'
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  router.get('/:accountId/history', (req: Request, res: Response) => {
    try {
      const events = service.getEventHistory(req.params.accountId);
      const snapshot = service.getLatestSnapshot(req.params.accountId);
      res.json({
        accountId: req.params.accountId,
        eventCount: events.length,
        snapshotAt: snapshot ? `v${snapshot.version}` : 'none',
        events: events.map((e, i) => ({
          index: i,
          type: e.type,
          timestamp: e.timestamp,
          amount: (e as any).amount,
          isBeforeSnapshot: snapshot ? i < snapshot.version : false
        }))
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  return router;
}
