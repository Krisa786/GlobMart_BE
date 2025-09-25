'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('carts', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      cart_token: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        unique: true
      },
      currency: {
        type: Sequelize.CHAR(3),
        allowNull: false,
        defaultValue: 'INR',
        validate: {
          isIn: [['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD']]
        }
      },
      subtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        }
      },
      discount_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        }
      },
      tax_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        }
      },
      shipping_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        }
      },
      grand_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0
        }
      },
      status: {
        type: Sequelize.ENUM('active', 'converted', 'abandoned'),
        allowNull: false,
        defaultValue: 'active'
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
    await queryInterface.addIndex('carts', ['user_id'], {
      name: 'idx_carts_user_id'
    });

    await queryInterface.addIndex('carts', ['cart_token'], {
      name: 'idx_carts_cart_token',
      unique: true
    });

    await queryInterface.addIndex('carts', ['status'], {
      name: 'idx_carts_status'
    });

    await queryInterface.addIndex('carts', ['created_at'], {
      name: 'idx_carts_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('carts');
  }
};
