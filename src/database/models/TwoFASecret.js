'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TwoFASecret extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // TwoFASecret belongs to User
      TwoFASecret.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  TwoFASecret.init({
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      allowNull: false
    },
    secret_encrypted: {
      type: DataTypes.BLOB,
      allowNull: false
    },
    is_enabled: {
      type: DataTypes.TINYINT(1),
      defaultValue: 0,
      allowNull: false
    },
    last_verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'TwoFASecret',
    tableName: 'two_fa_secrets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return TwoFASecret;
};
