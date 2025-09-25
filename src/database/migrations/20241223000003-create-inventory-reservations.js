'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('inventory_reservations', {
      id: {
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      checkout_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'checkouts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      cart_item_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'cart_items',
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
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('active', 'confirmed', 'released'),
        allowNull: false,
        defaultValue: 'active'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      released_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      release_reason: {
        type: Sequelize.STRING(255),
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
    await queryInterface.addIndex('inventory_reservations', ['checkout_id']);
    await queryInterface.addIndex('inventory_reservations', ['cart_item_id']);
    await queryInterface.addIndex('inventory_reservations', ['product_id']);
    await queryInterface.addIndex('inventory_reservations', ['sku']);
    await queryInterface.addIndex('inventory_reservations', ['status']);
    await queryInterface.addIndex('inventory_reservations', ['expires_at']);
    await queryInterface.addIndex('inventory_reservations', ['status', 'expires_at']);
    
    // Add unique constraint
    await queryInterface.addIndex('inventory_reservations', ['checkout_id', 'cart_item_id'], {
      unique: true,
      name: 'unique_checkout_cart_item'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('inventory_reservations');
  }
};
