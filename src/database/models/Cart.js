'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cart extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with user
      Cart.belongsTo(models.User, {
        as: 'user',
        foreignKey: 'user_id',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // Association with cart items
      Cart.hasMany(models.CartItem, {
        as: 'items',
        foreignKey: 'cart_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Check if cart is empty
     */
    isEmpty() {
      return this.items && this.items.length === 0;
    }

    /**
     * Get total number of items in cart
     */
    getTotalItems() {
      if (!this.items) return 0;
      return this.items.reduce((total, item) => total + item.qty, 0);
    }

    /**
     * Check if cart has items
     */
    hasItems() {
      return this.getTotalItems() > 0;
    }

    /**
     * Check if cart is active
     */
    isActive() {
      return this.status === 'active';
    }

    /**
     * Check if cart is abandoned
     */
    isAbandoned() {
      return this.status === 'abandoned';
    }

    /**
     * Check if cart is converted (order placed)
     */
    isConverted() {
      return this.status === 'converted';
    }

    /**
     * Get formatted grand total with currency
     */
    getFormattedTotal() {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency || 'USD'
      });
      return formatter.format(this.grand_total);
    }

    /**
     * Check if cart is expired (older than 60 days)
     */
    isExpired() {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      return this.created_at < sixtyDaysAgo;
    }

    /**
     * Mark cart as converted
     */
    async markAsConverted() {
      await this.update({ status: 'converted' });
    }

    /**
     * Mark cart as abandoned
     */
    async markAsAbandoned() {
      await this.update({ status: 'abandoned' });
    }

    /**
     * Update cart totals based on line items
     */
    async updateCartTotals() {
      const CartItem = require('./CartItem');
      const items = await CartItem.findAll({
        where: { cart_id: this.id }
      });
      
      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      items.forEach(item => {
        subtotal += parseFloat(item.line_subtotal);
        discountTotal += parseFloat(item.line_discount);
        taxTotal += parseFloat(item.line_tax);
      });

      const grandTotal = subtotal + taxTotal - discountTotal;

      await this.update({
        subtotal,
        discount_total: discountTotal,
        tax_total: taxTotal,
        grand_total: grandTotal
      });
    }
  }

  Cart.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    cart_token: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      unique: true,
      validate: {
        isUUID: 4
      }
    },
    currency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: 'INR',
      validate: {
        len: [3, 3],
        isIn: [['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']]
      }
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    discount_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    tax_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    shipping_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    grand_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'converted', 'abandoned'),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'converted', 'abandoned']]
      }
    }
  }, {
    sequelize,
    modelName: 'Cart',
    tableName: 'carts',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        unique: true,
        fields: ['cart_token']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      }
    ],
    hooks: {
      beforeCreate: async (cart) => {
        // Generate cart token if not provided
        if (!cart.cart_token) {
          const { v4: uuidv4 } = require('uuid');
          cart.cart_token = uuidv4();
        }
      },
      beforeUpdate: async (cart) => {
        // Recalculate totals if any line items changed
        if (cart.changed('subtotal') || cart.changed('discount_total') || 
            cart.changed('tax_total') || cart.changed('shipping_total')) {
          cart.grand_total = parseFloat(cart.subtotal) + 
                           parseFloat(cart.tax_total) + 
                           parseFloat(cart.shipping_total) - 
                           parseFloat(cart.discount_total);
        }
      }
    }
  });

  return Cart;
};
