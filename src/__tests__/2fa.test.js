const TwoFAService = require('../services/TwoFAService');
const { authenticator } = require('otplib');

// Mock the database and logger
jest.mock('../database/models', () => ({
  TwoFASecret: {
    findOne: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  },
  TwoFABackupCode: {
    findOne: jest.fn(),
    bulkCreate: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn()
  },
  AuditLog: {
    create: jest.fn()
  }
}));

jest.mock('../middleware/errorHandler', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../services/PasswordService', () => ({
  verifyPassword: jest.fn()
}));

describe('TwoFAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set a test encryption key
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
  });

  describe('generateSecret', () => {
    it('should generate a valid TOTP secret and otpauth URL', async () => {
      const userId = 1;
      const userEmail = 'admin@example.com';

      const result = await TwoFAService.generateSecret(userId, userEmail);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('otpauth_url');
      expect(result.secret).toBeTruthy();
      expect(result.otpauth_url).toContain('otpauth://totp/');
      expect(result.otpauth_url).toContain(encodeURIComponent(userEmail));
      expect(result.otpauth_url).toContain('GlobeMart');
    });
  });

  describe('verifyCode', () => {
    it('should verify a valid TOTP code', () => {
      const secret = authenticator.generateSecret();
      const token = authenticator.generate(secret);

      const result = TwoFAService.verifyCode(secret, token);

      expect(result).toBe(true);
    });

    it('should reject an invalid TOTP code', () => {
      const secret = authenticator.generateSecret();
      const invalidToken = '123456';

      const result = TwoFAService.verifyCode(secret, invalidToken);

      expect(result).toBe(false);
    });
  });

  describe('encryptSecret and decryptSecret', () => {
    it('should encrypt and decrypt a secret correctly', () => {
      const originalSecret = 'test-secret-key';

      const encrypted = TwoFAService.encryptSecret(originalSecret);
      const decrypted = TwoFAService.decryptSecret(encrypted);

      expect(encrypted).toBeInstanceOf(Buffer);
      expect(decrypted).toBe(originalSecret);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 8 backup codes', async () => {
      const userId = 1;
      const db = require('../database/models');

      db.TwoFABackupCode.destroy.mockResolvedValue();
      db.TwoFABackupCode.bulkCreate.mockResolvedValue();

      const result = await TwoFAService.generateBackupCodes(userId);

      expect(result).toHaveLength(8);
      expect(result.every(code => typeof code === 'string')).toBe(true);
      expect(result.every(code => code.length === 8)).toBe(true);
      expect(db.TwoFABackupCode.destroy).toHaveBeenCalledWith({
        where: { user_id: userId }
      });
      expect(db.TwoFABackupCode.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: userId,
            code_hash: expect.any(String),
            used_at: null
          })
        ])
      );
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify a valid backup code', async () => {
      const userId = 1;
      const code = 'ABCD1234';
      const hashedCode = require('crypto').createHash('sha256').update(code).digest('hex');
      const db = require('../database/models');

      db.TwoFABackupCode.findOne.mockResolvedValue({
        id: 1,
        update: jest.fn().mockResolvedValue()
      });

      const result = await TwoFAService.verifyBackupCode(userId, code);

      expect(result).toBe(true);
      expect(db.TwoFABackupCode.findOne).toHaveBeenCalledWith({
        where: {
          user_id: userId,
          code_hash: hashedCode,
          used_at: null
        }
      });
    });

    it('should reject an invalid backup code', async () => {
      const userId = 1;
      const code = 'INVALID';
      const db = require('../database/models');

      db.TwoFABackupCode.findOne.mockResolvedValue(null);

      const result = await TwoFAService.verifyBackupCode(userId, code);

      expect(result).toBe(false);
    });
  });

  describe('is2FAEnabled', () => {
    it('should return true when 2FA is enabled', async () => {
      const userId = 1;
      const db = require('../database/models');

      db.TwoFASecret.findOne.mockResolvedValue({
        user_id: userId,
        is_enabled: true
      });

      const result = await TwoFAService.is2FAEnabled(userId);

      expect(result).toBe(true);
    });

    it('should return false when 2FA is not enabled', async () => {
      const userId = 1;
      const db = require('../database/models');

      db.TwoFASecret.findOne.mockResolvedValue(null);

      const result = await TwoFAService.is2FAEnabled(userId);

      expect(result).toBe(false);
    });
  });
});
