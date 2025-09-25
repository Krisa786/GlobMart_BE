const CheckoutService = require('../services/CheckoutService');
const { logger } = require('../middleware/errorHandler');

class CheckoutController {
  /**
   * Create checkout session
   * @route POST /api/checkout/session
   */
  static async createSession(req, res) {
    try {
      const { 
        cart_id, 
        shipping_address, 
        billing_address, 
        shipping_method 
      } = req.body;
      
      const userId = req.auth?.userId || null;

      // Validate required fields
      if (!cart_id) {
        return res.status(400).json({
          error: {
            code: 'MISSING_CART_ID',
            message: 'Cart ID is required'
          }
        });
      }

      if (!shipping_address) {
        return res.status(400).json({
          error: {
            code: 'MISSING_SHIPPING_ADDRESS',
            message: 'Shipping address is required'
          }
        });
      }

      if (!billing_address) {
        return res.status(400).json({
          error: {
            code: 'MISSING_BILLING_ADDRESS',
            message: 'Billing address is required'
          }
        });
      }

      if (!shipping_method) {
        return res.status(400).json({
          error: {
            code: 'MISSING_SHIPPING_METHOD',
            message: 'Shipping method is required'
          }
        });
      }

      const result = await CheckoutService.createSession(
        cart_id,
        shipping_address,
        billing_address,
        shipping_method,
        userId
      );

      logger.info('Checkout session created successfully', {
        checkoutId: result.checkout_id,
        cartId: cart_id,
        userId,
        amount: result.amount,
        currency: result.currency,
        requestId: req.requestId
      });

      res.status(201).json({
        data: result
      });
    } catch (error) {
      logger.error('Failed to create checkout session:', {
        error: error.message,
        cartId: req.body.cart_id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      // Handle specific error cases
      if (error.message === 'Cart not found or access denied') {
        return res.status(404).json({
          error: {
            code: 'CART_NOT_FOUND',
            message: 'Cart not found or access denied'
          }
        });
      }

      if (error.message === 'Cart is empty') {
        return res.status(400).json({
          error: {
            code: 'EMPTY_CART',
            message: 'Cart is empty'
          }
        });
      }

      if (error.message.includes('Insufficient stock')) {
        return res.status(400).json({
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: error.message
          }
        });
      }

      if (error.message.includes('Shipping method') && error.message.includes('not available')) {
        return res.status(400).json({
          error: {
            code: 'SHIPPING_UNAVAILABLE',
            message: error.message
          }
        });
      }

      if (error.message.includes('address') || error.message.includes('Address')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ADDRESS',
            message: error.message
          }
        });
      }

      if (error.message.includes('postal code') || error.message.includes('Postal code')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_POSTAL_CODE',
            message: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'CHECKOUT_SESSION_ERROR',
          message: 'Failed to create checkout session'
        }
      });
    }
  }

  /**
   * Get checkout session
   * @route GET /api/checkout/session/:id
   */
  static async getSession(req, res) {
    try {
      const checkoutId = parseInt(req.params.id);
      const userId = req.auth?.userId || null;

      if (!checkoutId || isNaN(checkoutId)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CHECKOUT_ID',
            message: 'Valid checkout ID is required'
          }
        });
      }

      const result = await CheckoutService.getSession(checkoutId, userId);

      res.status(200).json({
        data: result
      });
    } catch (error) {
      logger.error('Failed to get checkout session:', {
        error: error.message,
        checkoutId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Checkout session not found') {
        return res.status(404).json({
          error: {
            code: 'CHECKOUT_NOT_FOUND',
            message: 'Checkout session not found'
          }
        });
      }

      if (error.message === 'Access denied') {
        return res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied to checkout session'
          }
        });
      }

      if (error.message === 'Checkout session has expired') {
        return res.status(410).json({
          error: {
            code: 'CHECKOUT_EXPIRED',
            message: 'Checkout session has expired'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'CHECKOUT_FETCH_ERROR',
          message: 'Failed to fetch checkout session'
        }
      });
    }
  }

  /**
   * Release stock reservations (for expired sessions)
   * @route POST /api/checkout/session/:id/release
   */
  static async releaseReservations(req, res) {
    try {
      const checkoutId = parseInt(req.params.id);

      if (!checkoutId || isNaN(checkoutId)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CHECKOUT_ID',
            message: 'Valid checkout ID is required'
          }
        });
      }

      await CheckoutService.releaseReservations(checkoutId);

      logger.info('Stock reservations released successfully', {
        checkoutId,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(200).json({
        message: 'Stock reservations released successfully'
      });
    } catch (error) {
      logger.error('Failed to release reservations:', {
        error: error.message,
        checkoutId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Checkout session not found') {
        return res.status(404).json({
          error: {
            code: 'CHECKOUT_NOT_FOUND',
            message: 'Checkout session not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'RESERVATION_RELEASE_ERROR',
          message: 'Failed to release stock reservations'
        }
      });
    }
  }

  /**
   * Confirm reservations (when order is placed)
   * @route POST /api/checkout/session/:id/confirm
   */
  static async confirmReservations(req, res) {
    try {
      const checkoutId = parseInt(req.params.id);

      if (!checkoutId || isNaN(checkoutId)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_CHECKOUT_ID',
            message: 'Valid checkout ID is required'
          }
        });
      }

      await CheckoutService.confirmReservations(checkoutId);

      logger.info('Stock reservations confirmed successfully', {
        checkoutId,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(200).json({
        message: 'Stock reservations confirmed successfully'
      });
    } catch (error) {
      logger.error('Failed to confirm reservations:', {
        error: error.message,
        checkoutId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Checkout session not found') {
        return res.status(404).json({
          error: {
            code: 'CHECKOUT_NOT_FOUND',
            message: 'Checkout session not found'
          }
        });
      }

      if (error.message === 'Checkout session has expired') {
        return res.status(410).json({
          error: {
            code: 'CHECKOUT_EXPIRED',
            message: 'Checkout session has expired'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'RESERVATION_CONFIRM_ERROR',
          message: 'Failed to confirm stock reservations'
        }
      });
    }
  }

  /**
   * Get available shipping methods for an address
   * @route POST /api/checkout/shipping-methods
   */
  static async getShippingMethods(req, res) {
    try {
      const { shipping_address, cart_items } = req.body;

      if (!shipping_address) {
        return res.status(400).json({
          error: {
            code: 'MISSING_SHIPPING_ADDRESS',
            message: 'Shipping address is required'
          }
        });
      }

      if (!cart_items || !Array.isArray(cart_items)) {
        return res.status(400).json({
          error: {
            code: 'MISSING_CART_ITEMS',
            message: 'Cart items are required'
          }
        });
      }

      const ShippingService = require('../services/ShippingService');
      const methods = await ShippingService.getAvailableShippingMethods(shipping_address, cart_items);

      res.status(200).json({
        data: methods
      });
    } catch (error) {
      logger.error('Failed to get shipping methods:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'SHIPPING_METHODS_ERROR',
          message: 'Failed to get shipping methods'
        }
      });
    }
  }

  /**
   * Calculate shipping cost
   * @route POST /api/checkout/shipping-cost
   */
  static async calculateShippingCost(req, res) {
    try {
      const { 
        shipping_address, 
        cart_items, 
        shipping_method = 'standard',
        currency = 'INR'
      } = req.body;

      if (!shipping_address) {
        return res.status(400).json({
          error: {
            code: 'MISSING_SHIPPING_ADDRESS',
            message: 'Shipping address is required'
          }
        });
      }

      if (!cart_items || !Array.isArray(cart_items)) {
        return res.status(400).json({
          error: {
            code: 'MISSING_CART_ITEMS',
            message: 'Cart items are required'
          }
        });
      }

      const ShippingService = require('../services/ShippingService');
      const result = await ShippingService.calculateShipping(
        shipping_address, 
        cart_items, 
        shipping_method, 
        currency
      );

      res.status(200).json({
        data: result
      });
    } catch (error) {
      logger.error('Failed to calculate shipping cost:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message.includes('not available')) {
        return res.status(400).json({
          error: {
            code: 'SHIPPING_UNAVAILABLE',
            message: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'SHIPPING_CALCULATION_ERROR',
          message: 'Failed to calculate shipping cost'
        }
      });
    }
  }

  /**
   * Calculate tax
   * @route POST /api/checkout/tax
   */
  static async calculateTax(req, res) {
    try {
      const { 
        shipping_address, 
        cart_items, 
        currency = 'INR',
        customer_info = {}
      } = req.body;

      if (!shipping_address) {
        return res.status(400).json({
          error: {
            code: 'MISSING_SHIPPING_ADDRESS',
            message: 'Shipping address is required'
          }
        });
      }

      if (!cart_items || !Array.isArray(cart_items)) {
        return res.status(400).json({
          error: {
            code: 'MISSING_CART_ITEMS',
            message: 'Cart items are required'
          }
        });
      }

      const TaxService = require('../services/TaxService');
      const result = await TaxService.calculateTaxWithExemptions(
        shipping_address, 
        cart_items, 
        currency, 
        customer_info
      );

      res.status(200).json({
        data: result
      });
    } catch (error) {
      logger.error('Failed to calculate tax:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'TAX_CALCULATION_ERROR',
          message: 'Failed to calculate tax'
        }
      });
    }
  }
}

module.exports = CheckoutController;
