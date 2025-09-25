const { 
  Cart, 
  CartItem, 
  Product, 
  Inventory, 
  Address, 
  Checkout, 
  InventoryReservation,
  User 
} = require('../database/models');
const { Op } = require('sequelize');
const TaxService = require('./TaxService');
const ShippingService = require('./ShippingService');
const { logger } = require('../middleware/errorHandler');

class CheckoutService {
  /**
   * Create checkout session with address capture, pricing, and stock reservation
   * @param {number} cartId - Cart ID
   * @param {Object} shippingAddress - Shipping address data
   * @param {Object} billingAddress - Billing address data
   * @param {string} shippingMethod - Shipping method
   * @param {number|null} userId - User ID (null for guest)
   * @returns {Promise<Object>} Checkout session result
   */
  static async createSession(cartId, shippingAddress, billingAddress, shippingMethod, userId = null) {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      // Verify cart ownership and get cart with items
      const cart = await this.verifyCartOwnership(cartId, userId, transaction);
      if (!cart) {
        throw new Error('Cart not found or access denied');
      }

      // Load cart with items and products
      const fullCart = await Cart.findByPk(cartId, {
        include: [
          {
            model: CartItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                include: [
                  {
                    model: Inventory,
                    as: 'inventory'
                  }
                ]
              }
            ]
          }
        ],
        transaction
      });

      if (!fullCart || !fullCart.items || fullCart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      // Validate addresses
      await this.validateAddresses(shippingAddress, billingAddress);

      // Create or get addresses
      const shippingAddr = await this.createOrGetAddress(shippingAddress, userId, 'shipping', transaction);
      const billingAddr = await this.createOrGetAddress(billingAddress, userId, 'billing', transaction);

      // Reprice cart items with current prices
      await this.repriceCartItems(fullCart.items, transaction);

      // Calculate tax
      const taxResult = await TaxService.calculateTax(shippingAddr, fullCart.items, fullCart.currency);

      // Calculate shipping
      const shippingResult = await ShippingService.calculateShipping(
        shippingAddr, 
        fullCart.items, 
        shippingMethod, 
        fullCart.currency
      );

      if (!shippingResult.is_available) {
        throw new Error(`Shipping method ${shippingMethod} is not available for this destination`);
      }

      // Reserve stock
      const reservations = await this.reserveStock(fullCart.items, transaction);

      // Calculate totals
      const subtotal = fullCart.items.reduce((sum, item) => sum + parseFloat(item.line_subtotal), 0);
      const grandTotal = subtotal + taxResult.total_tax + shippingResult.shipping_cost;

      // Create checkout session
      const checkout = await Checkout.create({
        cart_id: cartId,
        shipping_address_id: shippingAddr.id,
        billing_address_id: billingAddr.id,
        shipping_method: shippingMethod,
        tax_total: taxResult.total_tax,
        shipping_total: shippingResult.shipping_cost,
        grand_total: grandTotal,
        currency: fullCart.currency,
        stock_reserved: true,
        status: 'active'
      }, { transaction });

      // Create inventory reservations
      for (const reservation of reservations) {
        await InventoryReservation.create({
          checkout_id: checkout.id,
          cart_item_id: reservation.cart_item_id,
          product_id: reservation.product_id,
          sku: reservation.sku,
          quantity: reservation.quantity,
          status: 'active'
        }, { transaction });
      }

      await transaction.commit();

      const result = {
        checkout_id: checkout.id,
        amount: parseFloat(grandTotal),
        currency: fullCart.currency,
        payment_provider_hints: this.getPaymentProviderHints(fullCart.currency),
        expires_at: checkout.expires_at,
        time_remaining: checkout.getTimeRemaining(),
        breakdown: {
          subtotal: subtotal,
          tax_total: taxResult.total_tax,
          shipping_total: shippingResult.shipping_cost,
          grand_total: grandTotal
        },
        shipping: {
          method: shippingMethod,
          cost: shippingResult.shipping_cost,
          estimated_delivery: shippingResult.estimated_delivery
        },
        addresses: {
          shipping: shippingAddr.getSummary(),
          billing: billingAddr.getSummary()
        }
      };

      logger.info('Checkout session created successfully', {
        checkoutId: checkout.id,
        cartId,
        userId,
        amount: result.amount,
        currency: result.currency
      });

      return result;
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to create checkout session:', {
        error: error.message,
        cartId,
        userId
      });
      throw error;
    }
  }

  /**
   * Get checkout session by ID
   * @param {number} checkoutId - Checkout ID
   * @param {number|null} userId - User ID for authorization
   * @returns {Promise<Object>} Checkout session
   */
  static async getSession(checkoutId, userId = null) {
    const checkout = await Checkout.findByPk(checkoutId, {
      include: [
        {
          model: Cart,
          as: 'cart',
          include: [
            {
              model: CartItem,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product'
                }
              ]
            }
          ]
        },
        {
          model: Address,
          as: 'shippingAddress'
        },
        {
          model: Address,
          as: 'billingAddress'
        },
        {
          model: InventoryReservation,
          as: 'reservations'
        }
      ]
    });

    if (!checkout) {
      throw new Error('Checkout session not found');
    }

    // Verify ownership
    if (userId && checkout.cart.user_id !== userId) {
      throw new Error('Access denied');
    }

    if (checkout.isExpired()) {
      throw new Error('Checkout session has expired');
    }

    return {
      checkout_id: checkout.id,
      amount: parseFloat(checkout.grand_total),
      currency: checkout.currency,
      expires_at: checkout.expires_at,
      time_remaining: checkout.getTimeRemaining(),
      status: checkout.status,
      breakdown: {
        subtotal: parseFloat(checkout.cart.subtotal),
        tax_total: parseFloat(checkout.tax_total),
        shipping_total: parseFloat(checkout.shipping_total),
        grand_total: parseFloat(checkout.grand_total)
      },
      shipping: {
        method: checkout.shipping_method,
        cost: parseFloat(checkout.shipping_total)
      },
      addresses: {
        shipping: checkout.shippingAddress.getSummary(),
        billing: checkout.billingAddress.getSummary()
      },
      items: checkout.cart.items.map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.product.name,
        quantity: item.qty,
        unit_price: parseFloat(item.unit_price),
        line_total: parseFloat(item.line_total)
      }))
    };
  }

  /**
   * Release stock reservations for expired checkout
   * @param {number} checkoutId - Checkout ID
   * @returns {Promise<boolean>} Success status
   */
  static async releaseReservations(checkoutId) {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      const checkout = await Checkout.findByPk(checkoutId, {
        include: [
          {
            model: InventoryReservation,
            as: 'reservations',
            where: { status: 'active' }
          }
        ],
        transaction
      });

      if (!checkout) {
        throw new Error('Checkout session not found');
      }

      // Release each reservation
      for (const reservation of checkout.reservations) {
        await reservation.markAsReleased('checkout_expired');
        
        // Restore inventory
        const inventory = await Inventory.findOne({
          where: { product_id: reservation.product_id },
          transaction
        });

        if (inventory) {
          await inventory.addStock(
            reservation.quantity,
            'reservation_release',
            `Released from expired checkout ${checkoutId}`
          );
        }
      }

      // Mark checkout as expired
      await checkout.update({ status: 'expired' }, { transaction });

      await transaction.commit();

      logger.info('Stock reservations released successfully', {
        checkoutId,
        reservationsCount: checkout.reservations.length
      });

      return true;
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to release reservations:', {
        error: error.message,
        checkoutId
      });
      throw error;
    }
  }

  /**
   * Confirm reservations (when order is placed)
   * @param {number} checkoutId - Checkout ID
   * @returns {Promise<boolean>} Success status
   */
  static async confirmReservations(checkoutId) {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      const checkout = await Checkout.findByPk(checkoutId, {
        include: [
          {
            model: InventoryReservation,
            as: 'reservations',
            where: { status: 'active' }
          }
        ],
        transaction
      });

      if (!checkout) {
        throw new Error('Checkout session not found');
      }

      if (checkout.isExpired()) {
        throw new Error('Checkout session has expired');
      }

      // Confirm each reservation
      for (const reservation of checkout.reservations) {
        await reservation.markAsConfirmed();
      }

      // Mark checkout as completed
      await checkout.markAsCompleted();

      await transaction.commit();

      logger.info('Stock reservations confirmed successfully', {
        checkoutId,
        reservationsCount: checkout.reservations.length
      });

      return true;
    } catch (error) {
      await transaction.rollback();
      logger.error('Failed to confirm reservations:', {
        error: error.message,
        checkoutId
      });
      throw error;
    }
  }

  /**
   * Clean up expired checkout sessions
   * @returns {Promise<number>} Number of sessions cleaned up
   */
  static async cleanupExpiredSessions() {
    const expiredCheckouts = await Checkout.findAll({
      where: {
        status: 'active',
        expires_at: {
          [Op.lt]: new Date()
        }
      },
      include: [
        {
          model: InventoryReservation,
          as: 'reservations',
          where: { status: 'active' }
        }
      ]
    });

    let cleanedCount = 0;

    for (const checkout of expiredCheckouts) {
      try {
        await this.releaseReservations(checkout.id);
        cleanedCount++;
      } catch (error) {
        logger.error('Failed to cleanup expired checkout:', {
          error: error.message,
          checkoutId: checkout.id
        });
      }
    }

    logger.info('Expired checkout sessions cleaned up', {
      cleanedCount,
      totalExpired: expiredCheckouts.length
    });

    return cleanedCount;
  }

  /**
   * Verify cart ownership
   * @param {number} cartId - Cart ID
   * @param {number|null} userId - User ID
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Cart|null>} Cart if authorized
   */
  static async verifyCartOwnership(cartId, userId, transaction) {
    const whereClause = {
      id: cartId,
      status: 'active'
    };

    if (userId) {
      whereClause.user_id = userId;
    }

    return await Cart.findOne({ where: whereClause, transaction });
  }

  /**
   * Validate addresses
   * @param {Object} shippingAddress - Shipping address
   * @param {Object} billingAddress - Billing address
   */
  static async validateAddresses(shippingAddress, billingAddress) {
    if (!shippingAddress || !shippingAddress.country) {
      throw new Error('Shipping address is required');
    }

    if (!billingAddress || !billingAddress.country) {
      throw new Error('Billing address is required');
    }

    // Check if postal code is serviceable
    const shippingZone = ShippingService.getShippingZone(shippingAddress.country);
    if (shippingZone === 'international' && !shippingAddress.postal_code) {
      throw new Error('Postal code is required for international shipping');
    }
  }

  /**
   * Create or get address
   * @param {Object} addressData - Address data
   * @param {number|null} userId - User ID
   * @param {string} type - Address type
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Address>} Address instance
   */
  static async createOrGetAddress(addressData, userId, type, transaction) {
    // For guest users, always create new address
    if (!userId) {
      return await Address.create({
        user_id: null,
        type,
        ...addressData
      }, { transaction });
    }

    // For logged-in users, try to find existing address or create new one
    const existingAddress = await Address.findOne({
      where: {
        user_id: userId,
        type,
        line1: addressData.line1,
        city: addressData.city,
        postal_code: addressData.postal_code,
        country: addressData.country
      },
      transaction
    });

    if (existingAddress) {
      return existingAddress;
    }

    return await Address.create({
      user_id: userId,
      type,
      ...addressData
    }, { transaction });
  }

  /**
   * Reprice cart items with current product prices
   * @param {Array} cartItems - Cart items
   * @param {Object} transaction - Database transaction
   */
  static async repriceCartItems(cartItems, transaction) {
    for (const item of cartItems) {
      if (item.product && item.product.price !== item.unit_price) {
        await item.update({
          unit_price: item.product.price
        }, { transaction });
      }
    }
  }

  /**
   * Reserve stock for cart items
   * @param {Array} cartItems - Cart items
   * @param {Object} transaction - Database transaction
   * @returns {Promise<Array>} Reservation data
   */
  static async reserveStock(cartItems, transaction) {
    const reservations = [];

    for (const item of cartItems) {
      const inventory = item.product.inventory;
      if (!inventory) {
        throw new Error(`No inventory found for product ${item.sku}`);
      }

      if (inventory.quantity < item.qty) {
        throw new Error(`Insufficient stock for ${item.sku}. Available: ${inventory.quantity}, Requested: ${item.qty}`);
      }

      // Reserve stock by reducing available quantity
      await inventory.updateStock(
        -item.qty,
        'checkout_reservation',
        `Reserved for checkout session`,
        null
      );

      reservations.push({
        cart_item_id: item.id,
        product_id: item.product_id,
        sku: item.sku,
        quantity: item.qty
      });
    }

    return reservations;
  }

  /**
   * Get payment provider hints based on currency
   * @param {string} currency - Currency code
   * @returns {Object} Payment provider hints
   */
  static getPaymentProviderHints(currency) {
    const hints = {
      'INR': {
        primary: 'razorpay',
        secondary: 'stripe',
        methods: ['card', 'upi', 'netbanking', 'wallet']
      },
      'USD': {
        primary: 'stripe',
        secondary: 'paypal',
        methods: ['card', 'paypal', 'apple_pay', 'google_pay']
      },
      'EUR': {
        primary: 'stripe',
        secondary: 'paypal',
        methods: ['card', 'paypal', 'sepa', 'klarna']
      },
      'GBP': {
        primary: 'stripe',
        secondary: 'paypal',
        methods: ['card', 'paypal', 'apple_pay', 'google_pay']
      },
      'CAD': {
        primary: 'stripe',
        secondary: 'paypal',
        methods: ['card', 'paypal', 'apple_pay', 'google_pay']
      },
      'AUD': {
        primary: 'stripe',
        secondary: 'paypal',
        methods: ['card', 'paypal', 'apple_pay', 'google_pay']
      }
    };

    return hints[currency] || hints['USD'];
  }
}

module.exports = CheckoutService;
