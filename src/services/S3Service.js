const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { logger } = require('../middleware/errorHandler');

class S3Service {
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });

    this.bucketName = process.env.S3_BUCKET;
    this.assetBaseUrl = process.env.ASSET_BASE_URL;
    
    // Don't throw error during module loading, check in methods instead
  }

  /**
   * Upload a file to S3
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} key - S3 object key
   * @param {string} contentType - MIME type
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Upload result with URL and key
   */
  async uploadFile(fileBuffer, key, contentType, metadata = {}) {
    if (!this.isConfigured()) {
      throw new Error('S3 is not properly configured. Please check your environment variables.');
    }
    
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
        },
        // Cache control for CDN optimization
        CacheControl: 'public, max-age=31536000', // 1 year
      });

      await this.s3Client.send(command);

      const url = this.getPublicUrl(key);

      logger.info('File uploaded to S3 successfully', {
        key,
        bucket: this.bucketName,
        contentType,
        size: fileBuffer.length,
      });

      return {
        key,
        url,
        size: fileBuffer.length,
        contentType,
      };
    } catch (error) {
      logger.error('Failed to upload file to S3:', {
        error: error.message,
        key,
        bucket: this.bucketName,
      });
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(key) {
    if (!this.isConfigured()) {
      throw new Error('S3 is not properly configured. Please check your environment variables.');
    }
    
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info('File deleted from S3 successfully', {
        key,
        bucket: this.bucketName,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete file from S3:', {
        error: error.message,
        key,
        bucket: this.bucketName,
      });
      throw new Error(`S3 delete failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple files from S3
   * @param {string[]} keys - Array of S3 object keys
   * @returns {Promise<Object>} Results with successful and failed deletions
   */
  async deleteFiles(keys) {
    const results = {
      successful: [],
      failed: [],
    };

    for (const key of keys) {
      try {
        await this.deleteFile(key);
        results.successful.push(key);
      } catch (error) {
        results.failed.push({ key, error: error.message });
      }
    }

    return results;
  }

  /**
   * Generate a signed URL for private access
   * @param {string} key - S3 object key
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.isConfigured()) {
      throw new Error('S3 is not properly configured. Please check your environment variables.');
    }
    
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      logger.info('Generated signed URL for S3 object', {
        key,
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL:', {
        error: error.message,
        key,
      });
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Get public URL for an S3 object
   * @param {string} key - S3 object key
   * @returns {string} Public URL
   */
  getPublicUrl(key) {
    if (this.assetBaseUrl) {
      return `${this.assetBaseUrl}/${key}`;
    }

    // Fallback to standard S3 URL format
    return `https://${this.bucketName}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
  }

  /**
   * Check if S3 is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return !!(
      this.bucketName &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY
    );
  }

  /**
   * Generate a unique key for product images
   * @param {number} productId - Product ID
   * @param {string} size - Image size (thumb, medium, large, original)
   * @param {string} extension - File extension
   * @param {string} filename - Original filename (optional)
   * @returns {string} S3 key
   */
  generateProductImageKey(productId, size, extension, filename = null) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);

    if (filename) {
      const baseFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
      const sanitizedFilename = baseFilename.replace(/[^a-zA-Z0-9-_]/g, '_');
      return `products/${productId}/images/${size}/${sanitizedFilename}_${timestamp}_${randomId}.${extension}`;
    }

    return `products/${productId}/images/${size}/image_${timestamp}_${randomId}.${extension}`;
  }
}

module.exports = new S3Service();
