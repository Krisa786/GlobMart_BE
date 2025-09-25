'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cart_items', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      cart_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'carts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sku: {
        type: Sequelize.STRING(64),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 64]
        }
      },
      qty: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        }
      },
      unit_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },
      line_subtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },
      line_discount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        }
      },
      line_tax: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        }
      },
      line_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        validate: {
          min: 0
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('cart_items', ['cart_id'], {
      name: 'idx_cart_items_cart_id'
    });

    await queryInterface.addIndex('cart_items', ['product_id'], {
      name: 'idx_cart_items_product_id'
    });

    await queryInterface.addIndex('cart_items', ['sku'], {
      name: 'idx_cart_items_sku'
    });

    // Add unique constraint for cart_id + sku combination
    await queryInterface.addIndex('cart_items', ['cart_id', 'sku'], {
      name: 'uniq_cart_sku',
      unique: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cart_items');
  }
};
