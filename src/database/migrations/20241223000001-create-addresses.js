'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('addresses', {
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
      type: {
        type: Sequelize.ENUM('shipping', 'billing'),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      line1: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      line2: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(120),
        allowNull: true
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      country: {
        type: Sequelize.CHAR(2),
        allowNull: false
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
    await queryInterface.addIndex('addresses', ['user_id']);
    await queryInterface.addIndex('addresses', ['type']);
    await queryInterface.addIndex('addresses', ['country']);
    await queryInterface.addIndex('addresses', ['user_id', 'type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('addresses');
  }
};
