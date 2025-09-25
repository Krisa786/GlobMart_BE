const CheckoutService = require('./CheckoutService');
const { logger } = require('../middleware/errorHandler');

class CheckoutCleanupFallback {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Start the fallback cleanup service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Checkout cleanup fallback is already running');
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(async () => {
      try {
        await this.runCleanup();
      } catch (error) {
        logger.error('Fallback cleanup failed:', {
          error: error.message
        });
      }
    }, this.cleanupInterval);

    logger.info('Checkout cleanup fallback service started', {
      interval: this.cleanupInterval / 1000 + ' seconds'
    });
  }

  /**
   * Stop the fallback cleanup service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Checkout cleanup fallback service stopped');
  }

  /**
   * Run cleanup manually
   */
  async runCleanup() {
    try {
      logger.info('Running fallback checkout cleanup');
      const cleanedCount = await CheckoutService.cleanupExpiredSessions();
      
      if (cleanedCount > 0) {
        logger.info('Fallback cleanup completed', {
          cleanedCount
        });
      }
    } catch (error) {
      logger.error('Fallback cleanup error:', {
        error: error.message
      });
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.cleanupInterval,
      nextRun: this.isRunning ? new Date(Date.now() + this.cleanupInterval) : null
    };
  }
}

// Create singleton instance
let fallbackService = null;

/**
 * Get or create fallback service instance
 * @returns {CheckoutCleanupFallback} Service instance
 */
function getCheckoutCleanupFallback() {
  if (!fallbackService) {
    fallbackService = new CheckoutCleanupFallback();
  }
  return fallbackService;
}

module.exports = {
  CheckoutCleanupFallback,
  getCheckoutCleanupFallback
};
