'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // AuditLog belongs to User (actor)
      AuditLog.belongsTo(models.User, {
        foreignKey: 'actor_user_id',
        as: 'actor'
      });
    }
  }

  AuditLog.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    actor_user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    action: {
      type: DataTypes.STRING(128),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 128]
      }
    },
    resource_type: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    resource_id: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    request_id: {
      type: DataTypes.CHAR(36),
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    meta_json: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['actor_user_id', 'created_at']
      },
      {
        fields: ['action', 'created_at']
      }
    ]
  });

  return AuditLog;
};
