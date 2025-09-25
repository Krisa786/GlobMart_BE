const IndexerService = require('../services/IndexerService');
const SearchService = require('../services/SearchService');
const QueueService = require('../services/QueueService');
const { logger } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');

/**
 * Admin Search Controller - Handles admin search management endpoints
 */
class AdminSearchController {
  /**
   * Get search service status and statistics
   * GET /api/admin/search/status
   */
  static async getSearchStatus(req, res) {
    try {
      const status = await IndexerService.getIndexingStatus();
      const counts = await IndexerService.compareCounts();

      res.json({
        success: true,
        data: {
          ...status,
          counts
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to get search status:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_STATUS_ERROR',
          message: 'Failed to get search status'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Trigger full reindex
   * POST /api/admin/search/reindex
   */
  static async triggerReindex(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          },
          requestId: req.requestId
        });
      }

      const { dryRun = false, clearFirst = true, batchSize = 100 } = req.body;

      // Check if reindexing is already in progress
      const status = await IndexerService.getIndexingStatus();
      if (status.isReindexing) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'REINDEX_IN_PROGRESS',
            message: 'Reindexing is already in progress'
          },
          requestId: req.requestId
        });
      }

      // Start reindexing in background
      const reindexPromise = IndexerService.reindexAll({
        batchSize,
        dryRun,
        clearFirst,
        progressCallback: (progress) => {
          logger.info('Reindexing progress:', progress);
        }
      });

      // Don't wait for completion, return immediately
      reindexPromise.catch(error => {
        logger.error('Background reindexing failed:', error);
      });

      res.json({
        success: true,
        data: {
          message: 'Reindexing started',
          dryRun,
          clearFirst,
          batchSize
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to trigger reindex:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'REINDEX_ERROR',
          message: 'Failed to start reindexing'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Index a specific product
   * POST /api/admin/search/index-product
   */
  static async indexProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          },
          requestId: req.requestId
        });
      }

      const { productId, force = false } = req.body;

      const success = await IndexerService.indexProduct(productId, { force });

      res.json({
        success: true,
        data: {
          productId,
          indexed: success,
          message: success ? 'Product indexed successfully' : 'Product not indexed (may not meet criteria)'
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to index product:', {
        error: error.message,
        productId: req.body.productId,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INDEX_PRODUCT_ERROR',
          message: 'Failed to index product'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Remove a product from search index
   * DELETE /api/admin/search/index-product/:productId
   */
  static async removeProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          },
          requestId: req.requestId
        });
      }

      const { productId } = req.params;

      const success = await IndexerService.removeProduct(productId);

      res.json({
        success: true,
        data: {
          productId,
          removed: success,
          message: success ? 'Product removed from index successfully' : 'Product not found in index'
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to remove product from index:', {
        error: error.message,
        productId: req.params.productId,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'REMOVE_PRODUCT_ERROR',
          message: 'Failed to remove product from index'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Get queue statistics
   * GET /api/admin/search/queue
   */
  static async getQueueStats(req, res) {
    try {
      const stats = await QueueService.getQueueStats();

      res.json({
        success: true,
        data: {
          stats
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to get queue stats:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_STATS_ERROR',
          message: 'Failed to get queue statistics'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Get failed jobs
   * GET /api/admin/search/failed-jobs
   */
  static async getFailedJobs(req, res) {
    try {
      const { queue = 'index', limit = 10 } = req.query;

      const failedJobs = await QueueService.getFailedJobs(queue, parseInt(limit));

      res.json({
        success: true,
        data: {
          failedJobs,
          queue,
          limit: parseInt(limit)
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to get failed jobs:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'FAILED_JOBS_ERROR',
          message: 'Failed to get failed jobs'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Retry failed jobs
   * POST /api/admin/search/retry-jobs
   */
  static async retryFailedJobs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          },
          requestId: req.requestId
        });
      }

      const { queue = 'index', jobIds = [] } = req.body;

      await QueueService.retryFailedJobs(queue, jobIds);

      res.json({
        success: true,
        data: {
          message: jobIds.length > 0 
            ? `Retried ${jobIds.length} specific jobs in ${queue} queue`
            : `Retried all failed jobs in ${queue} queue`,
          queue,
          jobIds
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to retry failed jobs:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'RETRY_JOBS_ERROR',
          message: 'Failed to retry failed jobs'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Clear completed jobs
   * DELETE /api/admin/search/queue/:queueName/completed
   */
  static async clearCompletedJobs(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          },
          requestId: req.requestId
        });
      }

      const { queueName } = req.params;

      await QueueService.clearCompletedJobs(queueName);

      res.json({
        success: true,
        data: {
          message: `Cleared completed jobs in ${queueName} queue`,
          queueName
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to clear completed jobs:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'CLEAR_JOBS_ERROR',
          message: 'Failed to clear completed jobs'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Pause queue processing
   * POST /api/admin/search/queue/:queueName/pause
   */
  static async pauseQueue(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          },
          requestId: req.requestId
        });
      }

      const { queueName } = req.params;

      await QueueService.pauseQueue(queueName);

      res.json({
        success: true,
        data: {
          message: `Paused ${queueName} queue`,
          queueName
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to pause queue:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PAUSE_QUEUE_ERROR',
          message: 'Failed to pause queue'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Resume queue processing
   * POST /api/admin/search/queue/:queueName/resume
   */
  static async resumeQueue(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          },
          requestId: req.requestId
        });
      }

      const { queueName } = req.params;

      await QueueService.resumeQueue(queueName);

      res.json({
        success: true,
        data: {
          message: `Resumed ${queueName} queue`,
          queueName
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to resume queue:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'RESUME_QUEUE_ERROR',
          message: 'Failed to resume queue'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Clear search index
   * DELETE /api/admin/search/index
   */
  static async clearIndex(req, res) {
    try {
      await SearchService.clearIndex();

      res.json({
        success: true,
        data: {
          message: 'Search index cleared successfully'
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Failed to clear search index:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'CLEAR_INDEX_ERROR',
          message: 'Failed to clear search index'
        },
        requestId: req.requestId
      });
    }
  }
}

module.exports = AdminSearchController;
