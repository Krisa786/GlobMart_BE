const { Product, Category, ProductImage, Inventory } = require('../database/models');
const SearchService = require('./SearchService');
const QueueService = require('./QueueService');
const { logger } = require('../middleware/errorHandler');

/**
 * Indexer Service - Handles product indexing operations
 * Manages the synchronization between database and search index
 */
class IndexerService {
  constructor() {
    this.searchService = SearchService;
    this.queueService = QueueService;
    this.isReindexing = false;
  }

  /**
   * Index a single product
   */
  async indexProduct(productId, options = {}) {
    const { force = false, skipQueue = false } = options;

    try {
      // Get product with all related data
      const product = await this.getProductForIndexing(productId);
      
      if (!product) {
        logger.warn(`Product ${productId} not found for indexing`);
        return false;
      }

      // Check if product should be indexed
      if (!this.shouldIndexProduct(product) && !force) {
        logger.debug(`Product ${productId} should not be indexed (status: ${product.status})`);
        return false;
      }

      // Transform and index the product
      const searchDocument = this.searchService.transformProductForIndex(product);
      await this.searchService.indexProduct(searchDocument);
      
      logger.info(`Successfully indexed product ${productId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to index product ${productId}:`, error);
      
      // If not skipping queue, enqueue for retry
      if (!skipQueue) {
        await this.queueService.enqueueIndexJob(productId, { retry: true });
      }
      
      throw error;
    }
  }

  /**
   * Remove a product from the search index
   */
  async removeProduct(productId, options = {}) {
    const { skipQueue = false } = options;

    try {
      await this.searchService.removeProduct(productId);
      logger.info(`Successfully removed product ${productId} from index`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove product ${productId} from index:`, error);
      
      // If not skipping queue, enqueue for retry
      if (!skipQueue) {
        await this.queueService.enqueueRemoveJob(productId, { retry: true });
      }
      
      throw error;
    }
  }

  /**
   * Reindex all products
   */
  async reindexAll(options = {}) {
    const { 
      batchSize = 100, 
      dryRun = false,
      clearFirst = true,
      progressCallback = null 
    } = options;

    if (this.isReindexing) {
      throw new Error('Reindexing is already in progress');
    }

    this.isReindexing = true;
    let processed = 0;
    let indexed = 0;
    let errors = 0;

    try {
      logger.info('Starting full product reindexing...');

      // Clear index first if requested
      if (clearFirst && !dryRun) {
        await this.searchService.clearIndex();
        logger.info('Cleared search index');
      }

      // Get total count for progress tracking
      const totalCount = await Product.count({
        where: {
          deleted_at: null
        }
      });

      logger.info(`Found ${totalCount} products to process`);

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        // Get batch of products
        const products = await this.getProductsBatch(offset, batchSize);
        
        if (products.length === 0) {
          hasMore = false;
          break;
        }

        // Process batch
        for (const product of products) {
          try {
            processed++;
            
            if (dryRun) {
              logger.debug(`[DRY RUN] Would index product ${product.id}: ${product.title}`);
              indexed++;
            } else {
              const shouldIndex = this.shouldIndexProduct(product);
              
              if (shouldIndex) {
                const searchDocument = this.searchService.transformProductForIndex(product);
                await this.searchService.indexProduct(searchDocument);
                indexed++;
                logger.debug(`Indexed product ${product.id}: ${product.title}`);
              } else {
                logger.debug(`Skipped product ${product.id} (status: ${product.status})`);
              }
            }

            // Report progress
            if (progressCallback && processed % 10 === 0) {
              progressCallback({
                processed,
                total: totalCount,
                indexed,
                errors,
                percentage: Math.round((processed / totalCount) * 100)
              });
            }
          } catch (error) {
            errors++;
            logger.error(`Failed to index product ${product.id}:`, error);
          }
        }

        offset += batchSize;
        
        // Small delay to prevent overwhelming the search service
        if (!dryRun) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const result = {
        processed,
        indexed,
        errors,
        total: totalCount,
        success: errors === 0
      };

      logger.info('Reindexing completed:', result);
      return result;

    } catch (error) {
      logger.error('Reindexing failed:', error);
      throw error;
    } finally {
      this.isReindexing = false;
    }
  }

  /**
   * Get products batch for reindexing
   */
  async getProductsBatch(offset, limit) {
    return await Product.findAll({
      where: {
        deleted_at: null
      },
      include: [
        { 
          model: Category, 
          as: 'category',
          include: [
            { model: Category, as: 'parent' }
          ]
        },
        { 
          model: ProductImage, 
          as: 'images',
          order: [['position', 'ASC']],
          limit: 1
        },
        { model: Inventory, as: 'inventory' }
      ],
      order: [['id', 'ASC']],
      limit,
      offset
    });
  }

  /**
   * Get a single product with all related data for indexing
   */
  async getProductForIndexing(productId) {
    return await Product.findByPk(productId, {
      where: {
        deleted_at: null
      },
      include: [
        { 
          model: Category, 
          as: 'category',
          include: [
            { model: Category, as: 'parent' }
          ]
        },
        { 
          model: ProductImage, 
          as: 'images',
          order: [['position', 'ASC']],
          limit: 1
        },
        { model: Inventory, as: 'inventory' }
      ]
    });
  }

  /**
   * Check if a product should be indexed
   */
  shouldIndexProduct(product) {
    // Only index published products that are not deleted
    return product.status === 'published' && !product.deleted_at;
  }

  /**
   * Handle product creation - enqueue for indexing
   */
  async handleProductCreated(productId) {
    try {
      await this.queueService.enqueueIndexJob(productId);
      logger.debug(`Enqueued product ${productId} for indexing after creation`);
    } catch (error) {
      logger.error(`Failed to enqueue product ${productId} for indexing:`, error);
    }
  }

  /**
   * Handle product update - enqueue for indexing
   */
  async handleProductUpdated(productId) {
    try {
      await this.queueService.enqueueIndexJob(productId);
      logger.debug(`Enqueued product ${productId} for indexing after update`);
    } catch (error) {
      logger.error(`Failed to enqueue product ${productId} for indexing:`, error);
    }
  }

  /**
   * Handle product deletion - enqueue for removal
   */
  async handleProductDeleted(productId) {
    try {
      await this.queueService.enqueueRemoveJob(productId);
      logger.debug(`Enqueued product ${productId} for removal from index`);
    } catch (error) {
      logger.error(`Failed to enqueue product ${productId} for removal:`, error);
    }
  }

  /**
   * Handle inventory change - enqueue for reindexing
   */
  async handleInventoryChanged(productId) {
    try {
      await this.queueService.enqueueIndexJob(productId);
      logger.debug(`Enqueued product ${productId} for reindexing after inventory change`);
    } catch (error) {
      logger.error(`Failed to enqueue product ${productId} for reindexing:`, error);
    }
  }

  /**
   * Get indexing status and statistics
   */
  async getIndexingStatus() {
    try {
      const stats = await this.searchService.getIndexStats();
      const isHealthy = await this.searchService.isHealthy();
      
      return {
        isHealthy,
        isReindexing: this.isReindexing,
        indexStats: stats,
        queueStats: await this.queueService.getQueueStats()
      };
    } catch (error) {
      logger.error('Failed to get indexing status:', error);
      return {
        isHealthy: false,
        isReindexing: this.isReindexing,
        error: error.message
      };
    }
  }

  /**
   * Compare database and index counts
   */
  async compareCounts() {
    try {
      // Get database count
      const dbCount = await Product.count({
        where: {
          status: 'published',
          deleted_at: null
        }
      });

      // Get index count
      const indexStats = await this.searchService.getIndexStats();
      const indexCount = indexStats.numberOfDocuments;

      return {
        database: dbCount,
        index: indexCount,
        difference: dbCount - indexCount,
        inSync: dbCount === indexCount
      };
    } catch (error) {
      logger.error('Failed to compare counts:', error);
      throw error;
    }
  }
}

module.exports = new IndexerService();
