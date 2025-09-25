const { MeiliSearch } = require('meilisearch');
const { logger } = require('../middleware/errorHandler');

/**
 * Search Service - Adapter pattern for search engines
 * Currently implements Meilisearch, designed to be easily swappable with Elasticsearch
 */
class SearchService {
  constructor() {
    this.client = null;
    this.indexName = process.env.MEILISEARCH_INDEX_PRODUCTS || 'products';
    this.initialized = false;
  }

  /**
   * Initialize the search client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const searchEngine = process.env.SEARCH_ENGINE || 'meilisearch';
      
      if (searchEngine === 'meilisearch') {
        await this.initializeMeilisearch();
      } else {
        throw new Error(`Unsupported search engine: ${searchEngine}`);
      }

      this.initialized = true;
      logger.info(`Search service initialized with ${searchEngine}`);
    } catch (error) {
      logger.error('Failed to initialize search service:', error);
      throw error;
    }
  }

  /**
   * Initialize Meilisearch client
   */
  async initializeMeilisearch() {
    const host = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
    const apiKey = process.env.MEILISEARCH_API_KEY;

    if (!apiKey) {
      throw new Error('MEILISEARCH_API_KEY is required');
    }

    this.client = new MeiliSearch({
      host,
      apiKey
    });

    // Test connection
    await this.client.health();
    
    // Ensure index exists and configure it
    await this.ensureIndexExists();
  }

  /**
   * Ensure the products index exists with proper configuration
   */
  async ensureIndexExists() {
    try {
      const index = this.client.index(this.indexName);
      
      // Check if index exists
      try {
        await index.getStats();
        logger.info(`Index ${this.indexName} already exists`);
      } catch (error) {
        // Index doesn't exist, create it
        await index.createIndex();
        logger.info(`Created index ${this.indexName}`);
      }

      // Configure searchable attributes
      await index.updateSearchableAttributes([
        'title',
        'short_desc',
        'brand',
        'badges'
      ]);

      // Configure filterable attributes
      await index.updateFilterableAttributes([
        'category_slug',
        'badges',
        'price',
        'in_stock'
      ]);

      // Configure sortable attributes
      await index.updateSortableAttributes([
        'price',
        'updated_at'
      ]);

      // Configure synonyms (optional)
      await this.configureSynonyms(index);

      logger.info(`Index ${this.indexName} configured successfully`);
    } catch (error) {
      logger.error(`Failed to configure index ${this.indexName}:`, error);
      throw error;
    }
  }

  /**
   * Configure synonyms for better search results
   */
  async configureSynonyms(index) {
    const synonyms = {
      'eco': ['sustainable', 'green', 'environmentally friendly'],
      'sustainable': ['eco', 'green', 'environmentally friendly'],
      'green': ['eco', 'sustainable', 'environmentally friendly'],
      'hair dryer': ['blow dryer', 'hair dryer'],
      'blow dryer': ['hair dryer', 'hair dryer'],
      'towel': ['bath towel', 'hand towel'],
      'bath towel': ['towel', 'hand towel'],
      'hand towel': ['towel', 'bath towel']
    };

    try {
      await index.updateSynonyms(synonyms);
      logger.info('Synonyms configured successfully');
    } catch (error) {
      logger.warn('Failed to configure synonyms:', error.message);
    }
  }

  /**
   * Search products
   */
  async searchProducts(query, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      page = 1,
      limit = 20,
      category = null,
      badge = null,
      minPrice = null,
      maxPrice = null,
      sort = 'relevance'
    } = options;

    try {
      const index = this.client.index(this.indexName);
      
      // Build filters
      const filters = [];
      if (category) {
        filters.push(`category_slug = "${category}"`);
      }
      if (badge) {
        filters.push(`badges = "${badge}"`);
      }
      if (minPrice !== null || maxPrice !== null) {
        let priceFilter = 'price';
        if (minPrice !== null && maxPrice !== null) {
          priceFilter += ` ${minPrice} TO ${maxPrice}`;
        } else if (minPrice !== null) {
          priceFilter += ` >= ${minPrice}`;
        } else if (maxPrice !== null) {
          priceFilter += ` <= ${maxPrice}`;
        }
        filters.push(priceFilter);
      }

      // Build sort
      let sortArray = [];
      if (sort === 'price') {
        sortArray = ['price:asc'];
      } else if (sort === 'newest') {
        sortArray = ['updated_at:desc'];
      } else if (sort === 'oldest') {
        sortArray = ['updated_at:asc'];
      }

      const searchParams = {
        q: query || '',
        limit,
        offset: (page - 1) * limit,
        attributesToRetrieve: [
          'id',
          'slug',
          'title',
          'price',
          'badges',
          'in_stock',
          'image_url'
        ],
        attributesToHighlight: ['title', 'short_desc', 'brand'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>'
      };

      if (filters.length > 0) {
        searchParams.filter = filters.join(' AND ');
      }

      if (sortArray.length > 0) {
        searchParams.sort = sortArray;
      }

      const results = await index.search(searchParams);

      return {
        hits: results.hits || [],
        total: results.estimatedTotalHits || 0,
        page,
        limit,
        totalPages: Math.ceil((results.estimatedTotalHits || 0) / limit),
        hasNextPage: page < Math.ceil((results.estimatedTotalHits || 0) / limit),
        hasPrevPage: page > 1,
        processingTimeMs: results.processingTimeMs,
        query: results.query
      };
    } catch (error) {
      logger.error('Search failed:', error);
      throw new Error('Search service temporarily unavailable');
    }
  }

  /**
   * Add or update a product in the search index
   */
  async indexProduct(productData) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const index = this.client.index(this.indexName);
      
      // Transform product data to search index format
      const searchDocument = this.transformProductForIndex(productData);
      
      await index.addDocuments([searchDocument]);
      logger.debug(`Indexed product ${productData.id}`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to index product ${productData.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a product from the search index
   */
  async removeProduct(productId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const index = this.client.index(this.indexName);
      await index.deleteDocument(productId);
      logger.debug(`Removed product ${productId} from index`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to remove product ${productId} from index:`, error);
      throw error;
    }
  }

  /**
   * Transform product data to search index format
   */
  transformProductForIndex(product) {
    // Get category path
    const categoryPath = product.category ? this.buildCategoryPath(product.category) : [];
    const categorySlug = product.category ? product.category.slug : null;

    // Get primary image URL
    const imageUrl = product.images && product.images.length > 0 
      ? product.images[0].url 
      : null;

    // Check stock status
    const inStock = product.inventory ? product.inventory.quantity > 0 : false;

    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      short_desc: product.short_desc || '',
      category_path: categoryPath,
      category_slug: categorySlug,
      brand: product.brand || '',
      price: parseFloat(product.price) || 0,
      currency: product.currency || 'USD',
      badges: product.sustainability_badges || [],
      in_stock: inStock,
      image_url: imageUrl,
      updated_at: product.updated_at || new Date().toISOString()
    };
  }

  /**
   * Build category path from category hierarchy
   */
  buildCategoryPath(category) {
    const path = [];
    let current = category;

    while (current) {
      path.unshift(current.slug);
      current = current.parent;
    }

    return path;
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const index = this.client.index(this.indexName);
      const stats = await index.getStats();
      
      return {
        numberOfDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
        fieldDistribution: stats.fieldDistribution,
        lastUpdate: stats.lastUpdate
      };
    } catch (error) {
      logger.error('Failed to get index stats:', error);
      throw error;
    }
  }

  /**
   * Check if search service is healthy
   */
  async isHealthy() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      await this.client.health();
      return true;
    } catch (error) {
      logger.error('Search service health check failed:', error);
      return false;
    }
  }

  /**
   * Clear all documents from the index
   */
  async clearIndex() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const index = this.client.index(this.indexName);
      await index.deleteAllDocuments();
      logger.info(`Cleared all documents from index ${this.indexName}`);
      
      return true;
    } catch (error) {
      logger.error(`Failed to clear index ${this.indexName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new SearchService();
