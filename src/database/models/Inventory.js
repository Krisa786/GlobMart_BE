'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Inventory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with product
      Inventory.belongsTo(models.Product, {
        as: 'product',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with stock ledger
      Inventory.hasMany(models.StockLedger, {
        as: 'stockLedger',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Check if product is in stock
     */
    isInStock() {
      return this.quantity > 0;
    }

    /**
     * Check if product is low stock
     */
    isLowStock() {
      return this.quantity <= this.low_stock_threshold;
    }

    /**
     * Check if product is out of stock
     */
    isOutOfStock() {
      return this.quantity === 0;
    }

    /**
     * Get stock status as string
     */
    getStockStatus() {
      if (this.isOutOfStock()) {
        return 'out_of_stock';
      } else if (this.isLowStock()) {
        return 'low_stock';
      } else {
        return 'in_stock';
      }
    }

    /**
     * Get stock status with color for UI
     */
    getStockStatusColor() {
      const status = this.getStockStatus();
      switch (status) {
      case 'out_of_stock':
        return 'red';
      case 'low_stock':
        return 'orange';
      case 'in_stock':
        return 'green';
      default:
        return 'gray';
      }
    }

    /**
     * Update stock quantity and log the change
     */
    async updateStock(delta, reason = 'manual_adjust', note = null, userId = null) {
      const oldQuantity = this.quantity;
      const newQuantity = oldQuantity + delta;

      if (newQuantity < 0) {
        throw new Error('Stock quantity cannot be negative');
      }

      // Update inventory
      await this.update({
        quantity: newQuantity,
        in_stock: newQuantity > 0
      });

      // Log the change in stock ledger
      await sequelize.models.StockLedger.create({
        product_id: this.product_id,
        delta,
        reason,
        note,
        created_by: userId
      });

      return this;
    }

    /**
     * Reserve stock for an order
     */
    async reserveStock(quantity, orderId, userId = null) {
      if (quantity > this.quantity) {
        throw new Error('Insufficient stock available');
      }

      await this.updateStock(
        -quantity,
        'order_hold',
        `Reserved for order ${orderId}`,
        userId
      );

      return this;
    }

    /**
     * Release reserved stock
     */
    async releaseStock(quantity, orderId, userId = null) {
      await this.updateStock(
        quantity,
        'order_release',
        `Released from order ${orderId}`,
        userId
      );

      return this;
    }

    /**
     * Add stock (restock)
     */
    async addStock(quantity, reason = 'manual_adjust', note = null, userId = null) {
      if (quantity <= 0) {
        throw new Error('Stock quantity must be positive');
      }

      await this.updateStock(quantity, reason, note, userId);
      return this;
    }

    /**
     * Remove stock
     */
    async removeStock(quantity, reason = 'manual_adjust', note = null, userId = null) {
      if (quantity <= 0) {
        throw new Error('Stock quantity must be positive');
      }

      await this.updateStock(-quantity, reason, note, userId);
      return this;
    }
  }

  Inventory.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'products',
        key: 'id'
      },
      validate: {
        notNull: true
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    low_stock_threshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 0
      }
    },
    in_stock: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Inventory',
    tableName: 'inventory',
    timestamps: true,
    underscored: true,
    paranoid: false,
    createdAt: false, // No created_at column in inventory table
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['product_id']
      },
      {
        fields: ['quantity']
      },
      {
        fields: ['in_stock']
      },
      {
        fields: ['quantity', 'low_stock_threshold']
      }
    ],
    hooks: {
      beforeSave: async (inventory) => {
        // Update in_stock based on quantity
        inventory.in_stock = inventory.quantity > 0;
      },
      afterCreate: async (inventory) => {
        // Log initial stock creation
        await sequelize.models.StockLedger.create({
          product_id: inventory.product_id,
          delta: inventory.quantity,
          reason: 'initial',
          note: 'Initial stock creation',
          created_by: null
        });
      }
    }
  });

  return Inventory;
};
