'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Checkout extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with cart
      Checkout.belongsTo(models.Cart, {
        as: 'cart',
        foreignKey: 'cart_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with shipping address
      Checkout.belongsTo(models.Address, {
        as: 'shippingAddress',
        foreignKey: 'shipping_address_id',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });

      // Association with billing address
      Checkout.belongsTo(models.Address, {
        as: 'billingAddress',
        foreignKey: 'billing_address_id',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });

      // Association with inventory reservations
      Checkout.hasMany(models.InventoryReservation, {
        as: 'reservations',
        foreignKey: 'checkout_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Check if checkout session is expired
     */
    isExpired() {
      return new Date() > this.expires_at;
    }

    /**
     * Check if checkout session is valid
     */
    isValid() {
      return !this.isExpired() && this.stock_reserved;
    }

    /**
     * Get time remaining until expiry in minutes
     */
    getTimeRemaining() {
      const now = new Date();
      const expiry = new Date(this.expires_at);
      const diffMs = expiry - now;
      return Math.max(0, Math.floor(diffMs / (1000 * 60)));
    }

    /**
     * Check if checkout has sufficient time remaining
     */
    hasTimeRemaining(minutes = 5) {
      return this.getTimeRemaining() >= minutes;
    }

    /**
     * Get formatted totals
     */
    getFormattedTotals() {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency
      });

      return {
        tax_total: formatter.format(this.tax_total),
        shipping_total: formatter.format(this.shipping_total),
        grand_total: formatter.format(this.grand_total)
      };
    }

    /**
     * Get checkout summary for payment
     */
    getPaymentSummary() {
      return {
        checkout_id: this.id,
        amount: parseFloat(this.grand_total),
        currency: this.currency,
        shipping_method: this.shipping_method,
        expires_at: this.expires_at,
        time_remaining: this.getTimeRemaining()
      };
    }

    /**
     * Check if shipping method is valid
     */
    isValidShippingMethod() {
      const validMethods = ['standard', 'express', 'overnight', 'pickup'];
      return validMethods.includes(this.shipping_method);
    }

    /**
     * Get shipping method display name
     */
    getShippingMethodDisplayName() {
      const displayNames = {
        'standard': 'Standard Shipping',
        'express': 'Express Shipping',
        'overnight': 'Overnight Shipping',
        'pickup': 'Store Pickup'
      };
      return displayNames[this.shipping_method] || this.shipping_method;
    }

    /**
     * Mark checkout as completed (order placed)
     */
    async markAsCompleted() {
      await this.update({ 
        status: 'completed',
        completed_at: new Date()
      });
    }

    /**
     * Mark checkout as failed
     */
    async markAsFailed(reason = 'Payment failed') {
      await this.update({ 
        status: 'failed',
        failure_reason: reason,
        failed_at: new Date()
      });
    }

    /**
     * Check if checkout can be used for payment
     */
    canProcessPayment() {
      return this.isValid() && this.status === 'active';
    }
  }

  Checkout.init({
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
    shipping_address_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'addresses',
        key: 'id'
      }
    },
    billing_address_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'addresses',
        key: 'id'
      }
    },
    shipping_method: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        isIn: [['standard', 'express', 'overnight', 'pickup']]
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
      validate: {
        min: 0
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
    stock_reserved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'failed', 'expired'),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'completed', 'failed', 'expired']]
      }
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Checkout',
    tableName: 'checkouts',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['cart_id']
      },
      {
        fields: ['shipping_address_id']
      },
      {
        fields: ['billing_address_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['status', 'expires_at']
      }
    ],
    hooks: {
      beforeCreate: async (checkout) => {
        // Set expiry time (15 minutes from now)
        if (!checkout.expires_at) {
          const expiryTime = new Date();
          expiryTime.setMinutes(expiryTime.getMinutes() + 15);
          checkout.expires_at = expiryTime;
        }
      },
      beforeUpdate: async (checkout) => {
        // Auto-expire if past expiry time
        if (checkout.status === 'active' && checkout.isExpired()) {
          checkout.status = 'expired';
        }
      }
    }
  });

  return Checkout;
};
