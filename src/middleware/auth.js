const TokenService = require('../services/TokenService');
const AuditService = require('../services/AuditService');
const { logger } = require('./errorHandler');
const db = require('../database/models');
const { v4: uuidv4 } = require('uuid');

/**
 * JWT Authentication Middleware
 * Verifies access tokens and attaches user info to request
 * @deprecated Use authenticateAccessToken instead
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = TokenService.verifyAccessToken(token);

    // Check if user still exists and is active
    const user = await db.User.findOne({
      where: { id: decoded.sub, is_active: true },
      include: [{
        model: db.Role,
        as: 'roles',
        through: { attributes: [] }
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      roles: user.roles ? user.roles.map(role => role.name) : []
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Enhanced JWT Authentication Middleware for RBAC
 * Verifies access tokens with RS256, loads user & roles, attaches req.auth
 * Supports both Authorization header and cookies
 */
const authenticateAccessToken = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    let token = null;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Fallback to cookie if no Authorization header
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token required'
        }
      });
    }

    // Verify token with RS256
    const decoded = TokenService.verifyAccessToken(token);

    // Check if user still exists and is active
    const user = await db.User.findOne({
      where: { id: decoded.sub, is_active: true },
      include: [{
        model: db.Role,
        through: { attributes: [] },
        as: 'roles'
      }]
    });

    if (!user) {
      return res.status(403).json({
        error: {
          code: 'USER_INACTIVE',
          message: 'User not found or inactive'
        }
      });
    }

    // Attach auth info to request (following task requirements)
    req.auth = {
      userId: user.id,
      uuid: user.uuid,
      roles: user.roles ? user.roles.map(role => role.name) : []
    };

    // Also maintain backward compatibility
    req.user = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      roles: user.roles ? user.roles.map(role => role.name) : []
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', {
      error: error.message,
      stack: error.stack,
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token expired'
        }
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token'
        }
      });
    }

    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed'
      }
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string|Array} requiredRoles - Required role(s)
 * @deprecated Use requireRoles instead
 */
const authorize = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRoles = req.user.roles || [];
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Enhanced Role-based authorization middleware for RBAC
 * Checks intersection with req.auth.roles, returns 403 if not allowed
 * Audits denied access attempts
 * @param {...string} roles - Required role(s)
 */
const requireRoles = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.auth) {
        return res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        });
      }

      const userRoles = req.auth.roles || [];
      const requiredRoles = roles.flat(); // Flatten in case arrays are passed

      // Check intersection with user roles
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        // Audit denied access
        await auditAccessDenial(req, 'ROLE_ACCESS_DENIED', {
          requiredRoles,
          userRoles,
          userId: req.auth.userId,
          endpoint: req.originalUrl,
          method: req.method
        });

        return res.status(403).json({
          error: {
            code: 'INSUFFICIENT_ROLES',
            message: 'Insufficient role permissions'
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Role authorization error:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed'
        }
      });
    }
  };
};

/**
 * Permission-based authorization middleware (scaffold for future use)
 * Resolves permissions via role_permissions when populated
 * @param {...string} permissions - Required permission(s)
 */
const requirePermissions = (...permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.auth) {
        return res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        });
      }

      // For Sprint-1, this is a stub implementation
      // In future sprints, this will check role_permissions table
      logger.info('Permission check requested (stub implementation)', {
        requestedPermissions: permissions,
        userId: req.auth.userId,
        requestId: req.requestId
      });

      // For now, just pass through - permissions will be implemented later
      next();
    } catch (error) {
      logger.error('Permission authorization error:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Permission check failed'
        }
      });
    }
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
    await AuditService.log(action, {
      actor_user_id: req.auth?.userId || null,
      resource_type: 'ENDPOINT',
      resource_id: req.originalUrl,
      request_id: req.requestId,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get('User-Agent'),
      meta: {
        method: req.method,
        ...meta
      }
    });
  } catch (error) {
    logger.error('Failed to audit access denial:', error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = TokenService.verifyAccessToken(token);

      const user = await db.User.findOne({
        where: { id: decoded.sub, is_active: true },
        include: [{
          model: db.Role,
          as: 'roles',
          through: { attributes: [] }
        }]
      });

      if (user) {
        req.user = {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          roles: user.roles ? user.roles.map(role => role.name) : []
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    // Just continue without user info
    next();
  }
};

/**
 * Admin-only middleware
 */
const requireAdmin = authorize(['ADMIN']);

/**
 * Customer or Admin middleware
 */
const requireCustomerOrAdmin = authorize(['CUSTOMER', 'ADMIN']);

module.exports = {
  // Legacy middleware (deprecated)
  authenticateToken,
  authorize,
  optionalAuth,
  requireAdmin,
  requireCustomerOrAdmin,

  // New RBAC middleware
  authenticateAccessToken,
  requireRoles,
  requirePermissions,
  auditAccessDenial
};
