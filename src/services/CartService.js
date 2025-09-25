const { Cart, CartItem, Product, Inventory, User } = require('../database/models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

class CartService {
  /**
   * Create or retrieve current cart
   * @param {number|null} userId - User ID if authenticated
   * @param {string|null} cartToken - Cart token for guest users
   * @param {string} currency - Currency code (default: INR)
   * @returns {Promise<Cart>}
   */
  static async createOrGetCart(userId = null, cartToken = null, currency = 'INR') {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      let cart = null;

      // If user is authenticated, try to find their cart first
      if (userId) {
        cart = await Cart.findOne({
          where: {
            user_id: userId,
            status: 'active'
          },
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
      }

      // If no user cart found, try to find by cart token
      if (!cart && cartToken) {
        cart = await Cart.findOne({
          where: {
            cart_token: cartToken,
            status: 'active'
          },
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
      }

      // If still no cart found, create a new one
      if (!cart) {
        cart = await Cart.create({
          user_id: userId,
          cart_token: cartToken || uuidv4(),
          currency,
          status: 'active'
        }, { transaction });
      }

      await transaction.commit();
      return cart;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add item to cart
   * @param {number} cartId - Cart ID
   * @param {string} sku - Product SKU
   * @param {number} qty - Quantity to add
   * @param {number|null} userId - User ID for authorization
   * @returns {Promise<CartItem>}
   */
  static async addItem(cartId, sku, qty, userId = null) {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      // Verify cart ownership
      const cart = await this.verifyCartOwnership(cartId, userId);
      if (!cart) {
        throw new Error('Cart not found or access denied');
      }

      // Find product by SKU
      const product = await Product.findOne({
        where: { sku },
        include: [
          {
            model: Inventory,
            as: 'inventory'
          }
        ]
      });

      if (!product) {
        throw new Error('Product not found');
      }

      if (product.status !== 'published') {
        throw new Error('Product is not available');
      }

      // Check inventory
      const availableStock = product.inventory ? product.inventory.quantity : 0;
      if (qty > availableStock) {
        throw new Error(`Insufficient stock. Available: ${availableStock}`);
      }

      // Check if item already exists in cart
      let cartItem = await CartItem.findOne({
        where: {
          cart_id: cartId,
          sku
        },
        transaction
      });

      if (cartItem) {
        // Update existing item
        const newQty = cartItem.qty + qty;
        if (newQty > availableStock) {
          throw new Error(`Insufficient stock. Available: ${availableStock}, Requested: ${newQty}`);
        }
        
        await cartItem.update({
          qty: newQty,
          unit_price: product.price // Update price to current price
        }, { transaction });
      } else {
        // Create new cart item
        cartItem = await CartItem.create({
          cart_id: cartId,
          product_id: product.id,
          sku,
          qty,
          unit_price: product.price
        }, { transaction });
      }

      // Update cart totals
      await cart.updateCartTotals();

      await transaction.commit();
      return cartItem;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update cart item quantity
   * @param {number} cartId - Cart ID
   * @param {number} itemId - Cart item ID
   * @param {number} qty - New quantity
   * @param {number|null} userId - User ID for authorization
   * @returns {Promise<CartItem>}
   */
  static async updateItem(cartId, itemId, qty, userId = null) {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      // Verify cart ownership
      const cart = await this.verifyCartOwnership(cartId, userId);
      if (!cart) {
        throw new Error('Cart not found or access denied');
      }

      // Find cart item
      const cartItem = await CartItem.findOne({
        where: {
          id: itemId,
          cart_id: cartId
        },
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
        ],
        transaction
      });

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      // Check inventory
      const availableStock = cartItem.product.inventory ? cartItem.product.inventory.quantity : 0;
      if (qty > availableStock) {
        throw new Error(`Insufficient stock. Available: ${availableStock}`);
      }

      // Update quantity and price
      await cartItem.update({
        qty,
        unit_price: cartItem.product.price // Update to current price
      }, { transaction });

      // Update cart totals
      await cart.updateCartTotals();

      await transaction.commit();
      return cartItem;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Remove item from cart
   * @param {number} cartId - Cart ID
   * @param {number} itemId - Cart item ID
   * @param {number|null} userId - User ID for authorization
   * @returns {Promise<boolean>}
   */
  static async removeItem(cartId, itemId, userId = null) {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      // Verify cart ownership
      const cart = await this.verifyCartOwnership(cartId, userId);
      if (!cart) {
        throw new Error('Cart not found or access denied');
      }

      // Find and delete cart item
      const cartItem = await CartItem.findOne({
        where: {
          id: itemId,
          cart_id: cartId
        },
        transaction
      });

      if (!cartItem) {
        throw new Error('Cart item not found');
      }

      await cartItem.destroy({ transaction });

      // Update cart totals
      await cart.updateCartTotals();

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get cart with items
   * @param {number} cartId - Cart ID
   * @param {number|null} userId - User ID for authorization
   * @returns {Promise<Cart>}
   */
  static async getCart(cartId, userId = null) {
    // Verify cart ownership
    const cart = await this.verifyCartOwnership(cartId, userId);
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
      ]
    });

    return fullCart;
  }

  /**
   * Merge guest cart with user cart
   * @param {string} guestCartToken - Guest cart token
   * @param {number} userId - User ID
   * @returns {Promise<Cart>}
   */
  static async mergeCarts(guestCartToken, userId) {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      // Get guest cart
      const guestCart = await Cart.findOne({
        where: {
          cart_token: guestCartToken,
          status: 'active'
        },
        include: [
          {
            model: CartItem,
            as: 'items'
          }
        ],
        transaction
      });

      if (!guestCart || guestCart.items.length === 0) {
        // No guest cart or empty, just return user's cart
        const userCart = await this.createOrGetCart(userId, null);
        await transaction.commit();
        return userCart;
      }

      // Get or create user cart
      let userCart = await Cart.findOne({
        where: {
          user_id: userId,
          status: 'active'
        },
        include: [
          {
            model: CartItem,
            as: 'items'
          }
        ],
        transaction
      });

      if (!userCart) {
        userCart = await Cart.create({
          user_id: userId,
          cart_token: uuidv4(),
          currency: guestCart.currency,
          status: 'active'
        }, { transaction });
      }

      // Merge items from guest cart to user cart
      for (const guestItem of guestCart.items) {
        const existingItem = await CartItem.findOne({
          where: {
            cart_id: userCart.id,
            sku: guestItem.sku
          },
          transaction
        });

        if (existingItem) {
          // Update quantity
          await existingItem.update({
            qty: existingItem.qty + guestItem.qty,
            unit_price: guestItem.unit_price // Use guest cart price
          }, { transaction });
        } else {
          // Create new item
          await CartItem.create({
            cart_id: userCart.id,
            product_id: guestItem.product_id,
            sku: guestItem.sku,
            qty: guestItem.qty,
            unit_price: guestItem.unit_price
          }, { transaction });
        }
      }

      // Mark guest cart as converted
      await guestCart.update({ status: 'converted' }, { transaction });

      // Update user cart totals
      await userCart.updateCartTotals();

      await transaction.commit();
      return userCart;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Reprice cart items with current product prices
   * @param {number} cartId - Cart ID
   * @param {number|null} userId - User ID for authorization
   * @returns {Promise<Cart>}
   */
  static async repriceCart(cartId, userId = null) {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      // Verify cart ownership
      const cart = await this.verifyCartOwnership(cartId, userId);
      if (!cart) {
        throw new Error('Cart not found or access denied');
      }

      // Get cart items with products
      const cartItems = await CartItem.findAll({
        where: { cart_id: cartId },
        include: [
          {
            model: Product,
            as: 'product'
          }
        ],
        transaction
      });

      // Update prices for each item
      for (const item of cartItems) {
        if (item.product && item.product.price !== item.unit_price) {
          await item.update({
            unit_price: item.product.price
          }, { transaction });
        }
      }

      // Update cart totals
      await cart.updateCartTotals();

      await transaction.commit();
      return cart;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Clear cart (remove all items)
   * @param {number} cartId - Cart ID
   * @param {number|null} userId - User ID for authorization
   * @returns {Promise<boolean>}
   */
  static async clearCart(cartId, userId = null) {
    const transaction = await Cart.sequelize.transaction();
    
    try {
      // Verify cart ownership
      const cart = await this.verifyCartOwnership(cartId, userId);
      if (!cart) {
        throw new Error('Cart not found or access denied');
      }

      // Delete all cart items
      await CartItem.destroy({
        where: { cart_id: cartId },
        transaction
      });

      // Update cart totals
      await cart.updateCartTotals();

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Mark cart as converted (order placed)
   * @param {number} cartId - Cart ID
   * @param {number|null} userId - User ID for authorization
   * @returns {Promise<boolean>}
   */
  static async markAsConverted(cartId, userId = null) {
    const cart = await this.verifyCartOwnership(cartId, userId);
    if (!cart) {
      throw new Error('Cart not found or access denied');
    }

    await cart.markAsConverted();
    return true;
  }

  /**
   * Clean up abandoned carts (older than 60 days)
   * @returns {Promise<number>} Number of carts cleaned up
   */
  static async cleanupAbandonedCarts() {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const result = await Cart.update(
      { status: 'abandoned' },
      {
        where: {
          status: 'active',
          created_at: {
            [Op.lt]: sixtyDaysAgo
          }
        }
      }
    );

    return result[0]; // Number of affected rows
  }

  /**
   * Verify cart ownership
   * @param {number} cartId - Cart ID
   * @param {number|null} userId - User ID
   * @param {string|null} cartToken - Cart token
   * @returns {Promise<Cart|null>}
   */
  static async verifyCartOwnership(cartId, userId = null, cartToken = null) {
    const whereClause = {
      id: cartId,
      status: 'active'
    };

    // If user is authenticated, check user_id
    if (userId) {
      whereClause.user_id = userId;
    } else if (cartToken) {
      // If guest user, check cart_token
      whereClause.cart_token = cartToken;
    } else {
      return null;
    }

    return await Cart.findOne({ where: whereClause });
  }

  /**
   * Get cart by token (for guest users)
   * @param {string} cartToken - Cart token
   * @returns {Promise<Cart|null>}
   */
  static async getCartByToken(cartToken) {
    return await Cart.findOne({
      where: {
        cart_token: cartToken,
        status: 'active'
      },
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
      ]
    });
  }

  /**
   * Get cart by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Cart|null>}
   */
  static async getCartByUserId(userId) {
    return await Cart.findOne({
      where: {
        user_id: userId,
        status: 'active'
      },
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
      ]
    });
  }
}

module.exports = CartService;
