const express = require('express');
const router = express.Router();
const db = require('../database/models');
const SearchService = require('../services/SearchService');
const { logger } = require('../middleware/errorHandler');

// Comprehensive health check endpoint
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const healthStatus = {
    success: true,
    message: 'GlobeMart API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {}
  };

  let overallHealthy = true;

  try {
    // Check database health
    const dbStartTime = Date.now();
    try {
      await db.sequelize.authenticate();
      const userCount = await db.User.count();
      const productCount = await db.Product.count();
      const categoryCount = await db.Category.count();
      
      healthStatus.services.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStartTime,
        details: {
          connected: true,
          dialect: db.sequelize.getDialect(),
          userCount,
          productCount,
          categoryCount
        }
      };
    } catch (dbError) {
      overallHealthy = false;
      healthStatus.services.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStartTime,
        error: dbError.message
      };
    }

    // Check search service health
    const searchStartTime = Date.now();
    try {
      const searchHealthy = await SearchService.isHealthy();
      if (searchHealthy) {
        const searchStats = await SearchService.getIndexStats();
        healthStatus.services.search = {
          status: 'healthy',
          responseTime: Date.now() - searchStartTime,
          details: {
            engine: process.env.SEARCH_ENGINE || 'meilisearch',
            indexName: process.env.MEILISEARCH_INDEX_PRODUCTS || 'products',
            documentCount: searchStats.numberOfDocuments,
            isIndexing: searchStats.isIndexing
          }
        };
      } else {
        healthStatus.services.search = {
          status: 'degraded',
          responseTime: Date.now() - searchStartTime,
          warning: 'Search service is not responding but application continues to run'
        };
      }
    } catch (searchError) {
      healthStatus.services.search = {
        status: 'degraded',
        responseTime: Date.now() - searchStartTime,
        warning: 'Search service is not available but application continues to run',
        error: searchError.message
      };
    }

    // Check Redis connection (if configured)
    const redisStartTime = Date.now();
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        connectTimeout: 5000,
        lazyConnect: true
      });

      await redis.ping();
      healthStatus.services.redis = {
        status: 'healthy',
        responseTime: Date.now() - redisStartTime,
        details: {
          connected: true,
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        }
      };
      redis.disconnect();
    } catch (redisError) {
      healthStatus.services.redis = {
        status: 'degraded',
        responseTime: Date.now() - redisStartTime,
        warning: 'Redis is not available but application continues to run',
        error: redisError.message
      };
    }

    // Overall response time
    healthStatus.responseTime = Date.now() - startTime;

    // Determine overall health status
    if (!overallHealthy) {
      healthStatus.success = false;
      healthStatus.message = 'Some services are unhealthy';
      return res.status(503).json(healthStatus);
    }

    // Check if any services are degraded
    const degradedServices = Object.values(healthStatus.services).filter(
      service => service.status === 'degraded'
    );

    if (degradedServices.length > 0) {
      healthStatus.message = 'API is running with degraded services';
      healthStatus.warnings = degradedServices.map(service => service.warning);
    }

    res.status(200).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Database health check endpoint (legacy)
router.get('/db', async (req, res) => {
  try {
    // Test database connection
    await db.sequelize.authenticate();

    // Test a simple query
    const userCount = await db.User.count();
    const productCount = await db.Product.count();
    const categoryCount = await db.Category.count();

    res.status(200).json({
      success: true,
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        dialect: db.sequelize.getDialect(),
        userCount,
        productCount,
        categoryCount
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Search service health check endpoint
router.get('/search', async (req, res) => {
  try {
    const isHealthy = await SearchService.isHealthy();
    
    if (isHealthy) {
      const stats = await SearchService.getIndexStats();
      res.status(200).json({
        success: true,
        message: 'Search service is healthy',
        timestamp: new Date().toISOString(),
        search: {
          status: 'healthy',
          engine: process.env.SEARCH_ENGINE || 'meilisearch',
          indexName: process.env.MEILISEARCH_INDEX_PRODUCTS || 'products',
          stats
        }
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Search service is not responding',
        timestamp: new Date().toISOString(),
        search: {
          status: 'unhealthy'
        }
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Search service health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed system information endpoint
router.get('/system', (req, res) => {
  const systemInfo = {
    success: true,
    timestamp: new Date().toISOString(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null,
        cpuCount: require('os').cpus().length
      }
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3001,
      version: process.env.npm_package_version || '1.0.0'
    }
  };

  res.status(200).json(systemInfo);
});

module.exports = router;
