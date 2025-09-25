'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING(220),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(240),
        allowNull: false,
        unique: true
      },
      sku: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      short_desc: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      long_desc: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      brand: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      currency: {
        type: Sequelize.CHAR(3),
        allowNull: false,
        defaultValue: 'USD'
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived'),
        allowNull: false,
        defaultValue: 'draft'
      },
      sustainability_badges: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of sustainability badges like ["FSC", "Recycled"]'
      },
      meta: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for product specifications'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      },
      created_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updated_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp'
      }
    });

    // Create indexes
    await queryInterface.addIndex('products', ['status'], {
      name: 'products_status_index'
    });

    await queryInterface.addIndex('products', ['deleted_at'], {
      name: 'products_deleted_at_index'
    });

    await queryInterface.addIndex('products', ['brand'], {
      name: 'products_brand_index'
    });

    await queryInterface.addIndex('products', ['price'], {
      name: 'products_price_index'
    });

    // Composite index for active products
    await queryInterface.addIndex('products', ['status', 'deleted_at'], {
      name: 'products_status_deleted_at_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('products');
  }
};
