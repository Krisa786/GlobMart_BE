const { ProductImage, Product } = require('../database/models');
const bunnyCDNService = require('../services/BunnyCDNService');
const imageProcessingService = require('../services/ImageProcessingService');
const { logger } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

class ProductImageController {
  /**
   * Upload product images with multiple size variants
   * @route POST /api/admin/products/:id/images
   */
  static async uploadImages(req, res) {
    const productId = parseInt(req.params.id, 10);
    const files = req.files || [];
    const userId = req.auth?.userId;

    try {
      // Verify product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
            requestId: req.requestId,
          },
        });
      }

      if (files.length === 0) {
        return res.status(400).json({
          error: {
            code: 'NO_FILES_UPLOADED',
            message: 'No files were uploaded',
            requestId: req.requestId,
          },
        });
      }

      const uploadedImages = [];
      const errors = [];

      // Process each uploaded file
      for (const file of files) {
        try {
          const result = await this.processAndUploadImage(file, productId, userId);
          uploadedImages.push(...result);
        } catch (error) {
          logger.error('Failed to process image:', {
            error: error.message,
            filename: file.originalname,
            productId,
            requestId: req.requestId,
          });
          errors.push({
            filename: file.originalname,
            error: error.message,
          });
        }
      }

      if (uploadedImages.length === 0) {
        return res.status(500).json({
          error: {
            code: 'IMAGE_PROCESSING_FAILED',
            message: 'Failed to process any images',
            errors,
            requestId: req.requestId,
          },
        });
      }

      logger.info('Product images uploaded successfully', {
        productId,
        uploadedCount: uploadedImages.length,
        errorCount: errors.length,
        userId,
        requestId: req.requestId,
      });

      res.status(201).json({
        data: {
          images: uploadedImages,
          summary: {
            uploaded: uploadedImages.length,
            errors: errors.length,
            totalFiles: files.length,
          },
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (error) {
      logger.error('Failed to upload product images:', {
        error: error.message,
        productId,
        requestId: req.requestId,
        userId,
      });

      res.status(500).json({
        error: {
          code: 'IMAGE_UPLOAD_ERROR',
          message: 'Failed to upload images',
          requestId: req.requestId,
        },
      });
    }
  }

  /**
   * Process and upload a single image with all size variants
   * @param {Object} file - Multer file object
   * @param {number} productId - Product ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of created image records
   */
  static async processAndUploadImage(file, productId, userId) {
    const results = [];

    try {
      // Process image to generate variants
      const processedImages = await imageProcessingService.processImage(
        file.buffer,
        file.originalname
      );

      // Get current max position for this product
      const maxPosition = await ProductImage.max('position', {
        where: { product_id: productId },
      });
      const currentPosition = (maxPosition || -1) + 1;

      // Upload original image
      const originalKey = bunnyCDNService.generateProductImageKey(
        productId,
        'original',
        imageProcessingService.getBestOutputFormat(file.mimetype),
        file.originalname
      );

      const originalUpload = await bunnyCDNService.uploadFile(
        processedImages.original.buffer,
        originalKey,
        processedImages.original.metadata.format === 'jpeg' ? 'image/jpeg' :
          processedImages.original.metadata.format === 'png' ? 'image/png' : 'image/webp',
        {
          productId: productId.toString(),
          size: 'original',
          uploadedBy: userId.toString(),
        }
      );

      // Create original image record
      const originalImage = await ProductImage.create({
        product_id: productId,
        s3_key: originalKey,
        url: originalUpload.url,
        alt: `${file.originalname} - Original`,
        position: currentPosition,
        width: processedImages.original.metadata.width,
        height: processedImages.original.metadata.height,
        size_variant: 'original',
        file_size: processedImages.original.metadata.size,
        content_type: processedImages.original.metadata.format === 'jpeg' ? 'image/jpeg' :
          processedImages.original.metadata.format === 'png' ? 'image/png' : 'image/webp',
        image_hash: processedImages.original.metadata.hash,
      });

      results.push(originalImage);

      // Upload size variants
      for (const [sizeName, variant] of Object.entries(processedImages.variants)) {
        try {
          const variantKey = bunnyCDNService.generateProductImageKey(
            productId,
            sizeName,
            variant.metadata.format,
            file.originalname
          );

          const variantUpload = await bunnyCDNService.uploadFile(
            variant.buffer,
            variantKey,
            variant.metadata.format === 'jpeg' ? 'image/jpeg' :
              variant.metadata.format === 'png' ? 'image/png' : 'image/webp',
            {
              productId: productId.toString(),
              size: sizeName,
              uploadedBy: userId.toString(),
            }
          );

          // Create variant image record
          const variantImage = await ProductImage.create({
            product_id: productId,
            s3_key: variantKey,
            url: variantUpload.url,
            alt: `${file.originalname} - ${sizeName}`,
            position: currentPosition, // Same position as original
            width: variant.metadata.width,
            height: variant.metadata.height,
            size_variant: sizeName,
            file_size: variant.metadata.size,
            content_type: variant.metadata.format === 'jpeg' ? 'image/jpeg' :
              variant.metadata.format === 'png' ? 'image/png' : 'image/webp',
            image_hash: variant.metadata.hash,
          });

          results.push(variantImage);
        } catch (error) {
          logger.error(`Failed to upload ${sizeName} variant:`, {
            error: error.message,
            productId,
            size: sizeName,
          });
          // Continue with other variants even if one fails
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to process and upload image:', {
        error: error.message,
        filename: file.originalname,
        productId,
      });
      throw error;
    }
  }

  /**
   * Get product images
   * @route GET /api/admin/products/:id/images
   */
  static async getProductImages(req, res) {
    const productId = parseInt(req.params.id, 10);
    const { size } = req.query;

    try {
      // Verify product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
            requestId: req.requestId,
          },
        });
      }

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

      res.status(200).json({
        data: {
          images: groupedImages,
          total: images.length,
          productId,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch product images:', {
        error: error.message,
        productId,
        requestId: req.requestId,
      });

      res.status(500).json({
        error: {
          code: 'IMAGES_FETCH_ERROR',
          message: 'Failed to fetch product images',
          requestId: req.requestId,
        },
      });
    }
  }

  /**
   * Delete a product image
   * @route DELETE /api/admin/products/:id/images/:imageId
   */
  static async deleteImage(req, res) {
    const productId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    const userId = req.auth?.userId;

    try {
      // Find the image
      const image = await ProductImage.findOne({
        where: {
          id: imageId,
          product_id: productId,
        },
      });

      if (!image) {
        return res.status(404).json({
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: 'Image not found',
            requestId: req.requestId,
          },
        });
      }

      // Delete from Bunny CDN
      try {
        await bunnyCDNService.deleteFile(image.s3_key);
      } catch (bunnyError) {
        logger.warn('Failed to delete image from Bunny CDN:', {
          error: bunnyError.message,
          s3Key: image.s3_key,
          imageId,
          requestId: req.requestId,
        });
        // Continue with database deletion even if S3 deletion fails
      }

      // Delete from database
      await image.destroy();

      logger.info('Product image deleted successfully', {
        imageId,
        productId,
        s3Key: image.s3_key,
        userId,
        requestId: req.requestId,
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete product image:', {
        error: error.message,
        imageId,
        productId,
        requestId: req.requestId,
        userId,
      });

      res.status(500).json({
        error: {
          code: 'IMAGE_DELETE_ERROR',
          message: 'Failed to delete image',
          requestId: req.requestId,
        },
      });
    }
  }

  /**
   * Reorder product images
   * @route PUT /api/admin/products/:id/images/reorder
   */
  static async reorderImages(req, res) {
    const productId = parseInt(req.params.id, 10);
    const { imageIds } = req.body;
    const userId = req.auth?.userId;

    try {
      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_IMAGE_IDS',
            message: 'imageIds must be a non-empty array',
            requestId: req.requestId,
          },
        });
      }

      // Verify product exists
      const product = await Product.findByPk(productId);
      if (!product) {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found',
            requestId: req.requestId,
          },
        });
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
        userId,
        requestId: req.requestId,
      });

      res.status(200).json({
        data: {
          message: 'Images reordered successfully',
          productId,
          imageCount: imageIds.length,
        },
      });
    } catch (error) {
      logger.error('Failed to reorder product images:', {
        error: error.message,
        productId,
        requestId: req.requestId,
        userId,
      });

      res.status(500).json({
        error: {
          code: 'IMAGE_REORDER_ERROR',
          message: 'Failed to reorder images',
          requestId: req.requestId,
        },
      });
    }
  }

  /**
   * Set primary image
   * @route PUT /api/admin/products/:id/images/:imageId/primary
   */
  static async setPrimaryImage(req, res) {
    const productId = parseInt(req.params.id, 10);
    const imageId = parseInt(req.params.imageId, 10);
    const userId = req.auth?.userId;

    try {
      // Find the image
      const image = await ProductImage.findOne({
        where: {
          id: imageId,
          product_id: productId,
        },
      });

      if (!image) {
        return res.status(404).json({
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: 'Image not found',
            requestId: req.requestId,
          },
        });
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
        userId,
        requestId: req.requestId,
      });

      res.status(200).json({
        data: {
          message: 'Primary image set successfully',
          imageId,
          productId,
        },
      });
    } catch (error) {
      logger.error('Failed to set primary image:', {
        error: error.message,
        imageId,
        productId,
        requestId: req.requestId,
        userId,
      });

      res.status(500).json({
        error: {
          code: 'PRIMARY_IMAGE_ERROR',
          message: 'Failed to set primary image',
          requestId: req.requestId,
        },
      });
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

module.exports = ProductImageController;
