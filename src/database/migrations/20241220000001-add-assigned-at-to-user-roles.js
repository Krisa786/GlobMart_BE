'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if assigned_at column exists
    const tableDescription = await queryInterface.describeTable('user_roles');

    if (!tableDescription.assigned_at) {
      await queryInterface.addColumn('user_roles', 'assigned_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('user_roles', 'assigned_at');
  }
};
