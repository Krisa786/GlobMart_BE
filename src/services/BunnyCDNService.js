const axios = require('axios');
const FormData = require('form-data');
const { logger } = require('../middleware/errorHandler');

class BunnyCDNService {
  constructor() {
    this.storageUrl = process.env.STORAGE_URL;
    this.serverBaseUrl = process.env.STORAGE_SERVER_BASE_URL;
    this.accessKey = process.env.STORAGE_SERVER_ACCESS_KEY;
    
    // Don't throw error during module loading, check in methods instead
  }

  /**
   * Upload a file to Bunny CDN Storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} key - File path/key
   * @param {string} contentType - MIME type
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Upload result with URL and key
   */
  async uploadFile(fileBuffer, key, contentType, metadata = {}) {
    if (!this.isConfigured()) {
      throw new Error('Bunny CDN is not properly configured. Please check your environment variables.');
    }
    
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: key.split('/').pop(),
        contentType: contentType,
      });

      const uploadUrl = `${this.storageUrl}/${key}`;
      
      const response = await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'AccessKey': this.accessKey,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000', // 1 year
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const url = this.getPublicUrl(key);

      logger.info('File uploaded to Bunny CDN successfully', {
        key,
        storageUrl: this.storageUrl,
        contentType,
        size: fileBuffer.length,
        status: response.status,
      });

      return {
        key,
        url,
        size: fileBuffer.length,
        contentType,
      };
    } catch (error) {
      logger.error('Failed to upload file to Bunny CDN:', {
        error: error.message,
        key,
        storageUrl: this.storageUrl,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      throw new Error(`Bunny CDN upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from Bunny CDN Storage
   * @param {string} key - File path/key
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(key) {
    if (!this.isConfigured()) {
      throw new Error('Bunny CDN is not properly configured. Please check your environment variables.');
    }
    
    try {
      const deleteUrl = `${this.storageUrl}/${key}`;
      
      const response = await axios.delete(deleteUrl, {
        headers: {
          'AccessKey': this.accessKey,
        },
      });

      logger.info('File deleted from Bunny CDN successfully', {
        key,
        storageUrl: this.storageUrl,
        status: response.status,
      });

      return true;
    } catch (error) {
      logger.error('Failed to delete file from Bunny CDN:', {
        error: error.message,
        key,
        storageUrl: this.storageUrl,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      throw new Error(`Bunny CDN delete failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple files from Bunny CDN Storage
   * @param {string[]} keys - Array of file paths/keys
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
   * Get public URL for a Bunny CDN file
   * @param {string} key - File path/key
   * @returns {string} Public URL
   */
  getPublicUrl(key) {
    if (this.serverBaseUrl) {
      return `${this.serverBaseUrl}/${key}`;
    }

    // Fallback to storage URL if server base URL is not configured
    return `${this.storageUrl}/${key}`;
  }

  /**
   * Check if Bunny CDN is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return !!(
      this.storageUrl &&
      this.serverBaseUrl &&
      this.accessKey
    );
  }

  /**
   * Generate a unique key for product images
   * @param {number} productId - Product ID
   * @param {string} size - Image size (thumb, medium, large, original)
   * @param {string} extension - File extension
   * @param {string} filename - Original filename (optional)
   * @returns {string} File key
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

  /**
   * Test connection to Bunny CDN
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Bunny CDN is not properly configured',
      };
    }

    try {
      // Try to list files in the root directory to test connection
      const testUrl = `${this.storageUrl}/`;
      
      const response = await axios.get(testUrl, {
        headers: {
          'AccessKey': this.accessKey,
        },
        timeout: 10000, // 10 second timeout
      });

      return {
        success: true,
        status: response.status,
        message: 'Connection to Bunny CDN successful',
      };
    } catch (error) {
      logger.error('Bunny CDN connection test failed:', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      };
    }
  }
}

module.exports = new BunnyCDNService();
