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
     * Get the full CDN URL
     */
    getFullS3Url() {
      if (this.s3_key) {
        // Using Bunny CDN URL structure
        const bunnyCDNUrl = process.env.STORAGE_SERVER_BASE_URL || 'https://prestious.b-cdn.net';
        return `${bunnyCDNUrl}/${this.s3_key}`;
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
    getterMethods: {
      cdn_url() {
        // If the URL is already a valid external URL (like placeholder), use it directly
        if (this.url && (this.url.startsWith('http://') || this.url.startsWith('https://'))) {
          // Check if it's a placeholder URL or other external service
          if (this.url.includes('via.placeholder.com') || 
              this.url.includes('placeholder.com') ||
              this.url.includes('picsum.photos') ||
              this.url.includes('unsplash.com') ||
              this.url.includes('loremflickr.com')) {
            return this.url;
          }
          
          // Check if it's already a Bunny CDN URL
          if (this.url.includes('b-cdn.net') || this.url.includes('bunnycdn.com')) {
            return this.url;
          }
        }
        
        // For s3_key based URLs, convert to Bunny CDN
        if (this.s3_key) {
          const bunnyCDNUrl = process.env.STORAGE_SERVER_BASE_URL || 'https://prestious.b-cdn.net';
          
          // If s3_key contains a full URL, extract just the path
          let imagePath = this.s3_key;
          if (this.s3_key.includes('amazonaws.com/')) {
            // Extract path from S3 URL
            const urlParts = this.s3_key.split('amazonaws.com/');
            if (urlParts.length > 1) {
              imagePath = urlParts[1];
            }
          } else if (this.s3_key.includes('s3://')) {
            // Handle S3 protocol URLs
            imagePath = this.s3_key.replace('s3://', '').split('/').slice(1).join('/');
          }
          
          return `${bunnyCDNUrl}/${imagePath}`;
        }
        
        return this.url;
      }
    },
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
