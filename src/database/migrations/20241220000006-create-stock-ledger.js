'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_ledger', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      delta: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Stock change amount (positive for increase, negative for decrease)'
      },
      reason: {
        type: Sequelize.ENUM(
          'initial',
          'manual_adjust',
          'order_hold',
          'order_release',
          'return',
          'recount'
        ),
        allowNull: false,
        comment: 'Reason for stock change'
      },
      note: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Additional notes about the stock change'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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
      }
    });

    // Create indexes
    await queryInterface.addIndex('stock_ledger', ['created_at'], {
      name: 'stock_ledger_created_at_index'
    });

    await queryInterface.addIndex('stock_ledger', ['reason'], {
      name: 'stock_ledger_reason_index'
    });

    await queryInterface.addIndex('stock_ledger', ['created_by'], {
      name: 'stock_ledger_created_by_index'
    });

    // Composite index for product history queries
    await queryInterface.addIndex('stock_ledger', ['product_id', 'created_at'], {
      name: 'stock_ledger_product_id_created_at_index'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('stock_ledger');
  }
};
