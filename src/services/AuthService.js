const { v4: uuidv4 } = require('uuid');
const { logger } = require('../middleware/errorHandler');
const db = require('../database/models');
const TokenService = require('./TokenService');
const PasswordService = require('./PasswordService');
const TwoFAService = require('./TwoFAService');
const AuditService = require('./AuditService');
const EmailService = require('./EmailService');

class AuthService {
  constructor() {
    this.tokenService = TokenService;
    this.passwordService = PasswordService;
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {Object} context - Request context (IP, User-Agent)
   * @returns {Object} User data with tokens
   */
  async register(userData, context = {}) {
    try {
      const { email, password, full_name, phone_country_code, phone, role = 'CUSTOMER' } = userData;

      // Check if user already exists
      const existingUser = await db.User.findOne({ where: { email } });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate that the specified role exists
      const requestedRole = await db.Role.findOne({ where: { name: role } });
      if (!requestedRole) {
        throw new Error(`Invalid role: ${role}. Available roles are: CUSTOMER, ADMIN, SALES_MANAGER, WAREHOUSE, FINANCE, SUPPORT`);
      }

      // Hash password with Argon2id
      const hashedPassword = await this.passwordService.hashPassword(password);

      // Generate user UUID
      const userUuid = uuidv4();

      // Create user
      const user = await db.User.create({
        uuid: userUuid,
        email,
        password_hash: hashedPassword,
        full_name,
        phone_country_code,
        phone,
        is_active: true,
        email_verified: false,
        last_login_at: null
      });

      // Assign the specified role (or default CUSTOMER role)
      await db.UserRole.create({
        user_id: user.id,
        role_id: requestedRole.id,
        assigned_at: new Date()
      });

      // Get user with roles for token generation
      const userWithRoles = await this.getUserWithRoles(user.id);

      // Issue tokens
      const tokens = await this.tokenService.issueTokens(userWithRoles, context);

      // Update last login
      await user.update({ last_login_at: new Date() });

      // Audit successful registration
      await AuditService.logAuthEvent('REGISTRATION_SUCCESS', {
        user_id: user.id,
        email: user.email,
        ip_address: context.ip,
        user_agent: context.userAgent,
        request_id: context.requestId,
        meta: {
          role,
          registrationMethod: 'email'
        }
      });

      // Send welcome email
      const emailSent = await EmailService.sendWelcomeEmail(email, full_name);
      if (emailSent) {
        logger.info(`Welcome email sent successfully to ${email}`, {
          userId: user.id
        });
      }

      logger.info(`User registered successfully: ${email} with role: ${role}`, {
        userId: user.id,
        uuid: user.uuid,
        role,
        ip: context.ip
      });

      return {
        user: {
          uuid: user.uuid,
          email: user.email,
          full_name: user.full_name,
          roles: userWithRoles.roles || [role]
        },
        ...tokens
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Authenticate user login
   * @param {Object} credentials - Login credentials
   * @param {Object} context - Request context
   * @returns {Object} User data with tokens or 2FA requirement
   */
  async login(credentials, context = {}) {
    try {
      const { email, password, two_fa_code } = credentials;

      // Find user with roles
      const user = await this.getUserWithRoles(null, email);
      if (!user) {
        await this.recordLoginAttempt(email, false, context);
        // Audit failed login attempt
        await AuditService.logAuthEvent('LOGIN_FAIL', {
          user_id: null,
          email,
          ip_address: context.ip,
          user_agent: context.userAgent,
          request_id: context.requestId,
          meta: {
            reason: 'user_not_found'
          }
        });
        throw new Error('Invalid email or password');
      }

      // Debug: Log user data
      logger.info('User found for login:', {
        id: user.id,
        email: user.email,
        hasPasswordHash: !!user.password_hash,
        passwordHashLength: user.password_hash ? user.password_hash.length : 0
      });

      // Check if user is active
      if (!user.is_active) {
        await this.recordLoginAttempt(email, false, context);
        // Audit failed login attempt
        await AuditService.logAuthEvent('LOGIN_FAIL', {
          user_id: user.id,
          email,
          ip_address: context.ip,
          user_agent: context.userAgent,
          request_id: context.requestId,
          meta: {
            reason: 'account_deactivated'
          }
        });
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await this.passwordService.verifyPassword(user.password_hash, password);
      if (!isPasswordValid) {
        await this.recordLoginAttempt(email, false, context);
        // Audit failed login attempt
        await AuditService.logAuthEvent('LOGIN_FAIL', {
          user_id: user.id,
          email,
          ip_address: context.ip,
          user_agent: context.userAgent,
          request_id: context.requestId,
          meta: {
            reason: 'invalid_password'
          }
        });
        throw new Error('Invalid email or password');
      }

      // Check if user has admin role and 2FA enabled
      const hasAdminRole = user.roles && user.roles.includes('ADMIN');
      const has2FA = await TwoFAService.is2FAEnabled(user.id);

      if (hasAdminRole && has2FA) {
        if (!two_fa_code) {
          return { require_2fa: true };
        }

        // Verify 2FA code using TwoFAService
        const is2FAValid = await TwoFAService.verify2FAForLogin(user.id, two_fa_code);
        if (!is2FAValid) {
          await this.recordLoginAttempt(email, false, context);
          // Audit 2FA failure
          await AuditService.log2FAEvent('2FA_FAIL', {
            user_id: user.id,
            ip_address: context.ip,
            user_agent: context.userAgent,
            request_id: context.requestId,
            meta: {
              reason: 'invalid_2fa_code'
            }
          });
          throw new Error('Invalid 2FA code or backup code');
        }
      }

      // Record successful login attempt
      await this.recordLoginAttempt(email, true, context);

      // Issue tokens
      const tokens = await this.tokenService.issueTokens(user, context);

      // Update last login
      await db.User.update(
        { last_login_at: new Date() },
        { where: { id: user.id } }
      );

      // Audit successful login
      const loginEventType = hasAdminRole ? 'ADMIN_LOGIN_SUCCESS' : 'LOGIN_SUCCESS';
      await AuditService.logAuthEvent(loginEventType, {
        user_id: user.id,
        email,
        ip_address: context.ip,
        user_agent: context.userAgent,
        request_id: context.requestId,
        meta: {
          roles: user.roles || [],
          has2FA,
          twoFAPassed: hasAdminRole && has2FA
        }
      });

      logger.info(`User logged in successfully: ${email}`, {
        userId: user.id,
        uuid: user.uuid,
        ip: context.ip
      });

      return {
        user: {
          uuid: user.uuid,
          email: user.email,
          full_name: user.full_name,
          roles: user.roles || []
        },
        ...tokens
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout user by revoking refresh token
   * @param {string} refreshToken - The refresh token to revoke
   * @param {Object} context - Request context
   */
  async logout(refreshToken, context = {}) {
    try {
      // Revoke the refresh token
      await this.tokenService.revokeRefreshToken(refreshToken);

      // Note: We don't need to verify the refresh token since it's not a JWT
      // and we're just revoking it. The token validation happens during refresh operations.

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   * @param {number} userId - User ID
   * @returns {Object} User profile with roles
   */
  async getCurrentUser(userId) {
    try {
      const user = await this.getUserWithRoles(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        uuid: user.uuid,
        email: user.email,
        full_name: user.full_name,
        phone_country_code: user.phone_country_code,
        phone: user.phone,
        roles: user.roles || [],
        is_active: user.is_active,
        email_verified: user.is_email_verified,
        last_login_at: user.last_login_at,
        created_at: user.created_at
      };
    } catch (error) {
      logger.error('Failed to get current user:', error);
      throw error;
    }
  }

  /**
   * Initiate password reset process
   * @param {string} email - User email
   * @param {Object} context - Request context
   * @returns {Object} Success message
   */
  async forgotPassword(email, context = {}) {
    try {
      const user = await db.User.findOne({ where: { email } });
      if (!user) {
        // Don't reveal if email exists or not
        return { message: 'If the email exists, a password reset link has been sent' };
      }

      // Generate reset token
      const resetToken = this.passwordService.generateResetToken();

      // Create password reset record
      await this.passwordService.createPasswordReset(user.id, resetToken, 1); // 1 hour expiry

      // Construct reset link
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/admin/reset-password/${resetToken}`;
      console.log('resetLink', resetLink);
      // Audit password reset request
      await AuditService.logAuthEvent('PASSWORD_RESET_REQUEST', {
        user_id: user.id,
        email,
        ip_address: context.ip,
        user_agent: context.userAgent,
        request_id: context.requestId,
        meta: {
          tokenGenerated: true,
          expiryHours: 1
        }
      });

      // Send password reset email
      const emailSent = await EmailService.sendPasswordResetEmail(
        email,
        resetToken,
        user.full_name
      );

      if (emailSent) {
        logger.info(`Password reset email sent successfully to ${email}`, {
          userId: user.id
        });
      } else {
        // Fallback: log the token if email service is not available
        logger.warn(`Email service unavailable. Password reset token for ${email}:`, {
          userId: user.id,
          token: resetToken // Remove this in production
        });
      }

      return {
        message: 'If the email exists, a password reset link has been sent',
        resetLink
      };
    } catch (error) {
      logger.error('Failed to initiate password reset:', error);
      throw new Error('Failed to initiate password reset');
    }
  }

  /**
   * Reset password using reset token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @param {Object} context - Request context
   * @returns {Object} Success message
   */
  async resetPassword(token, newPassword, context = {}) {
    try {
      // Use PasswordService to handle the reset
      const result = await this.passwordService.resetPassword(token, newPassword);

      // Revoke all existing refresh tokens for security
      await this.tokenService.revokeAllUserTokens(result.userId);

      // Audit successful password reset
      await AuditService.logAuthEvent('PASSWORD_RESET_SUCCESS', {
        user_id: result.userId,
        ip_address: context.ip,
        user_agent: context.userAgent,
        request_id: context.requestId,
        meta: {
          tokensRevoked: true,
          resetMethod: 'token'
        }
      });

      logger.info(`Password reset successfully for user ${result.userId}`);

      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Failed to reset password:', error);
      throw error;
    }
  }

  /**
   * Get user with roles
   * @param {number} userId - User ID (optional if email provided)
   * @param {string} email - User email (optional if userId provided)
   * @returns {Object} User with roles
   */
  async getUserWithRoles(userId = null, email = null) {
    try {
      const whereClause = userId ? { id: userId } : { email };

      const user = await db.User.findOne({
        where: whereClause,
        include: [{
          model: db.Role,
          as: 'roles',
          through: { attributes: [] }
        }]
      });

      if (!user) {return null;}

      const roles = user.roles ? user.roles.map(role => role.name) : [];

      return {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        password_hash: user.password_hash, // Include password hash for login verification
        full_name: user.full_name,
        phone_country_code: user.phone_country_code,
        phone: user.phone,
        is_active: user.is_active,
        email_verified: user.is_email_verified,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        roles
      };
    } catch (error) {
      logger.error('Failed to get user with roles:', error);
      throw error;
    }
  }

  /**
   * Record login attempt
   * @param {string} email - User email
   * @param {boolean} success - Whether login was successful
   * @param {Object} context - Request context
   */
  async recordLoginAttempt(email, success, context = {}) {
    try {
      await db.LoginAttempt.create({
        email_tried: email,
        success,
        status: success ? 'SUCCESS' : 'FAIL',
        ip_address: context.ip || null,
        user_agent: context.userAgent || null,
        attempted_at: new Date()
      });
    } catch (error) {
      logger.error('Failed to record login attempt:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Check if user has 2FA enabled
   * @param {number} userId - User ID
   * @returns {boolean} Whether 2FA is enabled
   */
  async has2FAEnabled(userId) {
    try {
      return await TwoFAService.is2FAEnabled(userId);
    } catch (error) {
      logger.error('Failed to check 2FA status:', error);
      return false;
    }
  }
}

module.exports = new AuthService();
