'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with category
      Product.belongsTo(models.Category, {
        as: 'category',
        foreignKey: 'category_id',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });

      // Association with product images
      Product.hasMany(models.ProductImage, {
        as: 'images',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with inventory
      Product.hasOne(models.Inventory, {
        as: 'inventory',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with stock ledger
      Product.hasMany(models.StockLedger, {
        as: 'stockLedger',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });

      // Association with users (created_by, updated_by)
      Product.belongsTo(models.User, {
        as: 'creator',
        foreignKey: 'created_by',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      Product.belongsTo(models.User, {
        as: 'updater',
        foreignKey: 'updated_by',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Get the primary image (first image by position)
     */
    async getPrimaryImage() {
      const images = await this.getImages({
        order: [['position', 'ASC']],
        limit: 1
      });
      return images[0] || null;
    }

    /**
     * Check if product is in stock
     */
    async isInStock() {
      const inventory = await this.getInventory();
      return inventory ? inventory.quantity > 0 : false;
    }

    /**
     * Get current stock quantity
     */
    async getStockQuantity() {
      const inventory = await this.getInventory();
      return inventory ? inventory.quantity : 0;
    }

    /**
     * Check if product is low stock
     */
    async isLowStock() {
      const inventory = await this.getInventory();
      if (!inventory) {return false;}
      return inventory.quantity <= inventory.low_stock_threshold;
    }

    /**
     * Get formatted price with currency
     */
    getFormattedPrice() {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: this.currency || 'USD'
      });
      return formatter.format(this.price);
    }

    /**
     * Check if product has sustainability badges
     */
    hasSustainabilityBadges() {
      return this.sustainability_badges &&
             Array.isArray(this.sustainability_badges) &&
             this.sustainability_badges.length > 0;
    }

    /**
     * Get sustainability badges as array
     */
    getSustainabilityBadges() {
      return this.sustainability_badges || [];
    }

    /**
     * Check if product is published and not deleted
     */
    isPublished() {
      return this.status === 'published' && !this.deleted_at;
    }
  }

  Product.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(220),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 220]
      }
    },
    slug: {
      type: DataTypes.STRING(240),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 240],
        isSlug(value) {
          if (!/^[a-z0-9-]+$/.test(value)) {
            throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
          }
        }
      }
    },
    sku: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 64]
      }
    },
    short_desc: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    long_desc: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    brand: {
      type: DataTypes.STRING(120),
      allowNull: true,
      validate: {
        len: [0, 120]
      }
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      },
      validate: {
        notNull: true
      }
    },
    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: 'USD',
      validate: {
        len: [3, 3],
        isIn: [['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']]
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'published', 'archived']]
      }
    },
    sustainability_badges: {
      type: DataTypes.JSON,
      allowNull: true,
      validate: {
        isValidBadges(value) {
          if (value && !Array.isArray(value)) {
            throw new Error('Sustainability badges must be an array');
          }
          if (value && value.some(badge => typeof badge !== 'string')) {
            throw new Error('All sustainability badges must be strings');
          }
        }
      }
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: true
    },
    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
    timestamps: true,
    underscored: true,
    paranoid: true, // Enable soft delete
    deletedAt: 'deleted_at',
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        unique: true,
        fields: ['sku']
      },
      {
        fields: ['category_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['deleted_at']
      },
      {
        fields: ['brand']
      },
      {
        fields: ['price']
      },
      {
        fields: ['status', 'deleted_at']
      }
    ],
    hooks: {
      beforeValidate: async (product) => {
        // Generate slug if not provided
        if (!product.slug && product.title) {
          product.slug = product.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
        }

        // Generate SKU if not provided
        if (!product.sku && product.title) {
          const timestamp = Date.now().toString().slice(-6);
          const titlePrefix = product.title
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 6);
          product.sku = `${titlePrefix}-${timestamp}`;
        }
      },
      afterCreate: async (product) => {
        // Create inventory record when product is created
        if (product.status === 'published') {
          await sequelize.models.Inventory.create({
            product_id: product.id,
            quantity: 0,
            low_stock_threshold: 5
          });
        }
      },
      afterUpdate: async (product) => {
        // Create inventory record if product is published and inventory doesn't exist
        if (product.status === 'published' && product.changed('status')) {
          const existingInventory = await sequelize.models.Inventory.findOne({
            where: { product_id: product.id }
          });

          if (!existingInventory) {
            await sequelize.models.Inventory.create({
              product_id: product.id,
              quantity: 0,
              low_stock_threshold: 5
            });
          }
        }
      }
    }
  });

  return Product;
};
