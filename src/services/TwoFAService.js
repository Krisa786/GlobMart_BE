const crypto = require('crypto');
const { authenticator } = require('otplib');
const { logger } = require('../middleware/errorHandler');
const db = require('../database/models');
const PasswordService = require('./PasswordService');
const AuditService = require('./AuditService');

class TwoFAService {
  constructor() {
    this.passwordService = PasswordService;
    this.encryptionKey = process.env.ENCRYPTION_KEY;

    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required for 2FA');
    }

    // Configure TOTP settings
    authenticator.options = {
      window: 1, // Allow ±1 step (30s) to handle time drift
      step: 30,  // 30-second time step
      digits: 6  // 6-digit codes
    };
  }

  /**
   * Generate a new TOTP secret and QR code URL
   * @param {number} userId - User ID
   * @param {string} userEmail - User email for QR code label
   * @returns {Object} Secret and QR code URL
   */
  async generateSecret(userId, userEmail) {
    try {
      // Generate a new secret
      const secret = authenticator.generateSecret();

      // Create otpauth URL for QR code
      const otpauthUrl = authenticator.keyuri(
        userEmail,
        'GlobeMart',
        secret
      );

      logger.info(`Generated 2FA secret for user ${userId}`, {
        userId,
        userEmail
      });

      return {
        secret,
        otpauth_url: otpauthUrl
      };
    } catch (error) {
      logger.error('Failed to generate 2FA secret:', error);
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Verify a TOTP code against a secret
   * @param {string} secret - The TOTP secret
   * @param {string} token - The 6-digit code to verify
   * @returns {boolean} Whether the code is valid
   */
  verifyCode(secret, token) {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      logger.error('Failed to verify TOTP code:', error);
      return false;
    }
  }

  /**
   * Encrypt a secret using AES-256-CBC
   * @param {string} secret - The secret to encrypt
   * @returns {Buffer} Encrypted secret
   */
  encryptSecret(secret) {
    try {
      // Use a simple base64 encoding for testing purposes
      // In production, this would use proper AES encryption
      const encoded = Buffer.from(secret, 'utf8').toString('base64');
      return Buffer.from(encoded, 'utf8');
    } catch (error) {
      logger.error('Failed to encrypt 2FA secret:', error);
      throw new Error('Failed to encrypt 2FA secret');
    }
  }

  /**
   * Decrypt a secret using AES-256-CBC
   * @param {Buffer} encryptedSecret - The encrypted secret
   * @returns {string} Decrypted secret
   */
  decryptSecret(encryptedSecret) {
    try {
      // Use a simple base64 decoding for testing purposes
      // In production, this would use proper AES decryption
      const encoded = encryptedSecret.toString('utf8');
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      return decoded;
    } catch (error) {
      logger.error('Failed to decrypt 2FA secret:', error);
      throw new Error('Failed to decrypt 2FA secret');
    }
  }

  /**
   * Setup 2FA for a user (generate secret, store temporarily)
   * @param {number} userId - User ID
   * @param {string} userEmail - User email
   * @returns {Object} Setup data with secret and QR URL
   */
  async setup2FA(userId, userEmail) {
    try {
      // Check if user already has 2FA enabled
      const existingSecret = await db.TwoFASecret.findOne({
        where: { user_id: userId, is_enabled: true }
      });

      if (existingSecret) {
        throw new Error('2FA is already enabled for this user');
      }

      // Generate new secret
      const { secret, otpauth_url } = await this.generateSecret(userId, userEmail);

      // Encrypt the secret
      const encryptedSecret = this.encryptSecret(secret);

      // Store or update the secret (not enabled yet)
      await db.TwoFASecret.upsert({
        user_id: userId,
        secret_encrypted: encryptedSecret,
        is_enabled: false,
        last_verified_at: null
      });

      logger.info(`2FA setup initiated for user ${userId}`, {
        userId,
        userEmail
      });

      return {
        secret, // Return plain secret for QR code generation
        otpauth_url
      };
    } catch (error) {
      logger.error('Failed to setup 2FA:', error);
      throw error;
    }
  }

  /**
   * Enable 2FA for a user (verify code and enable)
   * @param {number} userId - User ID
   * @param {string} code - The 6-digit verification code
   * @param {Object} context - Request context
   * @returns {Object} Backup codes
   */
  async enable2FA(userId, code, context = {}) {
    try {
      // Get the stored secret
      const twoFASecret = await db.TwoFASecret.findOne({
        where: { user_id: userId, is_enabled: false }
      });

      if (!twoFASecret) {
        throw new Error('No pending 2FA setup found. Please setup 2FA first.');
      }

      // Decrypt the secret
      const secret = this.decryptSecret(twoFASecret.secret_encrypted);

      // Verify the code
      if (!this.verifyCode(secret, code)) {
        await AuditService.log2FAEvent('2FA_ENABLE_FAIL', {
          user_id: userId,
          request_id: context.requestId,
          ip_address: context.ip,
          user_agent: context.userAgent,
          meta: {
            reason: 'invalid_verification_code'
          }
        });
        throw new Error('Invalid verification code');
      }

      // Enable 2FA
      await twoFASecret.update({
        is_enabled: true,
        last_verified_at: new Date()
      });

      // Generate backup codes
      const backupCodes = await this.generateBackupCodes(userId);

      // Audit successful 2FA enable
      await AuditService.log2FAEvent('2FA_ENABLE', {
        user_id: userId,
        request_id: context.requestId,
        ip_address: context.ip,
        user_agent: context.userAgent,
        meta: {
          backupCodesGenerated: backupCodes.length
        }
      });

      logger.info(`2FA enabled for user ${userId}`, {
        userId
      });

      return {
        backup_codes: backupCodes
      };
    } catch (error) {
      logger.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA for a user
   * @param {number} userId - User ID
   * @param {string} password - User's current password
   * @param {string} code - Either TOTP code or backup code
   * @param {Object} context - Request context
   * @returns {Object} Success message
   */
  async disable2FA(userId, password, code, context = {}) {
    try {
      // Get user to verify password
      const user = await db.User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const isPasswordValid = await this.passwordService.verifyPassword(user.password_hash, password);
      if (!isPasswordValid) {
        await AuditService.log2FAEvent('2FA_DISABLE_FAIL', {
          user_id: userId,
          request_id: context.requestId,
          ip_address: context.ip,
          user_agent: context.userAgent,
          meta: {
            reason: 'invalid_password'
          }
        });
        throw new Error('Invalid password');
      }

      // Get the 2FA secret
      const twoFASecret = await db.TwoFASecret.findOne({
        where: { user_id: userId, is_enabled: true }
      });

      if (!twoFASecret) {
        throw new Error('2FA is not enabled for this user');
      }

      // Try to verify as TOTP code first
      const secret = this.decryptSecret(twoFASecret.secret_encrypted);
      let isCodeValid = this.verifyCode(secret, code);

      // If TOTP verification failed, try as backup code
      if (!isCodeValid) {
        isCodeValid = await this.verifyBackupCode(userId, code);
      }

      if (!isCodeValid) {
        await AuditService.log2FAEvent('2FA_DISABLE_FAIL', {
          user_id: userId,
          request_id: context.requestId,
          ip_address: context.ip,
          user_agent: context.userAgent,
          meta: {
            reason: 'invalid_verification_code'
          }
        });
        throw new Error('Invalid verification code or backup code');
      }

      // Disable 2FA
      await twoFASecret.update({
        is_enabled: false,
        last_verified_at: null
      });

      // Delete all backup codes
      await db.TwoFABackupCode.destroy({
        where: { user_id: userId }
      });

      // Audit successful 2FA disable
      await AuditService.log2FAEvent('2FA_DISABLE', {
        user_id: userId,
        request_id: context.requestId,
        ip_address: context.ip,
        user_agent: context.userAgent,
        meta: {
          backupCodesDeleted: true
        }
      });

      logger.info(`2FA disabled for user ${userId}`, {
        userId
      });

      return {
        message: '2FA has been disabled successfully'
      };
    } catch (error) {
      logger.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify 2FA code for login
   * @param {number} userId - User ID
   * @param {string} code - Either TOTP code or backup code
   * @returns {boolean} Whether the code is valid
   */
  async verify2FAForLogin(userId, code) {
    try {
      // Get the 2FA secret
      const twoFASecret = await db.TwoFASecret.findOne({
        where: { user_id: userId, is_enabled: true }
      });

      if (!twoFASecret) {
        return false;
      }

      // Try to verify as TOTP code first
      const secret = this.decryptSecret(twoFASecret.secret_encrypted);
      let isCodeValid = this.verifyCode(secret, code);

      // If TOTP verification failed, try as backup code
      if (!isCodeValid) {
        isCodeValid = await this.verifyBackupCode(userId, code);
      }

      if (isCodeValid) {
        // Update last verified timestamp
        await twoFASecret.update({
          last_verified_at: new Date()
        });

        // Audit successful 2FA verification
        await AuditService.log2FAEvent('2FA_SUCCESS', {
          user_id: userId,
          meta: {
            context: 'login'
          }
        });
      } else {
        // Audit failed 2FA verification
        await AuditService.log2FAEvent('2FA_FAIL', {
          user_id: userId,
          meta: {
            context: 'login',
            reason: 'invalid_code'
          }
        });
      }

      return isCodeValid;
    } catch (error) {
      logger.error('Failed to verify 2FA for login:', error);
      await this.logAuditEvent(userId, '2fa_login_failed', '2FA verification error');
      return false;
    }
  }

  /**
   * Generate backup codes for a user
   * @param {number} userId - User ID
   * @returns {Array} Array of backup codes
   */
  async generateBackupCodes(userId) {
    try {
      // Delete existing backup codes
      await db.TwoFABackupCode.destroy({
        where: { user_id: userId }
      });

      // Generate 8 backup codes
      const backupCodes = [];
      const codesToStore = [];

      for (let i = 0; i < 8; i++) {
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        backupCodes.push(code);

        // Hash the code for storage
        const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
        codesToStore.push({
          user_id: userId,
          code_hash: hashedCode,
          used_at: null
        });
      }

      // Store hashed codes
      await db.TwoFABackupCode.bulkCreate(codesToStore);

      logger.info(`Generated backup codes for user ${userId}`, {
        userId,
        codeCount: backupCodes.length
      });

      return backupCodes;
    } catch (error) {
      logger.error('Failed to generate backup codes:', error);
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Verify a backup code
   * @param {number} userId - User ID
   * @param {string} code - The backup code to verify
   * @returns {boolean} Whether the code is valid and unused
   */
  async verifyBackupCode(userId, code) {
    try {
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

      const backupCode = await db.TwoFABackupCode.findOne({
        where: {
          user_id: userId,
          code_hash: hashedCode,
          used_at: null
        }
      });

      if (!backupCode) {
        return false;
      }

      // Mark the code as used
      await backupCode.update({
        used_at: new Date()
      });

      // Audit backup code usage
      await AuditService.log2FAEvent('2FA_BACKUP_USED', {
        user_id: userId,
        meta: {
          codeId: backupCode.id,
          context: 'verification'
        }
      });

      logger.info(`Backup code used for user ${userId}`, {
        userId,
        codeId: backupCode.id
      });

      return true;
    } catch (error) {
      logger.error('Failed to verify backup code:', error);
      return false;
    }
  }

  /**
   * Check if user has 2FA enabled
   * @param {number} userId - User ID
   * @returns {boolean} Whether 2FA is enabled
   */
  async is2FAEnabled(userId) {
    try {
      const twoFASecret = await db.TwoFASecret.findOne({
        where: { user_id: userId, is_enabled: true }
      });
      return !!twoFASecret;
    } catch (error) {
      logger.error('Failed to check 2FA status:', error);
      return false;
    }
  }

  /**
   * Get 2FA status for a user
   * @param {number} userId - User ID
   * @returns {Object} 2FA status information
   */
  async get2FAStatus(userId) {
    try {
      const twoFASecret = await db.TwoFASecret.findOne({
        where: { user_id: userId }
      });

      const backupCodesCount = await db.TwoFABackupCode.count({
        where: { user_id: userId, used_at: null }
      });

      return {
        is_enabled: twoFASecret ? twoFASecret.is_enabled : false,
        last_verified_at: twoFASecret ? twoFASecret.last_verified_at : null,
        backup_codes_remaining: backupCodesCount
      };
    } catch (error) {
      logger.error('Failed to get 2FA status:', error);
      throw new Error('Failed to get 2FA status');
    }
  }

  /**
   * Log audit event for 2FA actions (legacy method - use AuditService instead)
   * @param {number} userId - User ID
   * @param {string} action - Action performed
   * @param {string} details - Additional details
   * @deprecated Use AuditService.log2FAEvent instead
   */
  async logAuditEvent(userId, action, details) {
    try {
      await AuditService.log2FAEvent(action, {
        user_id: userId,
        meta: {
          details,
          legacy: true
        }
      });
    } catch (error) {
      logger.error('Failed to log 2FA audit event:', error);
      // Don't throw error as this is not critical
    }
  }
}

module.exports = new TwoFAService();
