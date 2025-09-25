'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CartItem extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with cart
      CartItem.belongsTo(models.Cart, {
        as: 'cart',
        foreignKey: 'cart_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with product
      CartItem.belongsTo(models.Product, {
        as: 'product',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Calculate line total
     */
    calculateLineTotal() {
      const subtotal = parseFloat(this.unit_price) * this.qty;
      const discount = parseFloat(this.line_discount) || 0;
      const tax = parseFloat(this.line_tax) || 0;
      return subtotal - discount + tax;
    }

    /**
     * Update line totals
     */
    async updateLineTotals() {
      const subtotal = parseFloat(this.unit_price) * this.qty;
      const discount = parseFloat(this.line_discount) || 0;
      const tax = parseFloat(this.line_tax) || 0;
      const total = subtotal - discount + tax;

      await this.update({
        line_subtotal: subtotal,
        line_total: total
      });
    }

    /**
     * Check if item has discount
     */
    hasDiscount() {
      return parseFloat(this.line_discount) > 0;
    }

    /**
     * Check if item has tax
     */
    hasTax() {
      return parseFloat(this.line_tax) > 0;
    }

    /**
     * Get formatted line total with currency
     */
    getFormattedLineTotal(currency = 'USD') {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      });
      return formatter.format(this.line_total);
    }

    /**
     * Get formatted unit price with currency
     */
    getFormattedUnitPrice(currency = 'USD') {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      });
      return formatter.format(this.unit_price);
    }

    /**
     * Check if quantity is valid
     */
    isValidQuantity() {
      return this.qty > 0;
    }

    /**
     * Check if price is valid
     */
    isValidPrice() {
      return parseFloat(this.unit_price) >= 0;
    }
  }

  CartItem.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    cart_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'carts',
        key: 'id'
      }
    },
    product_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    sku: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 64]
      }
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    unit_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    line_subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    line_discount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    line_tax: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    line_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cart_items',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['cart_id']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['sku']
      },
      {
        unique: true,
        fields: ['cart_id', 'sku']
      }
    ],
    hooks: {
      beforeCreate: async (cartItem) => {
        // Calculate line totals
        const subtotal = parseFloat(cartItem.unit_price) * cartItem.qty;
        const discount = parseFloat(cartItem.line_discount) || 0;
        const tax = parseFloat(cartItem.line_tax) || 0;
        const total = subtotal - discount + tax;

        cartItem.line_subtotal = subtotal;
        cartItem.line_total = total;
      },
      beforeUpdate: async (cartItem) => {
        // Recalculate line totals if quantity or price changed
        if (cartItem.changed('qty') || cartItem.changed('unit_price') || 
            cartItem.changed('line_discount') || cartItem.changed('line_tax')) {
          const subtotal = parseFloat(cartItem.unit_price) * cartItem.qty;
          const discount = parseFloat(cartItem.line_discount) || 0;
          const tax = parseFloat(cartItem.line_tax) || 0;
          const total = subtotal - discount + tax;

          cartItem.line_subtotal = subtotal;
          cartItem.line_total = total;
        }
      },
      afterCreate: async (cartItem) => {
        // Update cart totals
        const Cart = require('./Cart');
        const cart = await Cart.findByPk(cartItem.cart_id);
        if (cart) {
          await cart.updateCartTotals();
        }
      },
      afterUpdate: async (cartItem) => {
        // Update cart totals
        const Cart = require('./Cart');
        const cart = await Cart.findByPk(cartItem.cart_id);
        if (cart) {
          await cart.updateCartTotals();
        }
      },
      afterDestroy: async (cartItem) => {
        // Update cart totals
        const Cart = require('./Cart');
        const cart = await Cart.findByPk(cartItem.cart_id);
        if (cart) {
          await cart.updateCartTotals();
        }
      }
    }
  });

  return CartItem;
};
