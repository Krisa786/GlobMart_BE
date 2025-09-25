const express = require('express');
const router = express.Router();

// Import middleware
const { 
  validate, 
  validateParams, 
  createCheckoutSessionSchema, 
  getCheckoutSessionSchema,
  shippingMethodsSchema,
  shippingCostSchema,
  taxCalculationSchema
} = require('../validation/checkoutSchemas');
const { authenticateAccessToken } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiter');

// Import controllers
const CheckoutController = require('../controllers/CheckoutController');

/**
 * @route   POST /api/checkout/session
 * @desc    Create checkout session with address capture, pricing, and stock reservation
 * @access  Public (with optional authentication)
 * @body    { cart_id, shipping_address, billing_address, shipping_method }
 */
router.post('/session',
  rateLimiters.public,
  validate(createCheckoutSessionSchema),
  CheckoutController.createSession
);

/**
 * @route   GET /api/checkout/session/:id
 * @desc    Get checkout session details
 * @access  Public (with optional authentication)
 * @params  { id: checkout_id }
 */
router.get('/session/:id',
  rateLimiters.public,
  validateParams(getCheckoutSessionSchema),
  CheckoutController.getSession
);

/**
 * @route   POST /api/checkout/session/:id/release
 * @desc    Release stock reservations for expired checkout session
 * @access  Private (admin only) or Public (for expired sessions)
 * @params  { id: checkout_id }
 */
router.post('/session/:id/release',
  rateLimiters.public,
  validateParams(getCheckoutSessionSchema),
  CheckoutController.releaseReservations
);

/**
 * @route   POST /api/checkout/session/:id/confirm
 * @desc    Confirm stock reservations when order is placed
 * @access  Private (authentication required)
 * @params  { id: checkout_id }
 */
router.post('/session/:id/confirm',
  rateLimiters.public,
  authenticateAccessToken,
  validateParams(getCheckoutSessionSchema),
  CheckoutController.confirmReservations
);

/**
 * @route   POST /api/checkout/shipping-methods
 * @desc    Get available shipping methods for an address
 * @access  Public
 * @body    { shipping_address, cart_items }
 */
router.post('/shipping-methods',
  rateLimiters.public,
  validate(shippingMethodsSchema),
  CheckoutController.getShippingMethods
);

/**
 * @route   POST /api/checkout/shipping-cost
 * @desc    Calculate shipping cost for address and items
 * @access  Public
 * @body    { shipping_address, cart_items, shipping_method?, currency? }
 */
router.post('/shipping-cost',
  rateLimiters.public,
  validate(shippingCostSchema),
  CheckoutController.calculateShippingCost
);

/**
 * @route   POST /api/checkout/tax
 * @desc    Calculate tax for address and items
 * @access  Public
 * @body    { shipping_address, cart_items, currency?, customer_info? }
 */
router.post('/tax',
  rateLimiters.public,
  validate(taxCalculationSchema),
  CheckoutController.calculateTax
);

module.exports = router;
