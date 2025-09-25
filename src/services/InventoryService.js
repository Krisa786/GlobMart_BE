const { Product, Inventory, StockLedger, User, sequelize } = require('../database/models');
const { Op } = require('sequelize');

class InventoryService {
  /**
   * Adjust stock with transaction and row-level locking
   * @param {number} productId - Product ID
   * @param {number} quantity - New quantity
   * @param {string} reason - Reason for adjustment
   * @param {string} note - Additional note
   * @param {number} userId - User ID performing the action
   * @returns {Promise<Inventory>} Updated inventory record
   */
  static async adjustStock(productId, quantity, reason = 'manual_adjust', note = null, userId = null) {
    const transaction = await sequelize.transaction();

    try {
      // Check if product exists and is not soft-deleted
      const product = await Product.findByPk(productId, {
        transaction,
        paranoid: false // Include soft-deleted products to check their status
      });

      if (!product) {
        throw new Error('Product not found');
      }

      if (product.deleted_at) {
        throw new Error('Product is soft-deleted');
      }

      // Use row-level lock to prevent concurrent modifications
      const inventory = await Inventory.findOne({
        where: { product_id: productId },
        transaction,
        lock: true // Row-level lock
      });

      if (!inventory) {
        // Create inventory record if it doesn't exist
        const newInventory = await Inventory.create({
          product_id: productId,
          quantity: 0,
          low_stock_threshold: 5
        }, { transaction });

        // Calculate delta for the ledger
        const delta = quantity;
        
        // Create stock ledger entry
        await StockLedger.create({
          product_id: productId,
          delta,
          reason,
          note,
          created_by: userId
        }, { transaction });

        // Update the inventory with the new quantity
        await newInventory.update({
          quantity,
          in_stock: quantity > 0
        }, { transaction });

        await transaction.commit();
        return newInventory;
      }

      // Calculate delta for existing inventory
      const oldQuantity = inventory.quantity;
      const delta = quantity - oldQuantity;

      // Validate that the new quantity is not negative
      if (quantity < 0) {
        throw new Error('Stock quantity cannot be negative');
      }

      // Update inventory
      await inventory.update({
        quantity,
        in_stock: quantity > 0
      }, { transaction });

      // Create stock ledger entry
      await StockLedger.create({
        product_id: productId,
        delta,
        reason,
        note,
        created_by: userId
      }, { transaction });

      await transaction.commit();
      return inventory;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get inventory by product ID
   * @param {number} productId - Product ID
   * @returns {Promise<Inventory>} Inventory record
   */
  static async getInventoryByProductId(productId) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const inventory = await Inventory.findOne({
      where: { product_id: productId }
    });

    if (!inventory) {
      throw new Error('Inventory not found');
    }

    return inventory;
  }

  /**
   * Get stock history for a product
   * @param {number} productId - Product ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Stock history with pagination
   */
  static async getStockHistory(productId, options = {}) {
    const { limit = 50, page = 1 } = options;

    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await StockLedger.findAndCountAll({
      where: { product_id: productId },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      stockHistory: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get low stock products
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Low stock products with pagination
   */
  static async getLowStockProducts(options = {}) {
    const { limit = 50, page = 1 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: {
        status: 'published',
        deleted_at: null
      },
      include: [
        { model: Inventory, as: 'inventory' }
      ],
      having: sequelize.literal(`
        inventory.quantity > 0 AND 
        inventory.quantity <= inventory.low_stock_threshold
      `),
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      products: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get out of stock products
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Out of stock products with pagination
   */
  static async getOutOfStockProducts(options = {}) {
    const { limit = 50, page = 1 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: {
        status: 'published',
        deleted_at: null
      },
      include: [
        { model: Inventory, as: 'inventory' }
      ],
      having: sequelize.literal('inventory.quantity = 0'),
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      products: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Add stock to inventory
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity to add
   * @param {string} reason - Reason for addition
   * @param {string} note - Additional note
   * @param {number} userId - User ID performing the action
   * @returns {Promise<Inventory>} Updated inventory record
   */
  static async addStock(productId, quantity, reason = 'manual_adjust', note = null, userId = null) {
    const inventory = await this.getInventoryByProductId(productId);
    const newQuantity = inventory.quantity + quantity;
    return this.adjustStock(productId, newQuantity, reason, note, userId);
  }

  /**
   * Remove stock from inventory
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity to remove
   * @param {string} reason - Reason for removal
   * @param {string} note - Additional note
   * @param {number} userId - User ID performing the action
   * @returns {Promise<Inventory>} Updated inventory record
   */
  static async removeStock(productId, quantity, reason = 'manual_adjust', note = null, userId = null) {
    const inventory = await this.getInventoryByProductId(productId);
    const newQuantity = Math.max(0, inventory.quantity - quantity);
    return this.adjustStock(productId, newQuantity, reason, note, userId);
  }

  /**
   * Reserve stock for an order (future use)
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity to reserve
   * @param {string} orderId - Order ID
   * @param {number} userId - User ID performing the action
   * @returns {Promise<Inventory>} Updated inventory record
   */
  static async reserveStock(productId, quantity, orderId, userId = null) {
    const inventory = await this.getInventoryByProductId(productId);
    
    if (inventory.quantity < quantity) {
      throw new Error('Insufficient stock available');
    }

    const newQuantity = inventory.quantity - quantity;
    return this.adjustStock(
      productId, 
      newQuantity, 
      'order_hold', 
      `Reserved for order ${orderId}`, 
      userId
    );
  }

  /**
   * Release reserved stock (future use)
   * @param {number} productId - Product ID
   * @param {number} quantity - Quantity to release
   * @param {string} orderId - Order ID
   * @param {number} userId - User ID performing the action
   * @returns {Promise<Inventory>} Updated inventory record
   */
  static async releaseStock(productId, quantity, orderId, userId = null) {
    const inventory = await this.getInventoryByProductId(productId);
    const newQuantity = inventory.quantity + quantity;
    return this.adjustStock(
      productId, 
      newQuantity, 
      'order_release', 
      `Released from order ${orderId}`, 
      userId
    );
  }

  /**
   * Get inventory summary for dashboard
   * @returns {Promise<Object>} Inventory summary
   */
  static async getInventorySummary() {
    const [totalProducts, inStockProducts, lowStockProducts, outOfStockProducts] = await Promise.all([
      Product.count({
        where: {
          status: 'published',
          deleted_at: null
        }
      }),
      Product.count({
        where: {
          status: 'published',
          deleted_at: null
        },
        include: [
          {
            model: Inventory,
            as: 'inventory',
            where: { quantity: { [Op.gt]: 0 } }
          }
        ]
      }),
      Product.count({
        where: {
          status: 'published',
          deleted_at: null
        },
        include: [
          {
            model: Inventory,
            as: 'inventory',
            where: {
              [Op.and]: [
                { quantity: { [Op.gt]: 0 } },
                sequelize.literal('quantity <= low_stock_threshold')
              ]
            }
          }
        ]
      }),
      Product.count({
        where: {
          status: 'published',
          deleted_at: null
        },
        include: [
          {
            model: Inventory,
            as: 'inventory',
            where: { quantity: 0 }
          }
        ]
      })
    ]);

    return {
      total_products: totalProducts,
      in_stock: inStockProducts,
      low_stock: lowStockProducts,
      out_of_stock: outOfStockProducts
    };
  }
}

module.exports = InventoryService;
