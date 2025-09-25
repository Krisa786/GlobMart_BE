const { logger } = require('../middleware/errorHandler');
const db = require('../database/models');
const PasswordService = require('./PasswordService');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = null;
  }

  /**
   * Start the cleanup service
   * @param {number} intervalMs - Cleanup interval in milliseconds (default: 1 hour)
   */
  start(intervalMs = 60 * 60 * 1000) {
    if (this.isRunning) {
      logger.warn('Cleanup service is already running');
      return;
    }

    this.isRunning = true;
    logger.info(`Starting cleanup service with ${intervalMs / 1000 / 60} minute intervals`);

    // Run cleanup immediately
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMs);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Cleanup service is not running');
      return;
    }

    this.isRunning = false;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    logger.info('Cleanup service stopped');
  }

  /**
   * Run the cleanup process
   */
  async runCleanup() {
    try {
      logger.info('Starting cleanup process...');

      const results = await Promise.all([
        this.cleanupExpiredRefreshTokens(),
        this.cleanupExpiredPasswordResets(),
        this.cleanupUsedPasswordResets(),
        this.cleanupOldLoginAttempts(),
        this.cleanupOldAuditLogs()
      ]);

      const totalCleaned = results.reduce((sum, count) => sum + count, 0);
      logger.info(`Cleanup completed. Total records cleaned: ${totalCleaned}`);

    } catch (error) {
      logger.error('Cleanup process failed:', error);
    }
  }

  /**
   * Clean up expired refresh tokens
   * @returns {number} Number of tokens cleaned up
   */
  async cleanupExpiredRefreshTokens() {
    try {
      const result = await db.RefreshToken.destroy({
        where: {
          expires_at: {
            [db.Sequelize.Op.lt]: new Date()
          }
        }
      });

      if (result > 0) {
        logger.info(`Cleaned up ${result} expired refresh tokens`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to cleanup expired refresh tokens:', error);
      return 0;
    }
  }

  /**
   * Clean up expired password reset tokens
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupExpiredPasswordResets() {
    try {
      return await PasswordService.cleanupExpiredTokens();
    } catch (error) {
      logger.error('Failed to cleanup expired password reset tokens:', error);
      return 0;
    }
  }

  /**
   * Clean up used password reset tokens
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupUsedPasswordResets() {
    try {
      return await PasswordService.cleanupUsedTokens(7); // 7 days old
    } catch (error) {
      logger.error('Failed to cleanup used password reset tokens:', error);
      return 0;
    }
  }

  /**
   * Clean up old login attempts (older than 30 days)
   * @returns {number} Number of records cleaned up
   */
  async cleanupOldLoginAttempts() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await db.LoginAttempt.destroy({
        where: {
          created_at: {
            [db.Sequelize.Op.lt]: thirtyDaysAgo
          }
        }
      });

      if (result > 0) {
        logger.info(`Cleaned up ${result} old login attempts`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to cleanup old login attempts:', error);
      return 0;
    }
  }

  /**
   * Clean up old audit logs (older than 90 days)
   * @returns {number} Number of records cleaned up
   */
  async cleanupOldAuditLogs() {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const result = await db.AuditLog.destroy({
        where: {
          created_at: {
            [db.Sequelize.Op.lt]: ninetyDaysAgo
          }
        }
      });

      if (result > 0) {
        logger.info(`Cleaned up ${result} old audit logs`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to cleanup old audit logs:', error);
      return 0;
    }
  }

  /**
   * Clean up revoked refresh tokens (older than 7 days)
   * @returns {number} Number of tokens cleaned up
   */
  async cleanupRevokedRefreshTokens() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await db.RefreshToken.destroy({
        where: {
          is_revoked: true,
          revoked_at: {
            [db.Sequelize.Op.lt]: sevenDaysAgo
          }
        }
      });

      if (result > 0) {
        logger.info(`Cleaned up ${result} revoked refresh tokens`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to cleanup revoked refresh tokens:', error);
      return 0;
    }
  }

  /**
   * Get cleanup statistics
   * @returns {Object} Cleanup statistics
   */
  async getCleanupStats() {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const [expiredTokens, oldLoginAttempts, oldAuditLogs] = await Promise.all([
        db.RefreshToken.count({
          where: {
            expires_at: { [db.Sequelize.Op.lt]: now }
          }
        }),
        db.LoginAttempt.count({
          where: {
            created_at: { [db.Sequelize.Op.lt]: thirtyDaysAgo }
          }
        }),
        db.AuditLog.count({
          where: {
            created_at: { [db.Sequelize.Op.lt]: ninetyDaysAgo }
          }
        })
      ]);

      return {
        expiredRefreshTokens: expiredTokens,
        oldLoginAttempts,
        oldAuditLogs,
        lastCleanup: this.lastCleanupTime || null,
        isRunning: this.isRunning
      };
    } catch (error) {
      logger.error('Failed to get cleanup stats:', error);
      return null;
    }
  }
}

module.exports = new CleanupService();
