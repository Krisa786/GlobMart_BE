'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('checkouts', {
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
      shipping_address_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'addresses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      billing_address_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'addresses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      shipping_method: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      tax_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      shipping_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      grand_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.CHAR(3),
        allowNull: false,
        defaultValue: 'INR'
      },
      stock_reserved: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'failed', 'expired'),
        allowNull: false,
        defaultValue: 'active'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      failed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('checkouts', ['cart_id']);
    await queryInterface.addIndex('checkouts', ['shipping_address_id']);
    await queryInterface.addIndex('checkouts', ['billing_address_id']);
    await queryInterface.addIndex('checkouts', ['status']);
    await queryInterface.addIndex('checkouts', ['expires_at']);
    await queryInterface.addIndex('checkouts', ['created_at']);
    await queryInterface.addIndex('checkouts', ['status', 'expires_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('checkouts');
  }
};
