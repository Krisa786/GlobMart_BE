const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const { errorHandler, logger } = require('./middleware/errorHandler');
const { requestIdMiddleware } = require('./middleware/requestId');
const { auditMiddleware, auditResponseMiddleware } = require('./middleware/audit');
const { rateLimiters } = require('./middleware/rateLimiter');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const adminCategoriesRoutes = require('./routes/adminCategories');
const adminProductsRoutes = require('./routes/adminProducts');
const adminSearchRoutes = require('./routes/adminSearch');
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const searchRoutes = require('./routes/search');
const cartRoutes = require('./routes/cart');
const checkoutRoutes = require('./routes/checkout');
const docsRoutes = require('./routes/docs');
const openapiRoutes = require('./routes/openapi');
const bunnyTestRoutes = require('./routes/bunnyTest');
const db = require('./database/models');
const { getCheckoutCleanupService } = require('./services/CheckoutCleanupService');
const { getCheckoutCleanupFallback } = require('./services/CheckoutCleanupFallback');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3002'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Request ID middleware (must be early for correlation)
app.use(requestIdMiddleware);

// Audit middleware (must be early for request tracking)
app.use(auditMiddleware);

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Apply rate limiting to routes
app.use('/health', rateLimiters.health, healthRoutes);
app.use('/auth', rateLimiters.auth, authRoutes);
app.use('/admin', rateLimiters.admin, adminRoutes);
app.use('/api/admin/categories', rateLimiters.admin, adminCategoriesRoutes);
app.use('/api/admin/products', rateLimiters.admin, adminProductsRoutes);
app.use('/api/admin/search', rateLimiters.admin, adminSearchRoutes);
app.use('/api/categories', rateLimiters.public, categoriesRoutes);
app.use('/api/products', rateLimiters.public, productsRoutes);
app.use('/api/search', rateLimiters.search, searchRoutes);
app.use('/api/cart', rateLimiters.public, cartRoutes);
app.use('/api/checkout', rateLimiters.public, checkoutRoutes);
app.use('/api', rateLimiters.general, docsRoutes);
app.use('/api', rateLimiters.general, openapiRoutes);
app.use('/api/test', rateLimiters.general, bunnyTestRoutes);

// Response audit middleware (after routes)
app.use(auditResponseMiddleware);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'GlobeMart Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Route not found',
      requestId: req.requestId
    }
  });
});

// Initialize cleanup service
let cleanupService = null;
let fallbackService = null;

if (process.env.NODE_ENV !== 'test') {
  try {
    cleanupService = getCheckoutCleanupService();
    
    // Always start fallback service as backup
    logger.info('Starting fallback checkout cleanup service');
    fallbackService = getCheckoutCleanupFallback();
    fallbackService.start();
    
    // If Redis-based service is also available, it will work alongside fallback
    if (cleanupService.isInitialized) {
      logger.info('Both Redis and fallback cleanup services are running');
    } else {
      logger.info('Using fallback cleanup service only (Redis not available)');
    }
  } catch (error) {
    logger.error('Failed to initialize checkout cleanup service:', {
      error: error.message
    });
    
    // Start fallback service if Redis service fails
    logger.info('Starting fallback checkout cleanup service');
    fallbackService = getCheckoutCleanupFallback();
    fallbackService.start();
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (cleanupService) {
    try {
      await cleanupService.close();
    } catch (error) {
      logger.error('Error closing cleanup service:', error.message);
    }
  }
  
  if (fallbackService) {
    try {
      fallbackService.stop();
    } catch (error) {
      logger.error('Error stopping fallback service:', error.message);
    }
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  if (cleanupService) {
    try {
      await cleanupService.close();
    } catch (error) {
      logger.error('Error closing cleanup service:', error.message);
    }
  }
  
  if (fallbackService) {
    try {
      fallbackService.stop();
    } catch (error) {
      logger.error('Error stopping fallback service:', error.message);
    }
  }
  
  process.exit(0);
});

module.exports = app;
