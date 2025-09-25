const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateAccessToken, requireRoles } = require('../middleware/auth');
const { requestIdMiddleware } = require('../middleware/requestId');
const { auditMiddleware, auditAdminAction } = require('../middleware/audit');
const AuditService = require('../services/AuditService');
const db = require('../database/models');
const { logger } = require('../middleware/errorHandler');

// Note: requestIdMiddleware and auditMiddleware are already applied globally in server.js

/**
 * @route   GET /admin/audit-logs
 * @desc    Get audit logs (Admin only)
 * @access  Private (Admin role required)
 * @query   { page?, limit?, action?, actor_user_id?, start_date?, end_date? }
 */
router.get('/audit-logs',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('AUDIT_LOGS_VIEW', 'AUDIT_LOG'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        action,
        actor_user_id,
        start_date,
        end_date
      } = req.query;

      // Use AuditService to get logs
      const result = await AuditService.getAuditLogs({
        page: parseInt(page),
        limit: parseInt(limit),
        action,
        actor_user_id: actor_user_id ? parseInt(actor_user_id) : null,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Failed to fetch audit logs:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'AUDIT_LOGS_FETCH_ERROR',
          message: 'Failed to fetch audit logs'
        }
      });
    }
  }
);

/**
 * @route   GET /admin/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin role required)
 * @query   { page?, limit?, search?, is_active? }
 */
router.get('/users',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('USERS_VIEW', 'USER'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        is_active
      } = req.query;

      // Build where clause
      const whereClause = {};

      if (search) {
        whereClause[db.Sequelize.Op.or] = [
          { email: { [db.Sequelize.Op.like]: `%${search}%` } },
          { full_name: { [db.Sequelize.Op.like]: `%${search}%` } }
        ];
      }

      if (is_active !== undefined) {
        whereClause.is_active = is_active === 'true' ? 1 : 0;
      }

      // Calculate pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const limitInt = Math.min(parseInt(limit), 100);

      // Fetch users with roles
      const { count, rows: users } = await db.User.findAndCountAll({
        where: whereClause,
        include: [{
          model: db.Role,
          as: 'roles',
          through: { attributes: [] },
          attributes: ['id', 'name', 'description']
        }],
        attributes: {
          exclude: ['password_hash']
        },
        order: [['created_at', 'DESC']],
        limit: limitInt,
        offset
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(count / limitInt);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalRecords: count,
            hasNextPage,
            hasPrevPage,
            limit: limitInt
          }
        }
      });

    } catch (error) {
      logger.error('Failed to fetch users:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'USERS_FETCH_ERROR',
          message: 'Failed to fetch users'
        }
      });
    }
  }
);

/**
 * @route   GET /admin/stats
 * @desc    Get admin dashboard statistics (Admin only)
 * @access  Private (Admin role required)
 */
router.get('/stats',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('ADMIN_STATS_VIEW', 'DASHBOARD'),
  async (req, res) => {
    try {
      // Get various statistics
      const [
        totalUsers,
        activeUsers,
        totalRoles,
        recentAuditLogs
      ] = await Promise.all([
        db.User.count(),
        db.User.count({ where: { is_active: true } }),
        db.Role.count(),
        db.AuditLog.count({
          where: {
            created_at: {
              [db.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ]);

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
            totalRoles,
            recentAuditLogs
          }
        }
      });

    } catch (error) {
      logger.error('Failed to fetch admin stats:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(500).json({
        error: {
          code: 'ADMIN_STATS_ERROR',
          message: 'Failed to fetch admin statistics'
        }
      });
    }
  }
);

module.exports = router;
