'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class InventoryReservation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with checkout
      InventoryReservation.belongsTo(models.Checkout, {
        as: 'checkout',
        foreignKey: 'checkout_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with cart item
      InventoryReservation.belongsTo(models.CartItem, {
        as: 'cartItem',
        foreignKey: 'cart_item_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with product
      InventoryReservation.belongsTo(models.Product, {
        as: 'product',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with inventory
      InventoryReservation.belongsTo(models.Inventory, {
        as: 'inventory',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Check if reservation is expired
     */
    isExpired() {
      return new Date() > this.expires_at;
    }

    /**
     * Check if reservation is valid
     */
    isValid() {
      return !this.isExpired() && this.status === 'active';
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
     * Mark reservation as released
     */
    async markAsReleased(reason = 'expired') {
      await this.update({
        status: 'released',
        released_at: new Date(),
        release_reason: reason
      });
    }

    /**
     * Mark reservation as confirmed (order placed)
     */
    async markAsConfirmed() {
      await this.update({
        status: 'confirmed',
        confirmed_at: new Date()
      });
    }

    /**
     * Check if reservation can be released
     */
    canBeReleased() {
      return this.status === 'active' && !this.isExpired();
    }

    /**
     * Check if reservation can be confirmed
     */
    canBeConfirmed() {
      return this.status === 'active' && !this.isExpired();
    }

    /**
     * Get reservation summary
     */
    getSummary() {
      return {
        id: this.id,
        product_id: this.product_id,
        sku: this.sku,
        quantity: this.quantity,
        status: this.status,
        expires_at: this.expires_at,
        time_remaining: this.getTimeRemaining(),
        is_valid: this.isValid()
      };
    }
  }

  InventoryReservation.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    checkout_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'checkouts',
        key: 'id'
      }
    },
    cart_item_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'cart_items',
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
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'confirmed', 'released'),
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: [['active', 'confirmed', 'released']]
      }
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    released_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    release_reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'InventoryReservation',
    tableName: 'inventory_reservations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['checkout_id']
      },
      {
        fields: ['cart_item_id']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['sku']
      },
      {
        fields: ['status']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['status', 'expires_at']
      },
      {
        unique: true,
        fields: ['checkout_id', 'cart_item_id']
      }
    ],
    hooks: {
      beforeCreate: async (reservation) => {
        // Set expiry time (15 minutes from now)
        if (!reservation.expires_at) {
          const expiryTime = new Date();
          expiryTime.setMinutes(expiryTime.getMinutes() + 15);
          reservation.expires_at = expiryTime;
        }
      },
      beforeUpdate: async (reservation) => {
        // Auto-release if past expiry time
        if (reservation.status === 'active' && reservation.isExpired()) {
          reservation.status = 'released';
          reservation.released_at = new Date();
          reservation.release_reason = 'expired';
        }
      }
    }
  });

  return InventoryReservation;
};
