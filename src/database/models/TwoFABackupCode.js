'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TwoFABackupCode extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // TwoFABackupCode belongs to User
      TwoFABackupCode.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }
  }

  TwoFABackupCode.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    code_hash: {
      type: DataTypes.CHAR(64),
      unique: true,
      allowNull: false
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'TwoFABackupCode',
    tableName: 'two_fa_backup_codes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['code_hash'],
        unique: true
      }
    ]
  });

  return TwoFABackupCode;
};
