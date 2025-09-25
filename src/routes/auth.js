const express = require('express');
const router = express.Router();

// Import controllers and middleware
const AuthController = require('../controllers/AuthController');
const { validate } = require('../validation/authSchemas');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  enable2FASchema,
  disable2FASchema
} = require('../validation/authSchemas');
const { authenticateToken, authenticateAccessToken } = require('../middleware/auth');
// Note: Rate limiting, requestIdMiddleware and auditMiddleware are already applied globally in server.js

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { email, password, full_name, phone_country_code?, phone?, role? }
 */
router.post('/register',
  validate(registerSchema),
  async (req, res) => {
    await AuthController.register(req, res);
  }
);

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 * @body    { email, password, two_fa_code? }
 */
router.post('/login',
  validate(loginSchema),
  async (req, res) => {
    await AuthController.login(req, res);
  }
);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token
 * @access  Public (but requires valid refresh token)
 * @body    { refresh_token? } (can also come from httpOnly cookie)
 */
router.post('/refresh',
  validate(refreshSchema),
  async (req, res) => {
    await AuthController.refresh(req, res);
  }
);

/**
 * @route   POST /auth/logout
 * @desc    Logout user (revoke refresh token)
 * @access  Public (but requires valid refresh token)
 * @body    { refresh_token? } (can also come from httpOnly cookie)
 */
router.post('/logout',
  async (req, res) => {
    await AuthController.logout(req, res);
  }
);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  authenticateAccessToken,
  async (req, res) => {
    await AuthController.getCurrentUser(req, res);
  }
);

/**
 * @route   POST /auth/forgot-password
 * @desc    Initiate password reset
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password',
  validate(forgotPasswordSchema),
  async (req, res) => {
    await AuthController.forgotPassword(req, res);
  }
);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 * @body    { token, password }
 */
router.post('/reset-password',
  validate(resetPasswordSchema),
  async (req, res) => {
    await AuthController.resetPassword(req, res);
  }
);

/**
 * @route   POST /auth/verify-email
 * @desc    Verify email address (stub for future implementation)
 * @access  Public
 * @body    { token }
 */
router.post('/verify-email',
  async (req, res) => {
    await AuthController.verifyEmail(req, res);
  }
);

/**
 * @route   POST /auth/2fa/setup
 * @desc    Setup 2FA for admin user
 * @access  Private (Admin only)
 * @body    {}
 */
router.post('/2fa/setup',
  authenticateAccessToken,
  async (req, res) => {
    await AuthController.setup2FA(req, res);
  }
);

/**
 * @route   POST /auth/2fa/enable
 * @desc    Enable 2FA for admin user
 * @access  Private (Admin only)
 * @body    { code }
 */
router.post('/2fa/enable',
  authenticateAccessToken,
  validate(enable2FASchema),
  async (req, res) => {
    await AuthController.enable2FA(req, res);
  }
);

/**
 * @route   POST /auth/2fa/disable
 * @desc    Disable 2FA for admin user
 * @access  Private (Admin only)
 * @body    { password, code }
 */
router.post('/2fa/disable',
  authenticateAccessToken,
  validate(disable2FASchema),
  async (req, res) => {
    await AuthController.disable2FA(req, res);
  }
);

/**
 * @route   GET /auth/2fa/status
 * @desc    Get 2FA status for admin user
 * @access  Private (Admin only)
 */
router.get('/2fa/status',
  authenticateAccessToken,
  async (req, res) => {
    await AuthController.get2FAStatus(req, res);
  }
);

/**
 * @route   POST /auth/test-email
 * @desc    Test email functionality (development only)
 * @access  Public (should be restricted in production)
 * @body    { email, type? } (type: reset, welcome, verify)
 */
router.post('/test-email',
  async (req, res) => {
    await AuthController.testEmail(req, res);
  }
);

module.exports = router;
