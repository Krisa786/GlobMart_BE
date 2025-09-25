const InventoryService = require('../services/InventoryService');
const { logger } = require('../middleware/errorHandler');

class InventoryController {
  /**
   * Adjust product inventory stock (Admin only)
   * @route PUT /api/admin/products/:id/inventory
   */
  static async adjustStock(req, res) {
    try {
      const productId = parseInt(req.params.id);
      const { quantity, note } = req.body;
      const userId = req.auth?.userId;

      // Validate input
      if (typeof quantity !== 'number' || quantity < 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_QUANTITY',
            message: 'Quantity must be a non-negative number'
          }
        });
      }

      const inventory = await InventoryService.adjustStock(
        productId,
        quantity,
        'manual_adjust',
        note,
        userId
      );

      logger.info('Inventory adjusted successfully', {
        productId,
        quantity,
        note,
        userId,
        requestId: req.requestId
      });

      res.status(200).json({
        data: {
          product_id: inventory.product_id,
          quantity: inventory.quantity,
          in_stock: inventory.in_stock,
          low_stock: inventory.isLowStock(),
          low_stock_threshold: inventory.low_stock_threshold,
          stock_status: inventory.getStockStatus()
        }
      });
    } catch (error) {
      logger.error('Failed to adjust inventory:', {
        error: error.message,
        productId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      if (error.message === 'Product is soft-deleted') {
        return res.status(409).json({
          error: {
            code: 'PRODUCT_SOFT_DELETED',
            message: 'Cannot adjust inventory for soft-deleted products'
          }
        });
      }

      if (error.message === 'Stock quantity cannot be negative') {
        return res.status(400).json({
          error: {
            code: 'NEGATIVE_STOCK',
            message: 'Stock quantity cannot be negative'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INVENTORY_ADJUST_ERROR',
          message: 'Failed to adjust inventory'
        }
      });
    }
  }

  /**
   * Get product inventory details (Admin only)
   * @route GET /api/admin/products/:id/inventory
   */
  static async getInventory(req, res) {
    try {
      const productId = parseInt(req.params.id);

      const inventory = await InventoryService.getInventoryByProductId(productId);

      res.status(200).json({
        data: {
          product_id: inventory.product_id,
          quantity: inventory.quantity,
          in_stock: inventory.in_stock,
          low_stock: inventory.isLowStock(),
          low_stock_threshold: inventory.low_stock_threshold,
          stock_status: inventory.getStockStatus(),
          updated_at: inventory.updated_at
        }
      });
    } catch (error) {
      logger.error('Failed to fetch inventory:', {
        error: error.message,
        productId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      if (error.message === 'Inventory not found') {
        return res.status(404).json({
          error: {
            code: 'INVENTORY_NOT_FOUND',
            message: 'Inventory record not found for this product'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'INVENTORY_FETCH_ERROR',
          message: 'Failed to fetch inventory'
        }
      });
    }
  }

  /**
   * Get product stock history (Admin only)
   * @route GET /api/admin/products/:id/inventory/history
   */
  static async getStockHistory(req, res) {
    try {
      const productId = parseInt(req.params.id);
      const { limit = 50, page = 1 } = req.query;

      const result = await InventoryService.getStockHistory(productId, {
        limit: parseInt(limit),
        page: parseInt(page)
      });

      res.status(200).json({
        data: result.stockHistory,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Failed to fetch stock history:', {
        error: error.message,
        productId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'STOCK_HISTORY_ERROR',
          message: 'Failed to fetch stock history'
        }
      });
    }
  }

  /**
   * Get low stock products (Admin only)
   * @route GET /api/admin/inventory/low-stock
   */
  static async getLowStockProducts(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;

      const result = await InventoryService.getLowStockProducts({
        limit: parseInt(limit),
        page: parseInt(page)
      });

      res.status(200).json({
        data: result.products,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Failed to fetch low stock products:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'LOW_STOCK_FETCH_ERROR',
          message: 'Failed to fetch low stock products'
        }
      });
    }
  }

  /**
   * Get out of stock products (Admin only)
   * @route GET /api/admin/inventory/out-of-stock
   */
  static async getOutOfStockProducts(req, res) {
    try {
      const { limit = 50, page = 1 } = req.query;

      const result = await InventoryService.getOutOfStockProducts({
        limit: parseInt(limit),
        page: parseInt(page)
      });

      res.status(200).json({
        data: result.products,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Failed to fetch out of stock products:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'OUT_OF_STOCK_FETCH_ERROR',
          message: 'Failed to fetch out of stock products'
        }
      });
    }
  }
}

module.exports = InventoryController;
