const db = require('../database/models');
const { logger } = require('../middleware/errorHandler');

/**
 * AuditService - Centralized audit logging service
 * Records security-sensitive events and admin actions with metadata
 */
class AuditService {
  constructor() {
    this.MAX_META_SIZE = 10000; // 10KB limit for meta_json
  }

  /**
   * Log an audit event
   * @param {string} action - The action being logged (e.g., 'ADMIN_LOGIN', 'ROLE_ASSIGN')
   * @param {Object} options - Audit options
   * @param {number|null} options.actor_user_id - ID of the user performing the action
   * @param {string|null} options.resource_type - Type of resource being acted upon
   * @param {string|null} options.resource_id - ID of the resource being acted upon
   * @param {string|null} options.request_id - Request ID for tracing
   * @param {string|null} options.ip_address - IP address of the request
   * @param {string|null} options.user_agent - User agent string
   * @param {Object|null} options.meta - Additional metadata (will be JSON stringified)
   * @returns {Promise<Object>} Created audit log entry
   */
  async log(action, options = {}) {
    try {
      const {
        actor_user_id = null,
        resource_type = null,
        resource_id = null,
        request_id = null,
        ip_address = null,
        user_agent = null,
        meta = null
      } = options;

      // Validate action
      if (!action || typeof action !== 'string') {
        throw new Error('Action is required and must be a string');
      }

      // Process and validate metadata
      let metaJson = null;
      if (meta) {
        try {
          const metaString = JSON.stringify(meta);
          if (metaString.length > this.MAX_META_SIZE) {
            // Truncate large metadata
            const truncatedMeta = {
              ...meta,
              _truncated: true,
              _originalSize: metaString.length
            };
            metaJson = JSON.stringify(truncatedMeta).substring(0, this.MAX_META_SIZE);
            logger.warn('Audit metadata truncated due to size limit', {
              action,
              originalSize: metaString.length,
              maxSize: this.MAX_META_SIZE
            });
          } else {
            metaJson = meta;
          }
        } catch (error) {
          logger.error('Failed to serialize audit metadata', { action, error: error.message });
          metaJson = { error: 'Failed to serialize metadata', originalMeta: meta };
        }
      }

      // Create audit log entry
      const auditLog = await db.AuditLog.create({
        actor_user_id,
        action,
        resource_type,
        resource_id,
        request_id,
        ip_address,
        user_agent,
        meta_json: metaJson
      });

      // Log to application logger for immediate visibility
      logger.info('Audit event logged', {
        auditId: auditLog.id,
        action,
        actorUserId: actor_user_id,
        resourceType: resource_type,
        resourceId: resource_id,
        requestId: request_id,
        ip: ip_address
      });

      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log', {
        action,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Log authentication events
   * @param {string} eventType - Type of auth event (LOGIN_SUCCESS, LOGIN_FAIL, LOGOUT, etc.)
   * @param {Object} options - Event options
   * @param {number|null} options.user_id - User ID (null for failed attempts)
   * @param {string} options.email - Email address
   * @param {string|null} options.ip_address - IP address
   * @param {string|null} options.user_agent - User agent
   * @param {string|null} options.request_id - Request ID
   * @param {Object|null} options.meta - Additional metadata
   */
  async logAuthEvent(eventType, options = {}) {
    const {
      user_id = null,
      email,
      ip_address = null,
      user_agent = null,
      request_id = null,
      meta = {}
    } = options;

    const action = this.getAuthAction(eventType);
    const additionalMeta = {
      email: this.scrubEmail(email),
      eventType,
      ...meta
    };

    return this.log(action, {
      actor_user_id: user_id,
      resource_type: 'USER',
      resource_id: user_id ? user_id.toString() : null,
      request_id,
      ip_address,
      user_agent,
      meta: additionalMeta
    });
  }

  /**
   * Log RBAC events (role assignments, access denials, etc.)
   * @param {string} eventType - Type of RBAC event
   * @param {Object} options - Event options
   * @param {number} options.actor_user_id - User performing the action
   * @param {number|null} options.target_user_id - Target user (for role assignments)
   * @param {string|null} options.role_name - Role name
   * @param {string|null} options.endpoint - Endpoint accessed
   * @param {string|null} options.request_id - Request ID
   * @param {string|null} options.ip_address - IP address
   * @param {string|null} options.user_agent - User agent
   * @param {Object|null} options.meta - Additional metadata
   */
  async logRBACEvent(eventType, options = {}) {
    const {
      actor_user_id,
      target_user_id = null,
      role_name = null,
      endpoint = null,
      request_id = null,
      ip_address = null,
      user_agent = null,
      meta = {}
    } = options;

    const action = this.getRBACAction(eventType);
    const additionalMeta = {
      eventType,
      targetUserId: target_user_id,
      roleName: role_name,
      endpoint,
      ...meta
    };

    return this.log(action, {
      actor_user_id,
      resource_type: target_user_id ? 'USER' : 'ENDPOINT',
      resource_id: target_user_id ? target_user_id.toString() : endpoint,
      request_id,
      ip_address,
      user_agent,
      meta: additionalMeta
    });
  }

  /**
   * Log 2FA events
   * @param {string} eventType - Type of 2FA event
   * @param {Object} options - Event options
   * @param {number} options.user_id - User ID
   * @param {string|null} options.request_id - Request ID
   * @param {string|null} options.ip_address - IP address
   * @param {string|null} options.user_agent - User agent
   * @param {Object|null} options.meta - Additional metadata
   */
  async log2FAEvent(eventType, options = {}) {
    const {
      user_id,
      request_id = null,
      ip_address = null,
      user_agent = null,
      meta = {}
    } = options;

    const action = this.get2FAAction(eventType);
    const additionalMeta = {
      eventType,
      ...meta
    };

    return this.log(action, {
      actor_user_id: user_id,
      resource_type: 'USER',
      resource_id: user_id.toString(),
      request_id,
      ip_address,
      user_agent,
      meta: additionalMeta
    });
  }

  /**
   * Log admin actions
   * @param {string} action - Admin action being performed
   * @param {Object} options - Action options
   * @param {number} options.actor_user_id - Admin user ID
   * @param {string} options.resource_type - Type of resource being modified
   * @param {string|null} options.resource_id - ID of resource being modified
   * @param {string|null} options.request_id - Request ID
   * @param {string|null} options.ip_address - IP address
   * @param {string|null} options.user_agent - User agent
   * @param {Object|null} options.meta - Additional metadata
   */
  async logAdminAction(action, options = {}) {
    const {
      actor_user_id,
      resource_type,
      resource_id = null,
      request_id = null,
      ip_address = null,
      user_agent = null,
      meta = {}
    } = options;

    const additionalMeta = {
      adminAction: true,
      ...meta
    };

    return this.log(action, {
      actor_user_id,
      resource_type,
      resource_id,
      request_id,
      ip_address,
      user_agent,
      meta: additionalMeta
    });
  }

  /**
   * Get audit logs with pagination and filtering
   * @param {Object} filters - Filter options
   * @param {number|null} filters.actor_user_id - Filter by actor user ID
   * @param {string|null} filters.action - Filter by action
   * @param {string|null} filters.resource_type - Filter by resource type
   * @param {Date|null} filters.start_date - Start date filter
   * @param {Date|null} filters.end_date - End date filter
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Records per page (default: 50, max: 100)
   * @returns {Promise<Object>} Paginated audit logs
   */
  async getAuditLogs(filters = {}) {
    try {
      const {
        actor_user_id = null,
        action = null,
        resource_type = null,
        start_date = null,
        end_date = null,
        page = 1,
        limit = 50
      } = filters;

      // Build where clause
      const whereClause = {};

      if (actor_user_id) {
        whereClause.actor_user_id = actor_user_id;
      }

      if (action) {
        whereClause.action = action;
      }

      if (resource_type) {
        whereClause.resource_type = resource_type;
      }

      if (start_date || end_date) {
        whereClause.created_at = {};
        if (start_date) {
          whereClause.created_at[db.Sequelize.Op.gte] = new Date(start_date);
        }
        if (end_date) {
          whereClause.created_at[db.Sequelize.Op.lte] = new Date(end_date);
        }
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const limitInt = Math.min(parseInt(limit), 100); // Max 100 records per page

      // Fetch audit logs with pagination
      const { count, rows: auditLogs } = await db.AuditLog.findAndCountAll({
        where: whereClause,
        include: [{
          model: db.User,
          as: 'actor',
          attributes: ['id', 'uuid', 'email', 'full_name'],
          required: false
        }],
        order: [['created_at', 'DESC']],
        limit: limitInt,
        offset
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(count / limitInt);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        auditLogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords: count,
          hasNextPage,
          hasPrevPage,
          limit: limitInt
        }
      };
    } catch (error) {
      logger.error('Failed to fetch audit logs', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  /**
   * Helper method to get auth action from event type
   * @param {string} eventType - Event type
   * @returns {string} Action string
   */
  getAuthAction(eventType) {
    const actionMap = {
      'LOGIN_SUCCESS': 'USER_LOGIN_SUCCESS',
      'LOGIN_FAIL': 'USER_LOGIN_FAIL',
      'ADMIN_LOGIN_SUCCESS': 'ADMIN_LOGIN_SUCCESS',
      'ADMIN_LOGIN_FAIL': 'ADMIN_LOGIN_FAIL',
      'LOGOUT': 'USER_LOGOUT',
      'PASSWORD_RESET_REQUEST': 'PASSWORD_RESET_REQUEST',
      'PASSWORD_RESET_SUCCESS': 'PASSWORD_RESET_SUCCESS',
      'PASSWORD_CHANGE': 'PASSWORD_CHANGE',
      'TOKEN_REFRESH': 'TOKEN_REFRESH',
      'TOKEN_REUSE_DETECTED': 'TOKEN_REUSE_DETECTED'
    };
    return actionMap[eventType] || `AUTH_${eventType}`;
  }

  /**
   * Helper method to get RBAC action from event type
   * @param {string} eventType - Event type
   * @returns {string} Action string
   */
  getRBACAction(eventType) {
    const actionMap = {
      'ROLE_ASSIGN': 'ROLE_ASSIGN',
      'ROLE_REMOVE': 'ROLE_REMOVE',
      'ACCESS_DENIED': 'ACCESS_DENIED',
      'ROLE_ACCESS_DENIED': 'ROLE_ACCESS_DENIED',
      'PERMISSION_DENIED': 'PERMISSION_DENIED'
    };
    return actionMap[eventType] || `RBAC_${eventType}`;
  }

  /**
   * Helper method to get 2FA action from event type
   * @param {string} eventType - Event type
   * @returns {string} Action string
   */
  get2FAAction(eventType) {
    const actionMap = {
      '2FA_ENABLE': '2FA_ENABLE',
      '2FA_DISABLE': '2FA_DISABLE',
      '2FA_SUCCESS': '2FA_SUCCESS',
      '2FA_FAIL': '2FA_FAIL',
      '2FA_BACKUP_USED': '2FA_BACKUP_USED'
    };
    return actionMap[eventType] || `2FA_${eventType}`;
  }

  /**
   * Scrub email for privacy (hash or mask)
   * @param {string} email - Email address
   * @returns {string} Scrubbed email
   */
  scrubEmail(email) {
    if (!email) {return null;}

    // For audit logs, we'll hash the email for privacy
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16);
  }

  /**
   * Clean up old audit logs (for maintenance)
   * @param {number} daysToKeep - Number of days to keep logs (default: 90)
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldLogs(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await db.AuditLog.destroy({
        where: {
          created_at: {
            [db.Sequelize.Op.lt]: cutoffDate
          }
        }
      });

      logger.info('Cleaned up old audit logs', {
        deletedCount,
        cutoffDate,
        daysToKeep
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old audit logs', {
        error: error.message,
        daysToKeep
      });
      throw error;
    }
  }
}

module.exports = new AuditService();
