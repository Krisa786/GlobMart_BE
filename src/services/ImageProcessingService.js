const sharp = require('sharp');
const crypto = require('crypto');
const { logger } = require('../middleware/errorHandler');

class ImageProcessingService {
  constructor() {
    // Image size configurations
    this.sizes = {
      thumb: { width: 200, height: 200, fit: 'cover' },
      medium: { width: 800, height: 800, fit: 'inside' },
      large: { width: 1600, height: 1600, fit: 'inside' },
    };

    // Supported formats and their MIME types
    this.supportedFormats = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };

    // Quality settings for different formats
    this.qualitySettings = {
      jpeg: 85,
      png: 90,
      webp: 80,
    };
  }

  /**
   * Process an image buffer and generate multiple sizes
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} originalFilename - Original filename for metadata
   * @returns {Promise<Object>} Processed images with metadata
   */
  async processImage(imageBuffer, originalFilename = null) {
    try {
      // Validate image buffer
      const metadata = await sharp(imageBuffer).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image: unable to read dimensions');
      }

      // Generate hash for deduplication
      const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

      // Get the best output format based on input
      const outputFormat = this.getBestOutputFormat(metadata.format);

      const results = {
        original: {
          buffer: imageBuffer,
          metadata: {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: imageBuffer.length,
            hash,
            filename: originalFilename,
          },
        },
        variants: {},
      };

      // Process each size variant
      for (const [sizeName, sizeConfig] of Object.entries(this.sizes)) {
        try {
          const processed = await this.resizeImage(
            imageBuffer,
            sizeConfig,
            outputFormat
          );

          results.variants[sizeName] = {
            buffer: processed.buffer,
            metadata: {
              width: processed.metadata.width,
              height: processed.metadata.height,
              format: outputFormat,
              size: processed.buffer.length,
              hash: crypto.createHash('sha256').update(processed.buffer).digest('hex'),
              originalSize: sizeName,
            },
          };

          logger.info(`Generated ${sizeName} variant`, {
            originalSize: `${metadata.width}x${metadata.height}`,
            processedSize: `${processed.metadata.width}x${processed.metadata.height}`,
            format: outputFormat,
            size: processed.buffer.length,
          });
        } catch (error) {
          logger.error(`Failed to process ${sizeName} variant:`, {
            error: error.message,
            size: sizeName,
          });
          throw error;
        }
      }

      return results;
    } catch (error) {
      logger.error('Image processing failed:', {
        error: error.message,
        filename: originalFilename,
      });
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Resize an image to specific dimensions
   * @param {Buffer} imageBuffer - Source image buffer
   * @param {Object} sizeConfig - Size configuration
   * @param {string} outputFormat - Output format
   * @param {string} sizeName - Size name for logging
   * @returns {Promise<Object>} Resized image with metadata
   */
  async resizeImage(imageBuffer, sizeConfig, outputFormat) {
    let sharpInstance = sharp(imageBuffer);

    // Auto-rotate based on EXIF data
    sharpInstance = sharpInstance.rotate();

    // Apply resize based on fit strategy
    if (sizeConfig.fit === 'cover') {
      // Crop to exact dimensions (for thumbnails)
      sharpInstance = sharpInstance.resize(sizeConfig.width, sizeConfig.height, {
        fit: 'cover',
        position: 'center',
      });
    } else {
      // Scale to fit within dimensions (for medium/large)
      sharpInstance = sharpInstance.resize(sizeConfig.width, sizeConfig.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Apply format-specific optimizations
    const quality = this.qualitySettings[outputFormat];

    switch (outputFormat) {
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
      });
      break;
    case 'png':
      sharpInstance = sharpInstance.png({
        quality,
        progressive: true,
        compressionLevel: 9,
      });
      break;
    case 'webp':
      sharpInstance = sharpInstance.webp({
        quality,
        effort: 6,
      });
      break;
    }

    const buffer = await sharpInstance.toBuffer();
    const metadata = await sharp(buffer).metadata();

    return {
      buffer,
      metadata,
    };
  }

  /**
   * Determine the best output format based on input format
   * @param {string} inputFormat - Input image format
   * @returns {string} Best output format
   */
  getBestOutputFormat(inputFormat) {
    const formatMap = {
      'jpeg': 'jpeg',
      'jpg': 'jpeg',
      'png': 'png',
      'webp': 'webp',
      'gif': 'png', // Convert GIF to PNG
      'bmp': 'png', // Convert BMP to PNG
      'tiff': 'png', // Convert TIFF to PNG
    };

    return formatMap[inputFormat?.toLowerCase()] || 'jpeg';
  }

  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @returns {Object} Validation result
   */
  validateImageFile(file) {
    const errors = [];

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.push(`File size exceeds 5MB limit (${Math.round(file.size / 1024 / 1024)}MB)`);
    }

    // Check MIME type
    const allowedTypes = Object.values(this.supportedFormats);
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`Unsupported file type: ${file.mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const allowedExtensions = Object.keys(this.supportedFormats);
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`Unsupported file extension: ${fileExtension}. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get image dimensions from buffer
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Object>} Image dimensions and metadata
   */
  async getImageMetadata(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density,
        space: metadata.space,
      };
    } catch (error) {
      logger.error('Failed to read image metadata:', {
        error: error.message,
      });
      throw new Error(`Failed to read image metadata: ${error.message}`);
    }
  }

  /**
   * Generate a hash for image deduplication
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {string} SHA256 hash
   */
  generateImageHash(imageBuffer) {
    return crypto.createHash('sha256').update(imageBuffer).digest('hex');
  }

  /**
   * Get supported formats
   * @returns {Object} Supported formats and MIME types
   */
  getSupportedFormats() {
    return {
      formats: Object.keys(this.supportedFormats),
      mimeTypes: Object.values(this.supportedFormats),
      maxSize: 5 * 1024 * 1024, // 5MB
    };
  }
}

module.exports = new ImageProcessingService();
