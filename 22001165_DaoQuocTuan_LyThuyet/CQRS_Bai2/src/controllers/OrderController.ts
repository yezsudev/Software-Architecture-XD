import { Request, Response } from 'express';
import { CommandService } from '../services/CommandService';
import { QueryService } from '../services/QueryService';
import { CreateOrderCommand, CancelOrderCommand } from '../models';

/**
 * OrderController - Handles HTTP requests
 * Delegates to CommandService and QueryService
 */
export class OrderController {
  constructor(
    private commandService: CommandService,
    private queryService: QueryService
  ) {}

  /**
   * POST /orders - Create a new order
   */
  createOrder = (req: Request, res: Response): void => {
    try {
      const { customerId, items } = req.body;

      // Validate input
      if (!customerId || !items || items.length === 0) {
        res.status(400).json({
          error: 'Missing required fields: customerId and items',
        });
        return;
      }

      // Validate items
      for (const item of items) {
        if (!item.productId || !item.productName || !item.quantity || !item.unitPrice) {
          res.status(400).json({
            error: 'Each item must have: productId, productName, quantity, unitPrice',
          });
          return;
        }
      }

      const command: CreateOrderCommand = { customerId, items };
      const result = this.commandService.createOrder(command);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * GET /orders - Get all orders
   */
  getAllOrders = (req: Request, res: Response): void => {
    try {
      const results = this.queryService.getAllOrders();
      const stats = this.queryService.getStatistics();

      res.status(200).json({
        success: true,
        data: results,
        statistics: stats,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * GET /orders/:id - Get order by id
   */
  getOrderById = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const result = this.queryService.getOrderById(id);

      if (!result) {
        res.status(404).json({
          error: `Order with id ${id} not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  /**
   * DELETE /orders/:id - Cancel order
   */
  cancelOrder = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const command: CancelOrderCommand = {
        id,
        reason,
      };

      const result = this.commandService.cancelOrder(command);

      res.status(200).json({
        success: true,
        message: `Order ${id} cancelled successfully`,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = message.includes('not found') ? 404 : 400;

      res.status(status).json({
        error: message,
      });
    }
  };
}
