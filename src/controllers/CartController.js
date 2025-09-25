const CartService = require('../services/CartService');
const { logger } = require('../middleware/errorHandler');

class CartController {
  /**
   * Create or retrieve current cart
   * @route POST /api/cart
   */
  static async createOrGetCart(req, res) {
    try {
      const { cart_token, currency = 'INR' } = req.body;
      const userId = req.auth?.userId || null;

      const cart = await CartService.createOrGetCart(userId, cart_token, currency);

      logger.info('Cart created/retrieved successfully', {
        cartId: cart.id,
        userId,
        cartToken: cart.cart_token,
        requestId: req.requestId
      });

      res.status(200).json({
        data: cart
      });
    } catch (error) {
      logger.error('Failed to create/retrieve cart:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'CART_CREATE_ERROR',
          message: 'Failed to create or retrieve cart'
        }
      });
    }
  }

  /**
   * Get current cart
   * @route GET /api/cart
   */
  static async getCart(req, res) {
    try {
      const { cart_token } = req.query;
      const userId = req.auth?.userId || null;

      let cart = null;

      if (userId) {
        // Get user's cart
        cart = await CartService.getCartByUserId(userId);
      } else if (cart_token) {
        // Get guest cart by token
        cart = await CartService.getCartByToken(cart_token);
      }

      if (!cart) {
        return res.status(404).json({
          error: {
            code: 'CART_NOT_FOUND',
            message: 'Cart not found'
          }
        });
      }

      res.status(200).json({
        data: cart
      });
    } catch (error) {
      logger.error('Failed to get cart:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'CART_FETCH_ERROR',
          message: 'Failed to fetch cart'
        }
      });
    }
  }

  /**
   * Add item to cart
   * @route POST /api/cart/items
   */
  static async addItem(req, res) {
    try {
      const { sku, qty } = req.body;
      const { cart_token } = req.query;
      const userId = req.auth?.userId || null;

      // Get or create cart
      let cart = null;
      if (userId) {
        cart = await CartService.getCartByUserId(userId);
      } else if (cart_token) {
        cart = await CartService.getCartByToken(cart_token);
      }

      if (!cart) {
        // Create new cart if none exists
        cart = await CartService.createOrGetCart(userId, cart_token);
      }

      const cartItem = await CartService.addItem(cart.id, sku, qty, userId);

      logger.info('Item added to cart successfully', {
        cartId: cart.id,
        itemId: cartItem.id,
        sku,
        qty,
        userId,
        requestId: req.requestId
      });

      res.status(201).json({
        data: cartItem
      });
    } catch (error) {
      logger.error('Failed to add item to cart:', {
        error: error.message,
        sku: req.body.sku,
        qty: req.body.qty,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
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

      if (error.message === 'Product is not available') {
        return res.status(400).json({
          error: {
            code: 'PRODUCT_UNAVAILABLE',
            message: 'Product is not available for purchase'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'CART_ADD_ITEM_ERROR',
          message: 'Failed to add item to cart'
        }
      });
    }
  }

  /**
   * Update cart item quantity
   * @route PATCH /api/cart/items/:id
   */
  static async updateItem(req, res) {
    try {
      const itemId = parseInt(req.params.id);
      const { qty } = req.body;
      const { cart_token } = req.query;
      const userId = req.auth?.userId || null;

      // Get cart
      let cart = null;
      if (userId) {
        cart = await CartService.getCartByUserId(userId);
      } else if (cart_token) {
        cart = await CartService.getCartByToken(cart_token);
      }

      if (!cart) {
        return res.status(404).json({
          error: {
            code: 'CART_NOT_FOUND',
            message: 'Cart not found'
          }
        });
      }

      const cartItem = await CartService.updateItem(cart.id, itemId, qty, userId);

      logger.info('Cart item updated successfully', {
        cartId: cart.id,
        itemId: cartItem.id,
        qty,
        userId,
        requestId: req.requestId
      });

      res.status(200).json({
        data: cartItem
      });
    } catch (error) {
      logger.error('Failed to update cart item:', {
        error: error.message,
        itemId: req.params.id,
        qty: req.body.qty,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Cart item not found') {
        return res.status(404).json({
          error: {
            code: 'CART_ITEM_NOT_FOUND',
            message: 'Cart item not found'
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

      res.status(500).json({
        error: {
          code: 'CART_UPDATE_ITEM_ERROR',
          message: 'Failed to update cart item'
        }
      });
    }
  }

  /**
   * Remove item from cart
   * @route DELETE /api/cart/items/:id
   */
  static async removeItem(req, res) {
    try {
      const itemId = parseInt(req.params.id);
      const { cart_token } = req.query;
      const userId = req.auth?.userId || null;

      // Get cart
      let cart = null;
      if (userId) {
        cart = await CartService.getCartByUserId(userId);
      } else if (cart_token) {
        cart = await CartService.getCartByToken(cart_token);
      }

      if (!cart) {
        return res.status(404).json({
          error: {
            code: 'CART_NOT_FOUND',
            message: 'Cart not found'
          }
        });
      }

      await CartService.removeItem(cart.id, itemId, userId);

      logger.info('Cart item removed successfully', {
        cartId: cart.id,
        itemId,
        userId,
        requestId: req.requestId
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to remove cart item:', {
        error: error.message,
        itemId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Cart item not found') {
        return res.status(404).json({
          error: {
            code: 'CART_ITEM_NOT_FOUND',
            message: 'Cart item not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'CART_REMOVE_ITEM_ERROR',
          message: 'Failed to remove cart item'
        }
      });
    }
  }

  /**
   * Merge guest cart with user cart
   * @route POST /api/cart/merge
   */
  static async mergeCart(req, res) {
    try {
      const { guest_cart_token } = req.body;
      const userId = req.auth?.userId;

      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      const cart = await CartService.mergeCarts(guest_cart_token, userId);

      logger.info('Cart merged successfully', {
        cartId: cart.id,
        userId,
        guestCartToken: guest_cart_token,
        requestId: req.requestId
      });

      res.status(200).json({
        data: cart
      });
    } catch (error) {
      logger.error('Failed to merge cart:', {
        error: error.message,
        guestCartToken: req.body.guest_cart_token,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'CART_MERGE_ERROR',
          message: 'Failed to merge cart'
        }
      });
    }
  }

  /**
   * Reprice cart items
   * @route POST /api/cart/reprice
   */
  static async repriceCart(req, res) {
    try {
      const { cart_token } = req.query;
      const userId = req.auth?.userId || null;

      // Get cart
      let cart = null;
      if (userId) {
        cart = await CartService.getCartByUserId(userId);
      } else if (cart_token) {
        cart = await CartService.getCartByToken(cart_token);
      }

      if (!cart) {
        return res.status(404).json({
          error: {
            code: 'CART_NOT_FOUND',
            message: 'Cart not found'
          }
        });
      }

      const updatedCart = await CartService.repriceCart(cart.id, userId);

      logger.info('Cart repriced successfully', {
        cartId: cart.id,
        userId,
        requestId: req.requestId
      });

      res.status(200).json({
        data: updatedCart
      });
    } catch (error) {
      logger.error('Failed to reprice cart:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'CART_REPRICE_ERROR',
          message: 'Failed to reprice cart'
        }
      });
    }
  }

  /**
   * Clear cart
   * @route DELETE /api/cart
   */
  static async clearCart(req, res) {
    try {
      const { cart_token } = req.query;
      const userId = req.auth?.userId || null;

      // Get cart
      let cart = null;
      if (userId) {
        cart = await CartService.getCartByUserId(userId);
      } else if (cart_token) {
        cart = await CartService.getCartByToken(cart_token);
      }

      if (!cart) {
        return res.status(404).json({
          error: {
            code: 'CART_NOT_FOUND',
            message: 'Cart not found'
          }
        });
      }

      await CartService.clearCart(cart.id, userId);

      logger.info('Cart cleared successfully', {
        cartId: cart.id,
        userId,
        requestId: req.requestId
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to clear cart:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'CART_CLEAR_ERROR',
          message: 'Failed to clear cart'
        }
      });
    }
  }

  /**
   * Mark cart as converted (order placed)
   * @route POST /api/cart/convert
   */
  static async markAsConverted(req, res) {
    try {
      const { cart_token } = req.query;
      const userId = req.auth?.userId || null;

      // Get cart
      let cart = null;
      if (userId) {
        cart = await CartService.getCartByUserId(userId);
      } else if (cart_token) {
        cart = await CartService.getCartByToken(cart_token);
      }

      if (!cart) {
        return res.status(404).json({
          error: {
            code: 'CART_NOT_FOUND',
            message: 'Cart not found'
          }
        });
      }

      await CartService.markAsConverted(cart.id, userId);

      logger.info('Cart marked as converted successfully', {
        cartId: cart.id,
        userId,
        requestId: req.requestId
      });

      res.status(200).json({
        message: 'Cart marked as converted'
      });
    } catch (error) {
      logger.error('Failed to mark cart as converted:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'CART_CONVERT_ERROR',
          message: 'Failed to mark cart as converted'
        }
      });
    }
  }
}

module.exports = CartController;
