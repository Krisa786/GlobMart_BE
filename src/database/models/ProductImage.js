'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductImage extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Association with product
      ProductImage.belongsTo(models.Product, {
        as: 'product',
        foreignKey: 'product_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Get the full S3 URL
     */
    getFullS3Url() {
      if (this.s3_key) {
        // Assuming S3 bucket URL structure
        const bucketUrl = process.env.S3_BUCKET_URL || 'https://your-bucket.s3.amazonaws.com';
        return `${bucketUrl}/${this.s3_key}`;
      }
      return this.url;
    }

    /**
     * Get image dimensions as string
     */
    getDimensions() {
      if (this.width && this.height) {
        return `${this.width}x${this.height}`;
      }
      return null;
    }

    /**
     * Check if image has valid dimensions
     */
    hasValidDimensions() {
      return this.width && this.height && this.width > 0 && this.height > 0;
    }

    /**
     * Get aspect ratio
     */
    getAspectRatio() {
      if (this.width && this.height && this.height > 0) {
        return (this.width / this.height).toFixed(2);
      }
      return null;
    }

    /**
     * Check if this is a primary image (position 0)
     */
    isPrimary() {
      return this.position === 0;
    }

    /**
     * Check if this is a specific size variant
     */
    isSizeVariant(variant) {
      return this.size_variant === variant;
    }

    /**
     * Get file size in human readable format
     */
    getFileSizeFormatted() {
      if (!this.file_size) {return null;}

      const bytes = this.file_size;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) {return '0 Bytes';}

      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100  } ${  sizes[i]}`;
    }

    /**
     * Check if image has valid file size
     */
    hasValidFileSize() {
      return this.file_size && this.file_size > 0;
    }

    /**
     * Get image hash for deduplication
     */
    getImageHash() {
      return this.image_hash;
    }
  }

  ProductImage.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      },
      validate: {
        notNull: true
      }
    },
    s3_key: {
      type: DataTypes.STRING(512),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 512]
      }
    },
    url: {
      type: DataTypes.STRING(512),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 512],
        isUrl: true
      }
    },
    alt: {
      type: DataTypes.STRING(160),
      allowNull: true,
      validate: {
        len: [0, 160]
      }
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    size_variant: {
      type: DataTypes.ENUM('original', 'thumb', 'medium', 'large'),
      allowNull: false,
      defaultValue: 'original',
      validate: {
        isIn: [['original', 'thumb', 'medium', 'large']]
      }
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    content_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100]
      }
    },
    image_hash: {
      type: DataTypes.STRING(64),
      allowNull: true,
      validate: {
        len: [64, 64]
      }
    }
  }, {
    sequelize,
    modelName: 'ProductImage',
    tableName: 'product_images',
    timestamps: true,
    underscored: true,
    paranoid: false,
    createdAt: 'created_at',
    updatedAt: false, // No updated_at column in product_images table
    indexes: [
      {
        fields: ['product_id', 'position']
      },
      {
        fields: ['product_id']
      },
      {
        fields: ['s3_key']
      },
      {
        fields: ['product_id', 'size_variant']
      },
      {
        fields: ['image_hash']
      },
      {
        fields: ['size_variant']
      }
    ],
    hooks: {
      beforeValidate: async (image) => {
        // Generate alt text if not provided
        if (!image.alt && image.product_id) {
          const product = await sequelize.models.Product.findByPk(image.product_id);
          if (product) {
            image.alt = `${product.title} - Product Image`;
          }
        }
      },
      beforeCreate: async (image) => {
        // Set position if not provided
        if (image.position === undefined || image.position === null) {
          const maxPosition = await ProductImage.max('position', {
            where: { product_id: image.product_id }
          });
          image.position = (maxPosition || -1) + 1;
        }
      }
    }
  });

  return ProductImage;
};
