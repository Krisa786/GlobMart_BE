'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // User has many roles through user_roles
      User.belongsToMany(models.Role, {
        through: 'user_roles',
        foreignKey: 'user_id',
        otherKey: 'role_id',
        as: 'roles'
      });

      // User has many refresh tokens
      User.hasMany(models.RefreshToken, {
        foreignKey: 'user_id',
        as: 'refreshTokens'
      });

      // User has one 2FA secret
      User.hasOne(models.TwoFASecret, {
        foreignKey: 'user_id',
        as: 'twoFASecret'
      });

      // User has many 2FA backup codes
      User.hasMany(models.TwoFABackupCode, {
        foreignKey: 'user_id',
        as: 'twoFABackupCodes'
      });

      // User has many login attempts
      User.hasMany(models.LoginAttempt, {
        foreignKey: 'user_id',
        as: 'loginAttempts'
      });

      // User has many password resets
      User.hasMany(models.PasswordReset, {
        foreignKey: 'user_id',
        as: 'passwordResets'
      });

      // User has many audit logs as actor
      User.hasMany(models.AuditLog, {
        foreignKey: 'actor_user_id',
        as: 'auditLogs'
      });

      // User can assign roles to other users
      User.hasMany(models.UserRole, {
        foreignKey: 'assigned_by_user_id',
        as: 'assignedRoles'
      });

      // User has many user roles (through table)
      User.hasMany(models.UserRole, {
        foreignKey: 'user_id',
        as: 'userRoles'
      });
    }
  }

  User.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    uuid: {
      type: DataTypes.CHAR(36),
      unique: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(191),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    phone_country_code: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    full_name: {
      type: DataTypes.STRING(191),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 191]
      }
    },
    is_email_verified: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0,
      allowNull: false
    },
    is_active: {
      type: DataTypes.TINYINT(1),
      defaultValue: 1,
      allowNull: false
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['email']
      },
      {
        fields: ['phone']
      },
      {
        fields: ['is_active', 'email']
      }
    ]
  });

  return User;
};
