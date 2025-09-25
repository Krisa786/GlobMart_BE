'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserRole extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // UserRole belongs to User
      UserRole.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // UserRole belongs to Role
      UserRole.belongsTo(models.Role, {
        foreignKey: 'role_id',
        as: 'role'
      });

      // UserRole belongs to User (assigned by)
      UserRole.belongsTo(models.User, {
        foreignKey: 'assigned_by_user_id',
        as: 'assignedBy'
      });
    }
  }

  UserRole.init({
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    role_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    assigned_by_user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'UserRole',
    tableName: 'user_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return UserRole;
};
