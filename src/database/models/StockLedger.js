'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StockLedger extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with product
      StockLedger.belongsTo(models.Product, {
        as: 'product',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with inventory
      StockLedger.belongsTo(models.Inventory, {
        as: 'inventory',
        foreignKey: 'product_id',
        targetKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with user (created_by)
      StockLedger.belongsTo(models.User, {
        as: 'creator',
        foreignKey: 'created_by',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Get the change type (increase/decrease)
     */
    getChangeType() {
      return this.delta > 0 ? 'increase' : this.delta < 0 ? 'decrease' : 'no_change';
    }

    /**
     * Get formatted delta with sign
     */
    getFormattedDelta() {
      const sign = this.delta > 0 ? '+' : '';
      return `${sign}${this.delta}`;
    }

    /**
     * Get reason description
     */
    getReasonDescription() {
      const reasonDescriptions = {
        'initial': 'Initial stock',
        'manual_adjust': 'Manual adjustment',
        'order_hold': 'Order hold',
        'order_release': 'Order release',
        'return': 'Product return',
        'recount': 'Stock recount'
      };
      return reasonDescriptions[this.reason] || this.reason;
    }

    /**
     * Check if this is an increase
     */
    isIncrease() {
      return this.delta > 0;
    }

    /**
     * Check if this is a decrease
     */
    isDecrease() {
      return this.delta < 0;
    }

    /**
     * Check if this is a no-change entry
     */
    isNoChange() {
      return this.delta === 0;
    }

    /**
     * Get the absolute value of delta
     */
    getAbsoluteDelta() {
      return Math.abs(this.delta);
    }

    /**
     * Get formatted timestamp
     */
    getFormattedTimestamp() {
      return this.created_at.toLocaleString();
    }
  }

  StockLedger.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      validate: {
        notNull: true
      }
    },
    delta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Stock change amount (positive for increase, negative for decrease)'
    },
    reason: {
      type: DataTypes.ENUM(
        'initial',
        'manual_adjust',
        'order_hold',
        'order_release',
        'return',
        'recount'
      ),
      allowNull: false,
      validate: {
        isIn: [['initial', 'manual_adjust', 'order_hold', 'order_release', 'return', 'recount']]
      }
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [0, 255]
      }
    },
    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'StockLedger',
    tableName: 'stock_ledger',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        fields: ['product_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['reason']
      },
      {
        fields: ['created_by']
      },
      {
        fields: ['product_id', 'created_at']
      }
    ],
    hooks: {
      beforeCreate: async (ledger) => {
        // Validate that the product exists
        const product = await sequelize.models.Product.findByPk(ledger.product_id);
        if (!product) {
          throw new Error('Product not found');
        }
      }
    }
  });

  return StockLedger;
};
