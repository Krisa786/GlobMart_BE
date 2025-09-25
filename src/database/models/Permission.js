'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Permission belongs to many roles through role_permissions
      Permission.belongsToMany(models.Role, {
        through: 'role_permissions',
        foreignKey: 'permission_id',
        otherKey: 'role_id',
        as: 'roles'
      });
    }
  }

  Permission.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(128),
      unique: true,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 128]
      }
    },
    resource: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 64]
      }
    },
    action: {
      type: DataTypes.STRING(32),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 32]
      }
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Permission',
    tableName: 'permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Permission;
};
