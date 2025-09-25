'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add used boolean field to password_resets table
    await queryInterface.addColumn('password_resets', 'used', {
      type: Sequelize.TINYINT(1),
      defaultValue: 0,
      allowNull: false
    });

    // Add index for used field for better query performance
    await queryInterface.addIndex('password_resets', ['used', 'expires_at']);
  },

  async down(queryInterface, Sequelize) {
    // Remove the added field and index
    await queryInterface.removeIndex('password_resets', ['used', 'expires_at']);
    await queryInterface.removeColumn('password_resets', 'used');
  }
};
