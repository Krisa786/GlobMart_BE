const AuditService = require('../services/AuditService');
const { logger } = require('./errorHandler');

/**
 * Audit Middleware - Attaches request context for audit logging
 * This middleware should be applied early in the middleware chain
 * to ensure request_id, IP, and User-Agent are available for audit logs
 */
const auditMiddleware = (req, res, next) => {
  try {
    // Extract request context
    const requestContext = {
      requestId: req.requestId || null,
      ipAddress: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null,
      userAgent: req.get('User-Agent') || null,
      method: req.method,
      url: req.originalUrl || req.url,
      timestamp: new Date()
    };

    // Attach to request for use in other middleware and controllers
    req.auditContext = requestContext;

    // Log request start (for debugging)
    logger.debug('Request started', {
      requestId: requestContext.requestId,
      method: requestContext.method,
      url: requestContext.url,
      ip: requestContext.ipAddress,
      userAgent: requestContext.userAgent
    });

    next();
  } catch (error) {
    logger.error('Audit middleware error:', {
      error: error.message,
      stack: error.stack
    });
    // Don't fail the request if audit middleware fails
    next();
  }
};

/**
 * Audit Response Middleware - Logs request completion
 * This should be applied after the main request processing
 */
const auditResponseMiddleware = (req, res, next) => {
  try {
    // Store original res.end to intercept response
    const originalEnd = res.end;
    const startTime = Date.now();

    res.end = function(chunk, encoding) {
      try {
        const duration = Date.now() - startTime;
        const responseContext = {
          statusCode: res.statusCode,
          duration,
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl || req.url,
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent')
        };

        // Log response completion
        logger.debug('Request completed', responseContext);

        // Log security-relevant responses
        if (res.statusCode >= 400) {
          logger.warn('Request failed', {
            ...responseContext,
            error: true
          });
        }

        // Call original end method
        originalEnd.call(this, chunk, encoding);
      } catch (error) {
        logger.error('Error in audit response middleware:', error);
        originalEnd.call(this, chunk, encoding);
      }
    };

    next();
  } catch (error) {
    logger.error('Audit response middleware error:', error);
    next();
  }
};

/**
 * Helper function to get request context for audit logging
 * @param {Object} req - Express request object
 * @returns {Object} Request context for audit logs
 */
const getRequestContext = (req) => {
  return {
    request_id: req.requestId || null,
    ip_address: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null,
    user_agent: req.get('User-Agent') || null
  };
};

/**
 * Helper function to audit access denials
 * @param {Object} req - Express request object
 * @param {string} action - Action that was denied
 * @param {Object} meta - Additional metadata
 */
const auditAccessDenial = async (req, action, meta = {}) => {
  try {
    const context = getRequestContext(req);

    await AuditService.log(action, {
      actor_user_id: req.auth?.userId || null,
      resource_type: 'ENDPOINT',
      resource_id: req.originalUrl || req.url,
      request_id: context.request_id,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      meta: {
        method: req.method,
        ...meta
      }
    });
  } catch (error) {
    logger.error('Failed to audit access denial:', {
      error: error.message,
      action,
      requestId: req.requestId
    });
  }
};

/**
 * Helper function to audit successful actions
 * @param {Object} req - Express request object
 * @param {string} action - Action that was performed
 * @param {Object} options - Audit options
 */
const auditAction = async (req, action, options = {}) => {
  try {
    const context = getRequestContext(req);

    await AuditService.log(action, {
      actor_user_id: req.auth?.userId || null,
      request_id: context.request_id,
      ip_address: context.ip_address,
      user_agent: context.user_agent,
      ...options
    });
  } catch (error) {
    logger.error('Failed to audit action:', {
      error: error.message,
      action,
      requestId: req.requestId
    });
  }
};

/**
 * Middleware to audit admin actions
 * This should be applied to admin routes
 */
const auditAdminAction = (action, resourceType = null) => {
  return async (req, res, next) => {
    try {
      // Store original res.json to intercept response
      const originalJson = res.json;
      const startTime = Date.now();

      res.json = function(body) {
        try {
          const duration = Date.now() - startTime;

          // Only audit successful admin actions (2xx status codes)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            auditAction(req, action, {
              resource_type: resourceType,
              resource_id: req.params.id || null,
              meta: {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                duration,
                success: true
              }
            }).catch(error => {
              logger.error('Failed to audit admin action:', error);
            });
          }

          // Call original json method
          originalJson.call(this, body);
        } catch (error) {
          logger.error('Error in audit admin action middleware:', error);
          originalJson.call(this, body);
        }
      };

      next();
    } catch (error) {
      logger.error('Audit admin action middleware error:', error);
      next();
    }
  };
};

module.exports = {
  auditMiddleware,
  auditResponseMiddleware,
  getRequestContext,
  auditAccessDenial,
  auditAction,
  auditAdminAction
};
