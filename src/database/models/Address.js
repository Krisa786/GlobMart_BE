'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with user
      Address.belongsTo(models.User, {
        as: 'user',
        foreignKey: 'user_id',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // Association with checkouts (shipping address)
      Address.hasMany(models.Checkout, {
        as: 'shippingCheckouts',
        foreignKey: 'shipping_address_id',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });

      // Association with checkouts (billing address)
      Address.hasMany(models.Checkout, {
        as: 'billingCheckouts',
        foreignKey: 'billing_address_id',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Check if address is complete
     */
    isComplete() {
      return this.name && this.phone && this.email && 
             this.line1 && this.city && this.state && 
             this.postal_code && this.country;
    }

    /**
     * Get formatted address string
     */
    getFormattedAddress() {
      const parts = [
        this.line1,
        this.line2,
        this.city,
        this.state,
        this.postal_code,
        this.country
      ].filter(Boolean);
      
      return parts.join(', ');
    }

    /**
     * Check if address is valid for shipping
     */
    isValidForShipping() {
      return this.isComplete() && this.type === 'shipping';
    }

    /**
     * Check if address is valid for billing
     */
    isValidForBilling() {
      return this.isComplete() && this.type === 'billing';
    }

    /**
     * Get address summary for display
     */
    getSummary() {
      return {
        id: this.id,
        type: this.type,
        name: this.name,
        phone: this.phone,
        email: this.email,
        address: this.getFormattedAddress(),
        country: this.country
      };
    }

    /**
     * Validate postal code format based on country
     */
    validatePostalCode() {
      const postalCodePatterns = {
        'US': /^\d{5}(-\d{4})?$/,
        'CA': /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
        'GB': /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
        'IN': /^\d{6}$/,
        'AU': /^\d{4}$/,
        'DE': /^\d{5}$/,
        'FR': /^\d{5}$/,
        'IT': /^\d{5}$/,
        'ES': /^\d{5}$/,
        'NL': /^\d{4} [A-Z]{2}$/
      };

      const pattern = postalCodePatterns[this.country];
      if (!pattern) {
        return true; // No validation for unknown countries
      }

      return pattern.test(this.postal_code);
    }
  }

  Address.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('shipping', 'billing'),
      allowNull: false,
      validate: {
        isIn: [['shipping', 'billing']]
      }
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: true,
      validate: {
        len: [1, 120]
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [1, 20]
      }
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: true,
      validate: {
        isEmail: true,
        len: [1, 120]
      }
    },
    line1: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [1, 255]
      }
    },
    line2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [1, 255]
      }
    },
    city: {
      type: DataTypes.STRING(120),
      allowNull: true,
      validate: {
        len: [1, 120]
      }
    },
    state: {
      type: DataTypes.STRING(120),
      allowNull: true,
      validate: {
        len: [1, 120]
      }
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [1, 20]
      }
    },
    country: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      validate: {
        len: [2, 2],
        isIn: [['US', 'CA', 'GB', 'IN', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BR', 'MX', 'JP', 'CN', 'KR', 'SG', 'MY', 'TH', 'PH', 'ID', 'VN']]
      }
    }
  }, {
    sequelize,
    modelName: 'Address',
    tableName: 'addresses',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['type']
      },
      {
        fields: ['country']
      },
      {
        fields: ['user_id', 'type']
      }
    ],
    hooks: {
      beforeValidate: async (address) => {
        // Validate postal code format
        if (address.postal_code && address.country) {
          if (!address.validatePostalCode()) {
            throw new Error(`Invalid postal code format for country ${address.country}`);
          }
        }
      }
    }
  });

  return Address;
};
