'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [
      {
        name: 'CUSTOMER',
        description: 'Regular customer with basic access to browse and purchase products',
        is_system: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'ADMIN',
        description: 'System administrator with full access to all features and settings',
        is_system: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'SALES_MANAGER',
        description: 'Sales manager with access to quotes, pricing, and customer management',
        is_system: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'WAREHOUSE',
        description: 'Warehouse staff with access to inventory and order fulfillment',
        is_system: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'FINANCE',
        description: 'Finance team with access to payments, invoices, and financial reports',
        is_system: 1,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'SUPPORT',
        description: 'Customer support team with access to tickets and customer assistance',
        is_system: 1,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {});
  }
};
