const argon2 = require('argon2');
const crypto = require('crypto');
const { logger } = require('../middleware/errorHandler');
const db = require('../database/models');

class PasswordService {
  constructor() {
    this.argon2Options = {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1
    };
  }

  /**
   * Hash a password using Argon2id
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      return await argon2.hash(password, this.argon2Options);
    } catch (error) {
      logger.error('Failed to hash password:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify a password against its hash
   * @param {string} hashedPassword - Hashed password from database
   * @param {string} password - Plain text password to verify
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(hashedPassword, password) {
    try {
      return await argon2.verify(hashedPassword, password);
    } catch (error) {
      logger.error('Failed to verify password:', error);
      return false;
    }
  }

  /**
   * Generate a secure password reset token
   * @returns {string} 256-bit random token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a password reset token for storage
   * @param {string} token - Reset token to hash
   * @returns {string} SHA-256 hash of the token
   */
  hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create a password reset record
   * @param {number} userId - User ID
   * @param {string} token - Reset token (will be hashed)
   * @param {number} expiryHours - Expiry time in hours (default: 1)
   * @returns {Promise<Object>} Password reset record
   */
  async createPasswordReset(userId, token, expiryHours = 1) {
    try {
      const hashedToken = this.hashResetToken(token);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);

      const resetRecord = await db.PasswordReset.create({
        user_id: userId,
        token_hash: hashedToken,
        expires_at: expiresAt,
        used: false
      });

      logger.info(`Password reset token created for user ${userId}`, {
        userId,
        expiresAt
      });

      return resetRecord;
    } catch (error) {
      logger.error('Failed to create password reset record:', error);
      throw new Error('Failed to create password reset');
    }
  }

  /**
   * Find a valid password reset record
   * @param {string} token - Reset token
   * @returns {Promise<Object|null>} Password reset record or null
   */
  async findValidResetRecord(token) {
    try {
      const hashedToken = this.hashResetToken(token);

      const resetRecord = await db.PasswordReset.findOne({
        where: {
          token_hash: hashedToken,
          used: false,
          expires_at: {
            [db.Sequelize.Op.gt]: new Date()
          }
        },
        include: [{
          model: db.User,
          as: 'user'
        }]
      });

      return resetRecord;
    } catch (error) {
      logger.error('Failed to find password reset record:', error);
      return null;
    }
  }

  /**
   * Mark a password reset token as used
   * @param {number} resetId - Password reset record ID
   * @returns {Promise<void>}
   */
  async markResetTokenAsUsed(resetId) {
    try {
      await db.PasswordReset.update(
        {
          used: true,
          used_at: new Date()
        },
        { where: { id: resetId } }
      );

      logger.info(`Password reset token marked as used: ${resetId}`);
    } catch (error) {
      logger.error('Failed to mark reset token as used:', error);
      throw new Error('Failed to mark reset token as used');
    }
  }

  /**
   * Update user password
   * @param {number} userId - User ID
   * @param {string} newPassword - New plain text password
   * @returns {Promise<void>}
   */
  async updateUserPassword(userId, newPassword) {
    try {
      const hashedPassword = await this.hashPassword(newPassword);

      await db.User.update(
        { password_hash: hashedPassword },
        { where: { id: userId } }
      );

      logger.info(`Password updated for user ${userId}`);
    } catch (error) {
      logger.error('Failed to update user password:', error);
      throw new Error('Failed to update password');
    }
  }

  /**
   * Complete password reset process
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Result object
   */
  async resetPassword(token, newPassword) {
    try {
      // Find valid reset record
      const resetRecord = await this.findValidResetRecord(token);
      if (!resetRecord) {
        throw new Error('Invalid or expired reset token');
      }

      // Update user password
      await this.updateUserPassword(resetRecord.user_id, newPassword);

      // Mark token as used
      await this.markResetTokenAsUsed(resetRecord.id);

      logger.info(`Password reset completed for user ${resetRecord.user_id}`);

      return {
        success: true,
        userId: resetRecord.user_id
      };
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePasswordStrength(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clean up expired password reset tokens
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupExpiredTokens() {
    try {
      const result = await db.PasswordReset.destroy({
        where: {
          expires_at: {
            [db.Sequelize.Op.lt]: new Date()
          }
        }
      });

      if (result > 0) {
        logger.info(`Cleaned up ${result} expired password reset tokens`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to cleanup expired password reset tokens:', error);
      return 0;
    }
  }

  /**
   * Clean up used password reset tokens older than specified days
   * @param {number} daysOld - Number of days old (default: 7)
   * @returns {Promise<number>} Number of tokens cleaned up
   */
  async cleanupUsedTokens(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db.PasswordReset.destroy({
        where: {
          used: true,
          used_at: {
            [db.Sequelize.Op.lt]: cutoffDate
          }
        }
      });

      if (result > 0) {
        logger.info(`Cleaned up ${result} used password reset tokens older than ${daysOld} days`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to cleanup used password reset tokens:', error);
      return 0;
    }
  }

  /**
   * Get password reset statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getResetStats() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [expiredTokens, usedTokens, recentResets] = await Promise.all([
        db.PasswordReset.count({
          where: {
            expires_at: { [db.Sequelize.Op.lt]: now },
            used: false
          }
        }),
        db.PasswordReset.count({
          where: {
            used: true,
            used_at: { [db.Sequelize.Op.gt]: oneWeekAgo }
          }
        }),
        db.PasswordReset.count({
          where: {
            created_at: { [db.Sequelize.Op.gt]: oneDayAgo }
          }
        })
      ]);

      return {
        expiredTokens,
        usedTokens,
        recentResets
      };
    } catch (error) {
      logger.error('Failed to get password reset stats:', error);
      return null;
    }
  }
}

module.exports = new PasswordService();
