'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add email field and success boolean field
    await queryInterface.addColumn('login_attempts', 'email', {
      type: Sequelize.STRING(191),
      allowNull: true
    });

    await queryInterface.addColumn('login_attempts', 'success', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 0
    });

    await queryInterface.addColumn('login_attempts', 'attempted_at', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });

    // Add index for email field
    await queryInterface.addIndex('login_attempts', ['email', 'attempted_at']);
  },

  async down(queryInterface, Sequelize) {
    // Remove the added fields
    await queryInterface.removeColumn('login_attempts', 'email');
    await queryInterface.removeColumn('login_attempts', 'success');
    await queryInterface.removeColumn('login_attempts', 'attempted_at');

    // Remove the index
    await queryInterface.removeIndex('login_attempts', ['email', 'attempted_at']);
  }
};
