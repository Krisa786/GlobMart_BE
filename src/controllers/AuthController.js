const AuthService = require('../services/AuthService');
const TokenService = require('../services/TokenService');
const TwoFAService = require('../services/TwoFAService');
const EmailService = require('../services/EmailService');
const { logger } = require('../middleware/errorHandler');

class AuthController {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async register(req, res) {
    try {
      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      };

      const result = await AuthService.register(req.body, context);

      // Set refresh token as httpOnly cookie for web clients
      if (req.body.set_cookie !== false) {
        res.cookie('refresh_token', result.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
        });
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          access_token: result.access_token,
          expires_in: result.expires_in
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  /**
   * Login user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async login(req, res) {
    try {
      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      };

      const result = await AuthService.login(req.body, context);

      // If 2FA is required, return without tokens
      if (result.require_2fa) {
        return res.status(200).json({
          success: true,
          message: '2FA code required',
          data: { require_2fa: true }
        });
      }

      // Set tokens as httpOnly cookies for web clients
      if (req.body.set_cookie !== false) {
        res.cookie('refresh_token', result.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
        });

        res.cookie('access_token', result.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          maxAge: 15 * 60 * 1000, // 15 minutes (access token TTL)
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          access_token: result.access_token,
          expires_in: result.expires_in
        }
      });
    } catch (error) {
      logger.error('Login error:', error);

      // Check if it's a rate limit error
      if (error.message.includes('Too many attempts')) {
        return res.status(429).json({
          success: false,
          message: error.message
        });
      }

      res.status(401).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }

  /**
   * Refresh access token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async refresh(req, res) {
    try {
      // Debug logging for cookie inspection
      logger.info('Refresh token request debug:', {
        cookies: req.cookies,
        hasRefreshTokenCookie: !!req.cookies?.refresh_token,
        hasRefreshTokenBody: !!req.body?.refresh_token,
        requestId: req.requestId
      });

      // Get refresh token from cookie or body
      const refreshToken = req.cookies.refresh_token || req.body.refresh_token;

      if (!refreshToken) {
        logger.warn('No refresh token found in request:', {
          cookies: Object.keys(req.cookies || {}),
          bodyKeys: Object.keys(req.body || {}),
          requestId: req.requestId
        });
        return res.status(401).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      };

      const result = await TokenService.rotateRefreshToken(refreshToken, context);

      // Set new tokens as httpOnly cookies
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
      });

      res.cookie('access_token', result.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes (access token TTL)
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          access_token: result.access_token,
          expires_in: result.expires_in
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);

      // Clear invalid refresh token cookie
      res.clearCookie('refresh_token');

      if (error.message.includes('reuse detected')) {
        return res.status(401).json({
          success: false,
          message: 'Security violation detected. Please login again.'
        });
      }

      res.status(401).json({
        success: false,
        message: error.message || 'Token refresh failed'
      });
    }
  }

  /**
   * Logout user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async logout(req, res) {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies.refresh_token || req.body.refresh_token;

      if (refreshToken) {
        const context = {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          requestId: req.requestId
        };
        await AuthService.logout(refreshToken, context);
      }

      // Clear token cookies
      res.clearCookie('refresh_token');
      res.clearCookie('access_token');

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  /**
   * Get current user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCurrentUser(req, res) {
    try {
      const user = await AuthService.getCurrentUser(req.user.id);

      res.status(200).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'User not found'
      });
    }
  }

  /**
   * Initiate password reset
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async forgotPassword(req, res) {
    try {
      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      };

      const result = await AuthService.forgotPassword(req.body.email, context);

      res.status(200).json({
        success: true,
        message: result.message,
        resetLink: result.resetLink
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate password reset'
      });
    }
  }

  /**
   * Reset password
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async resetPassword(req, res) {
    try {
      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      };

      const result = await AuthService.resetPassword(req.body.token, req.body.password, context);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Password reset failed'
      });
    }
  }

  /**
   * Verify email (stub for future implementation)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async verifyEmail(req, res) {
    try {
      // This is a stub for email verification
      // In a full implementation, this would verify the email token
      res.status(200).json({
        success: true,
        message: 'Email verification is not implemented yet'
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  }

  /**
   * Setup 2FA for admin user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async setup2FA(req, res) {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;

      // Check if user has ADMIN role
      const user = await AuthService.getUserWithRoles(userId);
      if (!user.roles.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          message: '2FA setup is only available for admin users'
        });
      }

      const result = await TwoFAService.setup2FA(userId, userEmail);

      res.status(200).json({
        success: true,
        message: '2FA setup initiated successfully',
        data: {
          secret: result.secret,
          otpauth_url: result.otpauth_url
        }
      });
    } catch (error) {
      logger.error('2FA setup error:', error);
      res.status(400).json({
        success: false,
        message: error.message || '2FA setup failed'
      });
    }
  }

  /**
   * Enable 2FA for admin user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async enable2FA(req, res) {
    try {
      const userId = req.user.id;
      const { code } = req.body;

      // Check if user has ADMIN role
      const user = await AuthService.getUserWithRoles(userId);
      if (!user.roles.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          message: '2FA enable is only available for admin users'
        });
      }

      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      };

      const result = await TwoFAService.enable2FA(userId, code, context);

      res.status(200).json({
        success: true,
        message: '2FA enabled successfully',
        data: {
          backup_codes: result.backup_codes
        }
      });
    } catch (error) {
      logger.error('2FA enable error:', error);
      res.status(400).json({
        success: false,
        message: error.message || '2FA enable failed'
      });
    }
  }

  /**
   * Disable 2FA for admin user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async disable2FA(req, res) {
    try {
      const userId = req.user.id;
      const { password, code } = req.body;

      // Check if user has ADMIN role
      const user = await AuthService.getUserWithRoles(userId);
      if (!user.roles.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          message: '2FA disable is only available for admin users'
        });
      }

      const context = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestId: req.requestId
      };

      const result = await TwoFAService.disable2FA(userId, password, code, context);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('2FA disable error:', error);
      res.status(400).json({
        success: false,
        message: error.message || '2FA disable failed'
      });
    }
  }

  /**
   * Get 2FA status for admin user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async get2FAStatus(req, res) {
    try {
      const userId = req.user.id;

      // Check if user has ADMIN role
      const user = await AuthService.getUserWithRoles(userId);
      if (!user.roles.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          message: '2FA status is only available for admin users'
        });
      }

      const status = await TwoFAService.get2FAStatus(userId);

      res.status(200).json({
        success: true,
        data: { status }
      });
    } catch (error) {
      logger.error('Get 2FA status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get 2FA status'
      });
    }
  }

  /**
   * Test email functionality (for development/testing)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async testEmail(req, res) {
    try {
      const { email, type = 'reset' } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      let emailSent = false;
      let message = '';

      switch (type) {
      case 'reset':
        // Generate a test token
        const testToken = `test-token-${  Date.now()}`;
        emailSent = await EmailService.sendPasswordResetEmail(email, testToken, 'Test User');
        message = emailSent ? 'Password reset test email sent' : 'Failed to send password reset test email';
        break;

      case 'welcome':
        emailSent = await EmailService.sendWelcomeEmail(email, 'Test User');
        message = emailSent ? 'Welcome test email sent' : 'Failed to send welcome test email';
        break;

      case 'verify':
        const verifyToken = `verify-token-${  Date.now()}`;
        emailSent = await EmailService.sendEmailVerificationEmail(email, verifyToken, 'Test User');
        message = emailSent ? 'Email verification test email sent' : 'Failed to send verification test email';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid email type. Use: reset, welcome, or verify'
        });
      }

      res.status(emailSent ? 200 : 500).json({
        success: emailSent,
        message,
        emailType: type
      });
    } catch (error) {
      logger.error('Email test error:', error);
      res.status(500).json({
        success: false,
        message: 'Email test failed'
      });
    }
  }
}

module.exports = new AuthController();
