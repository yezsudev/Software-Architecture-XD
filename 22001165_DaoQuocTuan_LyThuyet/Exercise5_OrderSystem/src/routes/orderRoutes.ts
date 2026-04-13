import { Router, Request, Response } from 'express';
import { OrderService } from '../services/OrderService';

export function createRoutes(service: OrderService): Router {
  const router = Router();

  // ─── COMMANDS (Write Side) ─────────────────────────────────────────────────

  /**
   * POST /orders
   * Create new order
   * Body: { orderId, customerId }
   */
  router.post('/', (req: Request, res: Response) => {
    try {
      const { orderId, customerId } = req.body;
      if (!orderId || !customerId) return res.status(400).json({ error: 'orderId and customerId required' });
      const order = service.createOrder(orderId, customerId);
      res.status(201).json({ ...order.getState(), message: 'Order created (draft)' });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  /**
   * POST /orders/:id/items
   * Add item to order
   * Body: { itemId, name, price, quantity }
   */
  router.post('/:orderId/items', (req: Request, res: Response) => {
    try {
      const { itemId, name, price, quantity } = req.body;
      if (!itemId || !name || !price || !quantity) return res.status(400).json({ error: 'itemId, name, price, quantity required' });
      const order = service.addItem(req.params.orderId, itemId, name, price, quantity);
      const summary = service.getOrderSummary(req.params.orderId);
      res.json({
        status: order.getStatus(),
        itemAdded: { itemId, name, price, quantity },
        totalPrice: summary.totalPrice,
        itemCount: summary.itemCount,
        message: `✓ Item added. Total price: $${summary.totalPrice}`
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  /**
   * DELETE /orders/:id/items/:itemId
   * Remove item from order
   */
  router.delete('/:orderId/items/:itemId', (req: Request, res: Response) => {
    try {
      const order = service.removeItem(req.params.orderId, req.params.itemId);
      const summary = service.getOrderSummary(req.params.orderId);
      res.json({
        status: order.getStatus(),
        removed: req.params.itemId,
        totalPrice: summary.totalPrice,
        itemCount: summary.itemCount,
        message: `✓ Item removed. Total price: $${summary.totalPrice}`
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  /**
   * POST /orders/:id/confirm
   * Confirm order (cannot add/remove items after this)
   */
  router.post('/:orderId/confirm', (req: Request, res: Response) => {
    try {
      const order = service.confirmOrder(req.params.orderId);
      const summary = service.getOrderSummary(req.params.orderId);
      res.json({
        status: order.getStatus(),
        confirmedAt: order.getState().confirmedAt,
        totalPrice: summary.totalPrice,
        itemCount: summary.itemCount,
        message: `✓ Order confirmed! Total: $${summary.totalPrice}`
      });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  /**
   * POST /orders/:id/cancel
   * Cancel order
   */
  router.post('/:orderId/cancel', (req: Request, res: Response) => {
    try {
      const { reason = 'No reason provided' } = req.body;
      const order = service.cancelOrder(req.params.orderId, reason);
      res.json({ status: order.getStatus(), reason, message: `✓ Order cancelled` });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ─── QUERIES (Read Side — Projection) ─────────────────────────────────────

  /**
   * GET /orders/:id/summary
   * Get order summary from READ MODEL (projection) — fast, no replay!
   * Fields: totalPrice, status, itemCount, totalQuantity
   */
  router.get('/:orderId/summary', (req: Request, res: Response) => {
    try {
      const summary = service.getOrderSummary(req.params.orderId);
      res.json({
        ...summary,
        message: '✓ From READ MODEL (projection) — no event replay'
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  /**
   * GET /orders
   * List all orders (from projection)
   */
  router.get('/', (_req: Request, res: Response) => {
    try {
      const summaries = service.getAllSummaries();
      res.json({ count: summaries.length, orders: summaries });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  /**
   * GET /orders/:id/history
   * View complete event stream for the order
   */
  router.get('/:orderId/history', (req: Request, res: Response) => {
    try {
      const events = service.getEventHistory(req.params.orderId);
      res.json({
        orderId: req.params.orderId,
        eventCount: events.length,
        events: events.map((e, i) => ({
          index: i,
          type: e.type,
          timestamp: e.timestamp,
          ...((e as any).customerId && { customerId: (e as any).customerId }),
          ...((e as any).itemId && { itemId: (e as any).itemId }),
          ...((e as any).name && { name: (e as any).name }),
          ...((e as any).price !== undefined && { price: (e as any).price }),
          ...((e as any).quantity !== undefined && { quantity: (e as any).quantity }),
          ...((e as any).reason && { reason: (e as any).reason })
        }))
      });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  /**
   * GET /orders/:id
   * Get order state from WRITE MODEL (requires replay)
   */
  router.get('/:orderId', (req: Request, res: Response) => {
    try {
      const state = service.getOrderState(req.params.orderId);
      const totalPrice = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      res.json({ ...state, totalPrice, message: '✓ State from WRITE MODEL (event replay)' });
    } catch (e: any) { res.status(404).json({ error: e.message }); }
  });

  return router;
}
