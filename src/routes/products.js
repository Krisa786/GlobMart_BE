const express = require('express');
const router = express.Router();

// Import middleware
const { validateQuery } = require('../validation/productSchemas');
const { productQuerySchema } = require('../validation/productSchemas');

// Import controllers
const ProductController = require('../controllers/ProductController');

/**
 * @route   GET /api/products
 * @desc    Get products with filters (Public)
 * @access  Public
 * @query   { q?, category?, minPrice?, maxPrice?, badge?, sort?, page?, limit? }
 */
router.get('/',
  validateQuery(productQuerySchema),
  ProductController.getProducts
);

/**
 * @route   GET /api/products/:slug
 * @desc    Get product by slug (Public)
 * @access  Public
 */
router.get('/:slug',
  ProductController.getProductBySlug
);

module.exports = router;
