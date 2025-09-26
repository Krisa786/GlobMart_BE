const express = require('express');
const router = express.Router();
const bunnyCDNService = require('../services/BunnyCDNService');
const { logger } = require('../middleware/errorHandler');

/**
 * Test Bunny CDN connection
 * GET /api/test/bunny-cdn
 */
router.get('/bunny-cdn', async (req, res) => {
  try {
    const isConfigured = bunnyCDNService.isConfigured();
    
    if (!isConfigured) {
      return res.status(500).json({
        success: false,
        error: 'Bunny CDN is not properly configured',
        details: {
          storageUrl: !!process.env.STORAGE_URL,
          serverBaseUrl: !!process.env.STORAGE_SERVER_BASE_URL,
          accessKey: !!process.env.STORAGE_SERVER_ACCESS_KEY,
        },
      });
    }

    const connectionTest = await bunnyCDNService.testConnection();
    
    res.json({
      success: connectionTest.success,
      configured: isConfigured,
      connection: connectionTest,
      environment: {
        storageUrl: process.env.STORAGE_URL,
        serverBaseUrl: process.env.STORAGE_SERVER_BASE_URL,
        accessKeySet: !!process.env.STORAGE_SERVER_ACCESS_KEY,
      },
    });
  } catch (error) {
    logger.error('Bunny CDN test failed:', {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
