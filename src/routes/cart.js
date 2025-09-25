const express = require('express');
const router = express.Router();

// Import middleware
const { validate, validateQuery, validateParams } = require('../validation/cartSchemas');
const { 
  createCartSchema, 
  addItemSchema, 
  updateItemSchema, 
  mergeCartSchema, 
  cartQuerySchema 
} = require('../validation/cartSchemas');
const { authenticateAccessToken } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiter');

// Import controllers
const CartController = require('../controllers/CartController');

/**
 * @route   POST /api/cart
 * @desc    Create or retrieve current cart
 * @access  Public (with optional authentication)
 * @body    { cart_token?, currency? }
 */
router.post('/',
  rateLimiters.public,
  validate(createCartSchema),
  CartController.createOrGetCart
);

/**
 * @route   GET /api/cart
 * @desc    Get current cart
 * @access  Public (with optional authentication)
 * @query   { cart_token?, include_items? }
 */
router.get('/',
  rateLimiters.public,
  validateQuery(cartQuerySchema),
  CartController.getCart
);

/**
 * @route   POST /api/cart/items
 * @desc    Add item to cart
 * @access  Public (with optional authentication)
 * @body    { sku, qty }
 * @query   { cart_token? }
 */
router.post('/items',
  rateLimiters.public,
  validate(addItemSchema),
  CartController.addItem
);

/**
 * @route   PATCH /api/cart/items/:id
 * @desc    Update cart item quantity
 * @access  Public (with optional authentication)
 * @body    { qty }
 * @query   { cart_token? }
 */
router.patch('/items/:id',
  rateLimiters.public,
  validateParams(require('joi').object({
    id: require('joi').number().integer().positive().required()
  })),
  validate(updateItemSchema),
  CartController.updateItem
);

/**
 * @route   DELETE /api/cart/items/:id
 * @desc    Remove item from cart
 * @access  Public (with optional authentication)
 * @query   { cart_token? }
 */
router.delete('/items/:id',
  rateLimiters.public,
  validateParams(require('joi').object({
    id: require('joi').number().integer().positive().required()
  })),
  CartController.removeItem
);

/**
 * @route   POST /api/cart/merge
 * @desc    Merge guest cart with user cart
 * @access  Private (authentication required)
 * @body    { guest_cart_token }
 */
router.post('/merge',
  rateLimiters.public,
  authenticateAccessToken,
  validate(mergeCartSchema),
  CartController.mergeCart
);

/**
 * @route   POST /api/cart/reprice
 * @desc    Reprice cart items with current product prices
 * @access  Public (with optional authentication)
 * @query   { cart_token? }
 */
router.post('/reprice',
  rateLimiters.public,
  validateQuery(cartQuerySchema),
  CartController.repriceCart
);

/**
 * @route   DELETE /api/cart
 * @desc    Clear cart (remove all items)
 * @access  Public (with optional authentication)
 * @query   { cart_token? }
 */
router.delete('/',
  rateLimiters.public,
  validateQuery(cartQuerySchema),
  CartController.clearCart
);

/**
 * @route   POST /api/cart/convert
 * @desc    Mark cart as converted (order placed)
 * @access  Public (with optional authentication)
 * @query   { cart_token? }
 */
router.post('/convert',
  rateLimiters.public,
  validateQuery(cartQuerySchema),
  CartController.markAsConverted
);

module.exports = router;
