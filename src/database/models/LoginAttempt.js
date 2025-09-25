'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoginAttempt extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // LoginAttempt belongs to User (optional)
      LoginAttempt.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'User'
      });
    }
  }

  LoginAttempt.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    email_tried: {
      type: DataTypes.STRING(191),
      allowNull: true
    },
    success: {
      type: DataTypes.TINYINT(1),
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('SUCCESS', 'FAIL', 'LOCKED'),
      allowNull: false
    },
    attempted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    ip_address: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LoginAttempt',
    tableName: 'login_attempts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['email_tried', 'created_at']
      },
      {
        fields: ['user_id', 'created_at']
      }
    ]
  });

  return LoginAttempt;
};
