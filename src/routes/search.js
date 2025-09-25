const express = require('express');
const { body, query, param } = require('express-validator');
const SearchController = require('../controllers/SearchController');
// Note: Rate limiting is already applied globally in server.js

const router = express.Router();

/**
 * @swagger
 * /api/search/products:
 *   get:
 *     summary: Search products
 *     description: Search for products with filters and pagination
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *         example: "eco straws"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category slug filter
 *         example: "drinkware"
 *       - in: query
 *         name: badge
 *         schema:
 *           type: string
 *         description: Sustainability badge filter
 *         example: "FSC"
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *         example: 10
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *         example: 100
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [relevance, price, newest, oldest]
 *         description: Sort order
 *         example: "price"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Results per page
 *         example: 20
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           slug:
 *                             type: string
 *                           title:
 *                             type: string
 *                           price:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           badges:
 *                             type: array
 *                             items:
 *                               type: string
 *                           in_stock:
 *                             type: boolean
 *                           image_url:
 *                             type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                     meta:
 *                       type: object
 *                       properties:
 *                         query:
 *                           type: string
 *                         processingTimeMs:
 *                           type: integer
 *                         searchEngine:
 *                           type: string
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Search service error
 */
router.get('/products', [
  query('q').optional().isString().isLength({ max: 200 }).trim(),
  query('category').optional().isString().isLength({ max: 100 }).trim(),
  query('badge').optional().isString().isLength({ max: 50 }).trim(),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('sort').optional().isIn(['relevance', 'price', 'newest', 'oldest']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], SearchController.searchProducts);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions
 *     description: Get autocomplete suggestions for search queries
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *         example: "eco"
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *       500:
 *         description: Suggestions service error
 */
router.get('/suggestions', [
  query('q').isString().isLength({ min: 2, max: 100 }).trim()
], SearchController.getSearchSuggestions);

/**
 * @swagger
 * /api/search/filters:
 *   get:
 *     summary: Get search filters
 *     description: Get available filters for search
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for context
 *         example: "kitchen"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category slug for context
 *         example: "kitchen"
 *     responses:
 *       200:
 *         description: Available filters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     filters:
 *                       type: object
 *                       properties:
 *                         categories:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               slug:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         badges:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               slug:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               count:
 *                                 type: integer
 *                         priceRanges:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               min:
 *                                 type: number
 *                               max:
 *                                 type: number
 *                               label:
 *                                 type: string
 *       500:
 *         description: Filters service error
 */
router.get('/filters', [
  query('q').optional().isString().isLength({ max: 200 }).trim(),
  query('category').optional().isString().isLength({ max: 100 }).trim()
], SearchController.getSearchFilters);

/**
 * @swagger
 * /api/search/health:
 *   get:
 *     summary: Get search service health
 *     description: Check the health status of the search service
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Search service health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     healthy:
 *                       type: boolean
 *                     stats:
 *                       type: object
 *                       properties:
 *                         numberOfDocuments:
 *                           type: integer
 *                         isIndexing:
 *                           type: boolean
 *                         lastUpdate:
 *                           type: string
 *       500:
 *         description: Health check error
 */
router.get('/health', SearchController.getSearchHealth);

module.exports = router;
