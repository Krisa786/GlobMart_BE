const { Sequelize } = require('sequelize');

// Create a test-specific database connection
const testSequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false, // Disable SQL logging in tests
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
});

module.exports = testSequelize;
