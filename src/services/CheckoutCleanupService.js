const { Queue, Worker } = require('bullmq');
const CheckoutService = require('./CheckoutService');
const { logger } = require('../middleware/errorHandler');

class CheckoutCleanupService {
  constructor() {
    this.queue = null;
    this.worker = null;
    this.isInitialized = false;
    
    // Check if Redis is available before creating Queue
    if (this.isRedisAvailable()) {
      this.initializeWithRedis();
    } else {
      logger.warn('Redis not available, checkout cleanup service will not be initialized');
      this.isInitialized = false;
    }
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable() {
    // Skip Redis if explicitly disabled
    if (process.env.DISABLE_REDIS === 'true') {
      return false;
    }
    
    // Skip Redis in test environment
    if (process.env.NODE_ENV === 'test') {
      return false;
    }
    
    // Skip Redis in development if not explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_REDIS !== 'true') {
      return false;
    }
    
    return true;
  }

  /**
   * Initialize with Redis connection
   */
  async initializeWithRedis() {
    try {
      // Test Redis connection first
      const Redis = require('ioredis');
      const testRedis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        connectTimeout: 2000,
        commandTimeout: 2000
      });

      // Test connection
      await testRedis.ping();
      await testRedis.disconnect();

      // If connection successful, create Queue
      this.queue = new Queue('checkout-cleanup', {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true
        }
      });

      this.setupJobProcessor();
      this.scheduleCleanupJob();
      this.isInitialized = true;
      
      logger.info('Checkout cleanup service initialized successfully with Redis');
    } catch (error) {
      logger.warn('Failed to initialize checkout cleanup service (Redis not available):', {
        error: error.message
      });
      this.isInitialized = false;
    }
  }

  /**
   * Setup job processor for cleanup tasks
   */
  setupJobProcessor() {
    if (!this.queue) return;

    this.worker = new Worker('checkout-cleanup', async (job) => {
      try {
        logger.info('Starting expired checkout cleanup job', {
          jobId: job.id,
          attempt: job.attemptsMade + 1
        });

        const cleanedCount = await CheckoutService.cleanupExpiredSessions();

        logger.info('Expired checkout cleanup job completed', {
          jobId: job.id,
          cleanedCount
        });

        return { cleanedCount };
      } catch (error) {
        logger.error('Expired checkout cleanup job failed:', {
          jobId: job.id,
          error: error.message,
          attempt: job.attemptsMade + 1
        });
        throw error;
      }
    }, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      }
    });

    // Handle job completion
    this.worker.on('completed', (job, result) => {
      logger.info('Checkout cleanup job completed successfully', {
        jobId: job.id,
        result
      });
    });

    // Handle job failure
    this.worker.on('failed', (job, err) => {
      logger.error('Checkout cleanup job failed:', {
        jobId: job.id,
        error: err.message,
        attempts: job.attemptsMade
      });
    });
  }

  /**
   * Schedule recurring cleanup job
   */
  scheduleCleanupJob() {
    if (!this.queue) return;

    // Run cleanup every 5 minutes
    this.queue.add(
      'cleanup-expired-checkouts',
      {},
      {
        repeat: { every: 5 * 60 * 1000 }, // 5 minutes
        removeOnComplete: 10, // Keep last 10 completed jobs
        removeOnFail: 5, // Keep last 5 failed jobs
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );

    logger.info('Scheduled checkout cleanup job to run every 5 minutes');
  }

  /**
   * Manually trigger cleanup job
   * @returns {Promise<Object>} Job result
   */
  async triggerCleanup() {
    if (!this.queue || !this.isInitialized) {
      logger.warn('Checkout cleanup service not initialized, running cleanup directly');
      try {
        const cleanedCount = await CheckoutService.cleanupExpiredSessions();
        return { status: 'completed', cleanedCount };
      } catch (error) {
        logger.error('Failed to run cleanup directly:', {
          error: error.message
        });
        throw error;
      }
    }

    try {
      const job = await this.queue.add('cleanup-expired-checkouts', {}, {
        priority: 1, // High priority for manual triggers
        removeOnComplete: 1,
        removeOnFail: 1
      });

      logger.info('Manually triggered checkout cleanup job', {
        jobId: job.id
      });

      return { jobId: job.id, status: 'queued' };
    } catch (error) {
      logger.error('Failed to trigger cleanup job:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @returns {Promise<Object>} Queue stats
   */
  async getQueueStats() {
    if (!this.queue || !this.isInitialized) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        total: 0,
        status: 'not_initialized'
      };
    }

    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length,
        status: 'initialized'
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up old jobs from queue
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldJobs(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    if (!this.queue || !this.isInitialized) {
      return { cleanedCount: 0, status: 'not_initialized' };
    }

    try {
      const cutoffTime = new Date(Date.now() - maxAge);
      
      // Clean up completed jobs older than maxAge
      const completedJobs = await this.queue.getCompleted();
      const oldCompletedJobs = completedJobs.filter(job => 
        new Date(job.timestamp) < cutoffTime
      );

      // Clean up failed jobs older than maxAge
      const failedJobs = await this.queue.getFailed();
      const oldFailedJobs = failedJobs.filter(job => 
        new Date(job.timestamp) < cutoffTime
      );

      let cleanedCount = 0;

      // Remove old completed jobs
      for (const job of oldCompletedJobs) {
        await job.remove();
        cleanedCount++;
      }

      // Remove old failed jobs
      for (const job of oldFailedJobs) {
        await job.remove();
        cleanedCount++;
      }

      logger.info('Cleaned up old queue jobs', {
        cleanedCount,
        maxAge: maxAge / (60 * 60 * 1000) + ' hours'
      });

      return { cleanedCount };
    } catch (error) {
      logger.error('Failed to cleanup old jobs:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue() {
    if (!this.queue || !this.isInitialized) {
      logger.warn('Cannot pause queue - service not initialized');
      return;
    }
    await this.queue.pause();
    logger.info('Checkout cleanup queue paused');
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    if (!this.queue || !this.isInitialized) {
      logger.warn('Cannot resume queue - service not initialized');
      return;
    }
    await this.queue.resume();
    logger.info('Checkout cleanup queue resumed');
  }

  /**
   * Close the queue connection
   */
  async close() {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    logger.info('Checkout cleanup queue closed');
  }
}

// Create singleton instance
let cleanupService = null;

/**
 * Get or create cleanup service instance
 * @returns {CheckoutCleanupService} Service instance
 */
function getCheckoutCleanupService() {
  if (!cleanupService) {
    cleanupService = new CheckoutCleanupService();
  }
  return cleanupService;
}

module.exports = {
  CheckoutCleanupService,
  getCheckoutCleanupService
};
