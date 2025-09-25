const express = require('express');
const router = express.Router();

// Import middleware
const { validateQuery } = require('../validation/productSchemas');
const { categoryQuerySchema } = require('../validation/productSchemas');

// Import controllers
const CategoryController = require('../controllers/CategoryController');

/**
 * @route   GET /api/categories
 * @desc    Get categories tree or flat list (Public)
 * @access  Public
 * @query   { flat? }
 */
router.get('/',
  validateQuery(categoryQuerySchema),
  CategoryController.getCategories
);

/**
 * @route   GET /api/categories/search
 * @desc    Search categories by name (Public)
 * @access  Public
 * @query   { q, limit? }
 */
router.get('/search',
  CategoryController.searchCategories
);

/**
 * @route   GET /api/categories/:slug
 * @desc    Get category by slug (Public)
 * @access  Public
 * @query   { includeProducts? }
 */
router.get('/:slug',
  CategoryController.getCategoryBySlug
);

/**
 * @route   GET /api/categories/:id/breadcrumb
 * @desc    Get category breadcrumb (Public)
 * @access  Public
 */
router.get('/:id/breadcrumb',
  CategoryController.getCategoryBreadcrumb
);

/**
 * @route   GET /api/categories/:id/products
 * @desc    Get products by category (Public)
 * @access  Public
 * @query   { page?, limit?, sortBy?, sortOrder? }
 */
router.get('/:id/products',
  CategoryController.getProductsByCategory
);

module.exports = router;
