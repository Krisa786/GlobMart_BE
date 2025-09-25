const SearchService = require('../services/SearchService');
const { logger } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');

/**
 * Search Controller - Handles search-related API endpoints
 */
class SearchController {
  /**
   * Search products
   * GET /api/search/products
   */
  static async searchProducts(req, res) {
    try {
      // Check for validation errors
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

      const {
        q: query = '',
        category,
        badge,
        minPrice,
        maxPrice,
        sort = 'relevance',
        page = 1,
        limit = 20
      } = req.query;

      // Validate and parse parameters
      const searchOptions = {
        page: Math.max(1, parseInt(page)),
        limit: Math.min(100, Math.max(1, parseInt(limit))),
        category: category || null,
        badge: badge || null,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        sort: ['relevance', 'price', 'newest', 'oldest'].includes(sort) ? sort : 'relevance'
      };

      // Validate price range
      if (searchOptions.minPrice !== null && searchOptions.maxPrice !== null) {
        if (searchOptions.minPrice > searchOptions.maxPrice) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PRICE_RANGE',
              message: 'Minimum price cannot be greater than maximum price'
            },
            requestId: req.requestId
          });
        }
      }

      // Perform search
      const results = await SearchService.searchProducts(query, searchOptions);

      // Transform results for API response
      const transformedResults = {
        success: true,
        data: {
          products: results.hits.map(hit => ({
            id: hit.id,
            slug: hit.slug,
            title: hit.title,
            price: hit.price,
            currency: hit.currency,
            badges: hit.badges,
            in_stock: hit.in_stock,
            image_url: hit.image_url,
            _formatted: hit._formatted // Meilisearch highlighting
          })),
          pagination: {
            total: results.total,
            page: results.page,
            limit: results.limit,
            totalPages: results.totalPages,
            hasNextPage: results.hasNextPage,
            hasPrevPage: results.hasPrevPage
          },
          meta: {
            query: results.query,
            processingTimeMs: results.processingTimeMs,
            searchEngine: 'meilisearch'
          }
        },
        requestId: req.requestId
      };

      // Log search for analytics (without sensitive data)
      logger.info('Product search performed', {
        query: query.substring(0, 100), // Truncate long queries
        resultsCount: results.total,
        processingTime: results.processingTimeMs,
        requestId: req.requestId
      });

      res.json(transformedResults);

    } catch (error) {
      logger.error('Search failed:', {
        error: error.message,
        stack: error.stack,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Search service temporarily unavailable'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Get search suggestions/autocomplete
   * GET /api/search/suggestions
   */
  static async getSearchSuggestions(req, res) {
    try {
      const { q: query = '' } = req.query;

      if (query.length < 2) {
        return res.json({
          success: true,
          data: {
            suggestions: []
          },
          requestId: req.requestId
        });
      }

      // For now, return empty suggestions
      // This can be enhanced with a dedicated suggestions index
      res.json({
        success: true,
        data: {
          suggestions: []
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Search suggestions failed:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SUGGESTIONS_ERROR',
          message: 'Search suggestions temporarily unavailable'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Get search filters/facets
   * GET /api/search/filters
   */
  static async getSearchFilters(req, res) {
    try {
      const { q: query = '', category } = req.query;

      // For now, return static filters
      // This can be enhanced to return dynamic filters based on search results
      const filters = {
        categories: [
          { slug: 'kitchen', name: 'Kitchen', count: 0 },
          { slug: 'bathroom', name: 'Bathroom', count: 0 },
          { slug: 'bedroom', name: 'Bedroom', count: 0 },
          { slug: 'cleaning', name: 'Cleaning', count: 0 }
        ],
        badges: [
          { slug: 'FSC', name: 'FSC Certified', count: 0 },
          { slug: 'Recycled', name: 'Recycled', count: 0 },
          { slug: 'Organic', name: 'Organic', count: 0 },
          { slug: 'Biodegradable', name: 'Biodegradable', count: 0 }
        ],
        priceRanges: [
          { min: 0, max: 50, label: 'Under $50' },
          { min: 50, max: 100, label: '$50 - $100' },
          { min: 100, max: 200, label: '$100 - $200' },
          { min: 200, max: null, label: 'Over $200' }
        ]
      };

      res.json({
        success: true,
        data: {
          filters
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Search filters failed:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'FILTERS_ERROR',
          message: 'Search filters temporarily unavailable'
        },
        requestId: req.requestId
      });
    }
  }

  /**
   * Get search health status
   * GET /api/search/health
   */
  static async getSearchHealth(req, res) {
    try {
      const isHealthy = await SearchService.isHealthy();
      const stats = await SearchService.getIndexStats();

      res.json({
        success: true,
        data: {
          healthy: isHealthy,
          stats: {
            numberOfDocuments: stats.numberOfDocuments,
            isIndexing: stats.isIndexing,
            lastUpdate: stats.lastUpdate
          }
        },
        requestId: req.requestId
      });

    } catch (error) {
      logger.error('Search health check failed:', {
        error: error.message,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Search health check failed'
        },
        requestId: req.requestId
      });
    }
  }
}

module.exports = SearchController;
