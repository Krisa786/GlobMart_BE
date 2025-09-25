const { ProductImage, Product } = require('../database/models');
const s3Service = require('./S3Service');
const { logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

class ProductImageService {
  /**
   * Get product images with optional filtering
   * @param {number} productId - Product ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Images and metadata
   */
  static async getProductImages(productId, options = {}) {
    try {
      const { size } = options;

      // Build where clause
      const whereClause = { product_id: productId };
      if (size && ['original', 'thumb', 'medium', 'large'].includes(size)) {
        whereClause.size_variant = size;
      }

      const images = await ProductImage.findAll({
        where: whereClause,
        order: [['position', 'ASC'], ['size_variant', 'ASC']],
      });

      // Group images by position for easier frontend consumption
      const groupedImages = this.groupImagesByPosition(images);

      return {
        images: groupedImages,
        total: images.length,
        productId,
      };
    } catch (error) {
      logger.error('Failed to fetch product images:', {
        error: error.message,
        productId,
      });
      throw error;
    }
  }

  /**
   * Delete a product image and all its variants
   * @param {number} productId - Product ID
   * @param {number} imageId - Image ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteImage(productId, imageId) {
    try {
      // Find the image
      const image = await ProductImage.findOne({
        where: {
          id: imageId,
          product_id: productId,
        },
      });

      if (!image) {
        throw new Error('Image not found');
      }

      // Find all variants of this image (same position)
      const variants = await ProductImage.findAll({
        where: {
          product_id: productId,
          position: image.position,
        },
      });

      // Delete all variants from S3
      const s3Keys = variants.map(variant => variant.s3_key);
      const deleteResults = await s3Service.deleteFiles(s3Keys);

      if (deleteResults.failed.length > 0) {
        logger.warn('Some S3 deletions failed:', {
          failed: deleteResults.failed,
          productId,
          imageId,
        });
      }

      // Delete all variants from database
      await ProductImage.destroy({
        where: {
          product_id: productId,
          position: image.position,
        },
      });

      logger.info('Product image and variants deleted successfully', {
        imageId,
        productId,
        variantsDeleted: variants.length,
        s3KeysDeleted: deleteResults.successful.length,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete product image:', {
        error: error.message,
        imageId,
        productId,
      });
      throw error;
    }
  }

  /**
   * Reorder product images
   * @param {number} productId - Product ID
   * @param {Array} imageIds - Array of image IDs in desired order
   * @returns {Promise<boolean>} Success status
   */
  static async reorderImages(productId, imageIds) {
    try {
      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        throw new Error('imageIds must be a non-empty array');
      }

      // Verify all images belong to the product
      const images = await ProductImage.findAll({
        where: {
          id: { [Op.in]: imageIds },
          product_id: productId,
        },
      });

      if (images.length !== imageIds.length) {
        throw new Error('Some images not found or do not belong to this product');
      }

      // Update positions
      const updatePromises = imageIds.map((imageId, index) => {
        return ProductImage.update(
          { position: index },
          {
            where: {
              id: imageId,
              product_id: productId,
            },
          }
        );
      });

      await Promise.all(updatePromises);

      logger.info('Product images reordered successfully', {
        productId,
        imageCount: imageIds.length,
      });

      return true;
    } catch (error) {
      logger.error('Failed to reorder product images:', {
        error: error.message,
        productId,
      });
      throw error;
    }
  }

  /**
   * Set primary image for a product
   * @param {number} productId - Product ID
   * @param {number} imageId - Image ID to set as primary
   * @returns {Promise<boolean>} Success status
   */
  static async setPrimaryImage(productId, imageId) {
    try {
      // Find the image
      const image = await ProductImage.findOne({
        where: {
          id: imageId,
          product_id: productId,
        },
      });

      if (!image) {
        throw new Error('Image not found');
      }

      // Update all images for this product to position > 0
      await ProductImage.update(
        { position: { [Op.gt]: 0 } },
        { where: { product_id: productId } }
      );

      // Set this image as primary (position 0)
      await image.update({ position: 0 });

      logger.info('Primary image set successfully', {
        imageId,
        productId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to set primary image:', {
        error: error.message,
        imageId,
        productId,
      });
      throw error;
    }
  }

  /**
   * Get image statistics for a product
   * @param {number} productId - Product ID
   * @returns {Promise<Object>} Image statistics
   */
  static async getImageStats(productId) {
    try {
      const stats = await ProductImage.findAll({
        where: { product_id: productId },
        attributes: [
          'size_variant',
          [ProductImage.sequelize.fn('COUNT', ProductImage.sequelize.col('id')), 'count'],
          [ProductImage.sequelize.fn('SUM', ProductImage.sequelize.col('file_size')), 'total_size'],
        ],
        group: ['size_variant'],
        raw: true,
      });

      const totalImages = await ProductImage.count({
        where: { product_id: productId },
      });

      const totalSize = await ProductImage.sum('file_size', {
        where: { product_id: productId },
      });

      return {
        totalImages,
        totalSize,
        byVariant: stats.reduce((acc, stat) => {
          acc[stat.size_variant] = {
            count: parseInt(stat.count, 10),
            totalSize: parseInt(stat.total_size, 10) || 0,
          };
          return acc;
        }, {}),
      };
    } catch (error) {
      logger.error('Failed to get image stats:', {
        error: error.message,
        productId,
      });
      throw error;
    }
  }

  /**
   * Clean up orphaned images (images without corresponding product)
   * @returns {Promise<Object>} Cleanup results
   */
  static async cleanupOrphanedImages() {
    try {
      // Find images without corresponding products
      const orphanedImages = await ProductImage.findAll({
        include: [{
          model: Product,
          as: 'product',
          required: false,
        }],
        where: {
          '$product.id$': null,
        },
      });

      if (orphanedImages.length === 0) {
        return {
          deleted: 0,
          s3Keys: [],
        };
      }

      // Delete from S3
      const s3Keys = orphanedImages.map(image => image.s3_key);
      const deleteResults = await s3Service.deleteFiles(s3Keys);

      // Delete from database
      await ProductImage.destroy({
        where: {
          id: { [Op.in]: orphanedImages.map(img => img.id) },
        },
      });

      logger.info('Orphaned images cleaned up', {
        deleted: orphanedImages.length,
        s3Deleted: deleteResults.successful.length,
        s3Failed: deleteResults.failed.length,
      });

      return {
        deleted: orphanedImages.length,
        s3Keys: deleteResults.successful,
        s3Failed: deleteResults.failed,
      };
    } catch (error) {
      logger.error('Failed to cleanup orphaned images:', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find duplicate images by hash
   * @param {number} productId - Product ID (optional)
   * @returns {Promise<Array>} Duplicate image groups
   */
  static async findDuplicateImages(productId = null) {
    try {
      const whereClause = {
        image_hash: { [Op.ne]: null },
      };

      if (productId) {
        whereClause.product_id = productId;
      }

      const duplicates = await ProductImage.findAll({
        where: whereClause,
        attributes: [
          'image_hash',
          [ProductImage.sequelize.fn('COUNT', ProductImage.sequelize.col('id')), 'count'],
          [ProductImage.sequelize.fn('GROUP_CONCAT', ProductImage.sequelize.col('id')), 'image_ids'],
        ],
        group: ['image_hash'],
        having: ProductImage.sequelize.where(
          ProductImage.sequelize.fn('COUNT', ProductImage.sequelize.col('id')),
          '>',
          1
        ),
        raw: true,
      });

      return duplicates.map(dup => ({
        hash: dup.image_hash,
        count: parseInt(dup.count, 10),
        imageIds: dup.image_ids.split(',').map(id => parseInt(id, 10)),
      }));
    } catch (error) {
      logger.error('Failed to find duplicate images:', {
        error: error.message,
        productId,
      });
      throw error;
    }
  }

  /**
   * Group images by position for easier frontend consumption
   * @param {Array} images - Array of image records
   * @returns {Array} Grouped images
   */
  static groupImagesByPosition(images) {
    const grouped = {};

    images.forEach(image => {
      if (!grouped[image.position]) {
        grouped[image.position] = {
          position: image.position,
          variants: {},
        };
      }
      grouped[image.position].variants[image.size_variant] = image;
    });

    return Object.values(grouped).sort((a, b) => a.position - b.position);
  }
}

module.exports = ProductImageService;
