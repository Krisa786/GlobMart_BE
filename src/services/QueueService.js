const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { logger } = require('../middleware/errorHandler');

/**
 * Queue Service - Handles background indexing jobs
 * Uses BullMQ with Redis for job queuing and processing
 */
class QueueService {
  constructor() {
    this.redis = null;
    this.indexQueue = null;
    this.removeQueue = null;
    this.indexWorker = null;
    this.removeWorker = null;
    this.initialized = false;
  }

  /**
   * Initialize Redis connection and queues
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize Redis connection
      this.redis = new IORedis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      // Test Redis connection
      await this.redis.ping();
      logger.info('Redis connection established');

      // Initialize queues
      this.indexQueue = new Queue('product-index', {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      this.removeQueue = new Queue('product-remove', {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      // Initialize workers
      await this.initializeWorkers();

      this.initialized = true;
      logger.info('Queue service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  /**
   * Initialize workers for processing jobs
   */
  async initializeWorkers() {
    // Index worker
    this.indexWorker = new Worker('product-index', async (job) => {
      const { productId, options = {} } = job.data;
      
      logger.debug(`Processing index job for product ${productId}`);
      
      try {
        // Dynamic import to avoid circular dependency
        const IndexerService = require('./IndexerService');
        await IndexerService.indexProduct(productId, { ...options, skipQueue: true });
        logger.debug(`Successfully processed index job for product ${productId}`);
      } catch (error) {
        logger.error(`Failed to process index job for product ${productId}:`, error);
        throw error;
      }
    }, {
      connection: this.redis,
      concurrency: 5
    });

    // Remove worker
    this.removeWorker = new Worker('product-remove', async (job) => {
      const { productId, options = {} } = job.data;
      
      logger.debug(`Processing remove job for product ${productId}`);
      
      try {
        // Dynamic import to avoid circular dependency
        const IndexerService = require('./IndexerService');
        await IndexerService.removeProduct(productId, { ...options, skipQueue: true });
        logger.debug(`Successfully processed remove job for product ${productId}`);
      } catch (error) {
        logger.error(`Failed to process remove job for product ${productId}:`, error);
        throw error;
      }
    }, {
      connection: this.redis,
      concurrency: 5
    });

    // Add event listeners
    this.indexWorker.on('completed', (job) => {
      logger.debug(`Index job completed for product ${job.data.productId}`);
    });

    this.indexWorker.on('failed', (job, err) => {
      logger.error(`Index job failed for product ${job.data.productId}:`, err);
    });

    this.removeWorker.on('completed', (job) => {
      logger.debug(`Remove job completed for product ${job.data.productId}`);
    });

    this.removeWorker.on('failed', (job, err) => {
      logger.error(`Remove job failed for product ${job.data.productId}:`, err);
    });

    logger.info('Queue workers initialized');
  }

  /**
   * Enqueue a product for indexing
   */
  async enqueueIndexJob(productId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const job = await this.indexQueue.add('index-product', {
        productId,
        options
      }, {
        jobId: `index-${productId}`, // Prevent duplicate jobs
        delay: options.delay || 0
      });

      logger.debug(`Enqueued index job for product ${productId}, job ID: ${job.id}`);
      return job;
    } catch (error) {
      logger.error(`Failed to enqueue index job for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Enqueue a product for removal from index
   */
  async enqueueRemoveJob(productId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const job = await this.removeQueue.add('remove-product', {
        productId,
        options
      }, {
        jobId: `remove-${productId}`, // Prevent duplicate jobs
        delay: options.delay || 0
      });

      logger.debug(`Enqueued remove job for product ${productId}, job ID: ${job.id}`);
      return job;
    } catch (error) {
      logger.error(`Failed to enqueue remove job for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const [indexStats, removeStats] = await Promise.all([
        this.indexQueue.getJobCounts(),
        this.removeQueue.getJobCounts()
      ]);

      return {
        index: {
          waiting: indexStats.waiting,
          active: indexStats.active,
          completed: indexStats.completed,
          failed: indexStats.failed,
          delayed: indexStats.delayed
        },
        remove: {
          waiting: removeStats.waiting,
          active: removeStats.active,
          completed: removeStats.completed,
          failed: removeStats.failed,
          delayed: removeStats.delayed
        }
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return {
        index: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
        remove: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
      };
    }
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(queueName = 'index', limit = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const queue = queueName === 'remove' ? this.removeQueue : this.indexQueue;
      const failedJobs = await queue.getFailed(0, limit - 1);
      
      return failedJobs.map(job => ({
        id: job.id,
        data: job.data,
        failedReason: job.failedReason,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn
      }));
    } catch (error) {
      logger.error('Failed to get failed jobs:', error);
      return [];
    }
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(queueName = 'index', jobIds = []) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const queue = queueName === 'remove' ? this.removeQueue : this.indexQueue;
      
      if (jobIds.length === 0) {
        // Retry all failed jobs
        const failedJobs = await queue.getFailed();
        for (const job of failedJobs) {
          await job.retry();
        }
        logger.info(`Retried ${failedJobs.length} failed jobs in ${queueName} queue`);
      } else {
        // Retry specific jobs
        for (const jobId of jobIds) {
          const job = await queue.getJob(jobId);
          if (job) {
            await job.retry();
            logger.info(`Retried job ${jobId} in ${queueName} queue`);
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to retry failed jobs:', error);
      throw error;
    }
  }

  /**
   * Clear completed jobs
   */
  async clearCompletedJobs(queueName = 'index') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const queue = queueName === 'remove' ? this.removeQueue : this.indexQueue;
      await queue.clean(0, 100, 'completed');
      logger.info(`Cleared completed jobs in ${queueName} queue`);
      return true;
    } catch (error) {
      logger.error('Failed to clear completed jobs:', error);
      throw error;
    }
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(queueName = 'index') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const queue = queueName === 'remove' ? this.removeQueue : this.indexQueue;
      await queue.pause();
      logger.info(`Paused ${queueName} queue`);
      return true;
    } catch (error) {
      logger.error('Failed to pause queue:', error);
      throw error;
    }
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueName = 'index') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const queue = queueName === 'remove' ? this.removeQueue : this.indexQueue;
      await queue.resume();
      logger.info(`Resumed ${queueName} queue`);
      return true;
    } catch (error) {
      logger.error('Failed to resume queue:', error);
      throw error;
    }
  }

  /**
   * Check if queue service is healthy
   */
  async isHealthy() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Queue service health check failed:', error);
      return false;
    }
  }

  /**
   * Gracefully shutdown the queue service
   */
  async shutdown() {
    try {
      if (this.indexWorker) {
        await this.indexWorker.close();
      }
      
      if (this.removeWorker) {
        await this.removeWorker.close();
      }
      
      if (this.indexQueue) {
        await this.indexQueue.close();
      }
      
      if (this.removeQueue) {
        await this.removeQueue.close();
      }
      
      if (this.redis) {
        await this.redis.quit();
      }
      
      logger.info('Queue service shutdown completed');
    } catch (error) {
      logger.error('Error during queue service shutdown:', error);
    }
  }
}

module.exports = new QueueService();
