'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing fields to refresh_tokens table
    await queryInterface.addColumn('refresh_tokens', 'is_revoked', {
      type: Sequelize.TINYINT(1),
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('refresh_tokens', 'rotated_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Rename created_by_ip to ip_address for consistency
    await queryInterface.renameColumn('refresh_tokens', 'created_by_ip', 'ip_address');

    // Add index for is_revoked field
    await queryInterface.addIndex('refresh_tokens', ['is_revoked', 'expires_at']);
  },

  async down(queryInterface, Sequelize) {
    // Remove the added fields
    await queryInterface.removeColumn('refresh_tokens', 'is_revoked');
    await queryInterface.removeColumn('refresh_tokens', 'rotated_at');

    // Rename back
    await queryInterface.renameColumn('refresh_tokens', 'ip_address', 'created_by_ip');

    // Remove the index
    await queryInterface.removeIndex('refresh_tokens', ['is_revoked', 'expires_at']);
  }
};
