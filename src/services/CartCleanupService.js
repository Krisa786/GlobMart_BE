const CartService = require('./CartService');
const { logger } = require('../middleware/errorHandler');

class CartCleanupService {
  /**
   * Clean up abandoned carts (older than 60 days)
   * This should be run as a scheduled job
   */
  static async cleanupAbandonedCarts() {
    try {
      logger.info('Starting cart cleanup process');
      
      const cleanedCount = await CartService.cleanupAbandonedCarts();
      
      logger.info('Cart cleanup completed', {
        abandonedCartsMarked: cleanedCount
      });
      
      return {
        success: true,
        abandonedCartsMarked: cleanedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Cart cleanup failed:', {
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  /**
   * Get statistics about cart cleanup
   */
  static async getCleanupStats() {
    try {
      const { Cart } = require('../database/models');
      const { Op } = require('sequelize');
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
      
      const [activeCarts, abandonedCarts, convertedCarts, oldActiveCarts] = await Promise.all([
        Cart.count({ where: { status: 'active' } }),
        Cart.count({ where: { status: 'abandoned' } }),
        Cart.count({ where: { status: 'converted' } }),
        Cart.count({ 
          where: { 
            status: 'active',
            created_at: { [Op.lt]: sixtyDaysAgo }
          } 
        })
      ]);
      
      return {
        activeCarts,
        abandonedCarts,
        convertedCarts,
        oldActiveCarts,
        totalCarts: activeCarts + abandonedCarts + convertedCarts,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get cleanup stats:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Schedule cart cleanup (for use with cron jobs or task schedulers)
   */
  static scheduleCleanup() {
    // This would typically be called by a cron job or task scheduler
    // For now, we'll just provide the method structure
    
    const cleanupInterval = process.env.CART_CLEANUP_INTERVAL || '0 2 * * *'; // Daily at 2 AM
    
    logger.info('Cart cleanup scheduled', {
      interval: cleanupInterval
    });
    
    return cleanupInterval;
  }
}

module.exports = CartCleanupService;
