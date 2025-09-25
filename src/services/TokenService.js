const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../middleware/errorHandler');
const db = require('../database/models');

class TokenService {
  constructor() {
    this.accessTokenTTL = process.env.JWT_ACCESS_TTL || '15m';
    this.refreshTokenTTL = process.env.JWT_REFRESH_TTL || '30d';
    this.clockSkewTolerance = parseInt(process.env.JWT_CLOCK_SKEW_TOLERANCE) || 120; // 2 minutes in seconds
    this.privateKey = process.env.JWT_PRIVATE_KEY ? process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
    this.publicKey = process.env.JWT_PUBLIC_KEY ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n') : null;
    this.keyRotationEnabled = process.env.JWT_KEY_ROTATION_ENABLED === 'true';
    this.currentKeyId = process.env.JWT_CURRENT_KEY_ID || 'default';

    if (!this.privateKey || !this.publicKey) {
      throw new Error('JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be set in environment variables');
    }
  }

  /**
   * Generate a secure random refresh token
   * @returns {string} 256-bit random token
   */
  generateRefreshToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a refresh token for storage
   * @param {string} token - The refresh token to hash
   * @returns {string} SHA-256 hash of the token
   */
  hashRefreshToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Sign an access token with RS256
   * @param {Object} payload - The JWT payload
   * @param {string} kid - Key ID for key rotation (optional)
   * @returns {string} Signed JWT access token
   */
  signAccessToken(payload, kid = null) {
    const keyId = kid || this.currentKeyId;
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload = {
      ...payload,
      iat: now,
      nbf: now - this.clockSkewTolerance, // Not before (clock skew tolerance)
      kid: keyId
    };

    return jwt.sign(tokenPayload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: this.accessTokenTTL
    });
  }

  /**
   * Verify an access token
   * @param {string} token - The JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      const options = {
        algorithms: ['RS256'],
        clockTolerance: this.clockSkewTolerance
      };

      const decoded = jwt.verify(token, this.publicKey, options);

      // Additional validation for clock skew
      const now = Math.floor(Date.now() / 1000);
      if (decoded.nbf && decoded.nbf > now + this.clockSkewTolerance) {
        throw new Error('Token not yet valid');
      }

      return decoded;
    } catch (error) {
      logger.error('Access token verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Issue both access and refresh tokens for a user
   * @param {Object} user - User object with id, uuid, email, roles
   * @param {Object} context - Request context (IP, User-Agent)
   * @returns {Object} Object containing access_token, refresh_token, and expires_in
   */
  async issueTokens(user, context = {}) {
    try {
      // Create access token payload
      const accessTokenPayload = {
        sub: user.id.toString(),
        uuid: user.uuid,
        email: user.email,
        roles: user.roles || [],
        type: 'access'
      };

      // Sign access token
      const accessToken = this.signAccessToken(accessTokenPayload);

      // Generate refresh token
      const refreshToken = this.generateRefreshToken();
      const hashedRefreshToken = this.hashRefreshToken(refreshToken);

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days default

      // Store refresh token in database
      await db.RefreshToken.create({
        token_hash: hashedRefreshToken,
        user_id: user.id,
        expires_at: expiresAt,
        ip_address: context.ip || null,
        user_agent: context.userAgent || null,
        is_revoked: false,
        rotated_at: null
      });

      // Calculate access token expiry in seconds
      const expiresIn = this.parseTTL(this.accessTokenTTL);

      logger.info(`Tokens issued for user ${user.uuid}`, {
        userId: user.id,
        ip: context.ip,
        userAgent: context.userAgent
      });

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn
      };
    } catch (error) {
      logger.error('Failed to issue tokens:', error);
      throw new Error('Failed to issue authentication tokens');
    }
  }

  /**
   * Rotate refresh token (invalidate old, create new)
   * @param {string} oldRefreshToken - The current refresh token
   * @param {Object} context - Request context
   * @returns {Object} New tokens
   */
  async rotateRefreshToken(oldRefreshToken, context = {}) {
    try {
      const hashedOldToken = this.hashRefreshToken(oldRefreshToken);

      // Find the refresh token
      const refreshTokenRecord = await db.RefreshToken.findOne({
        where: {
          token_hash: hashedOldToken,
          is_revoked: false
        },
        include: [{
          model: db.User,
          include: [{
            model: db.Role,
            as: 'roles',
            through: { attributes: [] }
          }]
        }]
      });

      if (!refreshTokenRecord) {
        throw new Error('Invalid refresh token');
      }

      // Check if token is expired
      if (refreshTokenRecord.expires_at < new Date()) {
        throw new Error('Refresh token expired');
      }

      // Check if token was already rotated (reuse detection)
      if (refreshTokenRecord.rotated_at) {
        // This is a reused token - revoke all tokens for this user
        await this.revokeAllUserTokens(refreshTokenRecord.user_id);
        throw new Error('Token reuse detected - all sessions revoked');
      }

      // Mark old token as rotated
      refreshTokenRecord.rotated_at = new Date();
      await refreshTokenRecord.save();

      // Get user with roles for new token
      const user = refreshTokenRecord.User;
      const roles = user.roles ? user.roles.map(role => role.name) : [];

      // Issue new tokens
      const newTokens = await this.issueTokens({
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        roles
      }, context);

      logger.info(`Refresh token rotated for user ${user.uuid}`, {
        userId: user.id,
        ip: context.ip
      });

      return newTokens;
    } catch (error) {
      logger.error('Failed to rotate refresh token:', error);
      throw error;
    }
  }

  /**
   * Revoke a specific refresh token
   * @param {string} refreshToken - The refresh token to revoke
   */
  async revokeRefreshToken(refreshToken) {
    try {
      const hashedToken = this.hashRefreshToken(refreshToken);

      await db.RefreshToken.update(
        { is_revoked: true, revoked_at: new Date() },
        { where: { token_hash: hashedToken } }
      );

      logger.info('Refresh token revoked');
    } catch (error) {
      logger.error('Failed to revoke refresh token:', error);
      throw new Error('Failed to revoke refresh token');
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {number} userId - The user ID
   */
  async revokeAllUserTokens(userId) {
    try {
      await db.RefreshToken.update(
        { is_revoked: true, revoked_at: new Date() },
        { where: { user_id: userId, is_revoked: false } }
      );

      logger.info(`All tokens revoked for user ${userId}`);
    } catch (error) {
      logger.error('Failed to revoke all user tokens:', error);
      throw new Error('Failed to revoke user tokens');
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens() {
    try {
      const result = await db.RefreshToken.destroy({
        where: {
          expires_at: {
            [db.Sequelize.Op.lt]: new Date()
          }
        }
      });

      logger.info(`Cleaned up ${result} expired refresh tokens`);
      return result;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens:', error);
      throw error;
    }
  }

  /**
   * Parse TTL string to seconds
   * @param {string} ttl - TTL string (e.g., '15m', '1h', '30d')
   * @returns {number} TTL in seconds
   */
  parseTTL(ttl) {
    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) {return 900;} // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
    }
  }

  /**
   * Rotate JWT keys (for key rotation support)
   * @param {string} newPrivateKey - New private key
   * @param {string} newPublicKey - New public key
   * @param {string} newKeyId - New key ID
   */
  rotateKeys(newPrivateKey, newPublicKey, newKeyId) {
    if (!this.keyRotationEnabled) {
      logger.warn('Key rotation attempted but not enabled');
      return;
    }

    try {
      // Validate new keys
      if (!newPrivateKey || !newPublicKey || !newKeyId) {
        throw new Error('Invalid key parameters for rotation');
      }

      // Test the new keys by signing and verifying a test token
      const testPayload = { test: true, iat: Math.floor(Date.now() / 1000) };
      const testToken = jwt.sign(testPayload, newPrivateKey, { algorithm: 'RS256' });
      jwt.verify(testToken, newPublicKey, { algorithms: ['RS256'] });

      // Update keys
      this.privateKey = newPrivateKey;
      this.publicKey = newPublicKey;
      this.currentKeyId = newKeyId;

      logger.info(`JWT keys rotated successfully. New key ID: ${newKeyId}`);
    } catch (error) {
      logger.error('Key rotation failed:', error);
      throw new Error(`Key rotation failed: ${  error.message}`);
    }
  }

  /**
   * Get current key information
   * @returns {Object} Key information
   */
  getKeyInfo() {
    return {
      keyId: this.currentKeyId,
      rotationEnabled: this.keyRotationEnabled,
      clockSkewTolerance: this.clockSkewTolerance,
      accessTokenTTL: this.accessTokenTTL,
      refreshTokenTTL: this.refreshTokenTTL
    };
  }

  /**
   * Validate token with multiple key support (for key rotation)
   * @param {string} token - Token to validate
   * @param {Array} publicKeys - Array of public keys to try
   * @returns {Object} Decoded token payload
   */
  verifyTokenWithMultipleKeys(token, publicKeys = [this.publicKey]) {
    let lastError = null;

    for (const publicKey of publicKeys) {
      try {
        const options = {
          algorithms: ['RS256'],
          clockTolerance: this.clockSkewTolerance
        };

        const decoded = jwt.verify(token, publicKey, options);

        // Additional validation for clock skew
        const now = Math.floor(Date.now() / 1000);
        if (decoded.nbf && decoded.nbf > now + this.clockSkewTolerance) {
          throw new Error('Token not yet valid');
        }

        return decoded;
      } catch (error) {
        lastError = error;
        continue; // Try next key
      }
    }

    // If we get here, all keys failed
    logger.error('Token verification failed with all provided keys:', lastError);
    throw lastError || new Error('Token verification failed');
  }
}

module.exports = new TokenService();
