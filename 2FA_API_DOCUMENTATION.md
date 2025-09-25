# 2FA (TOTP) API Documentation

## Overview

This document describes the Two-Factor Authentication (2FA) implementation using Time-based One-Time Passwords (TOTP) for admin users in the GlobeMart backend system.

## Features Implemented

- **TOTP-based 2FA** using RFC-6238 standard
- **AES-256 encryption** for storing TOTP secrets
- **Backup codes** (8 codes) for account recovery
- **Audit logging** for all 2FA events
- **Admin-only access** to 2FA functionality
- **Time drift tolerance** (±1 step, 30 seconds)

## API Endpoints

### 1. Setup 2FA

**Endpoint:** `POST /auth/2fa/setup`  
**Access:** Private (Admin only)  
**Description:** Initiates 2FA setup by generating a TOTP secret and QR code URL.

**Request:**
```json
{
  // No body required - user info from JWT token
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA setup initiated successfully",
  "data": {
    "secret": "GV2GI5LQG52EUJQG",
    "otpauth_url": "otpauth://totp/GlobeMart:admin%40example.com?secret=GV2GI5LQG52EUJQG&period=30&digits=6&algorithm=SHA1&issuer=GlobeMart"
  }
}
```

**Error Responses:**
- `403 Forbidden`: User is not an admin
- `400 Bad Request`: 2FA already enabled

### 2. Enable 2FA

**Endpoint:** `POST /auth/2fa/enable`  
**Access:** Private (Admin only)  
**Description:** Enables 2FA after verifying the TOTP code from the authenticator app.

**Request:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA enabled successfully",
  "data": {
    "backup_codes": [
      "ABCD1234",
      "EFGH5678",
      "IJKL9012",
      "MNOP3456",
      "QRST7890",
      "UVWX1234",
      "YZAB5678",
      "CDEF9012"
    ]
  }
}
```

**Error Responses:**
- `403 Forbidden`: User is not an admin
- `400 Bad Request`: Invalid verification code or no pending setup

### 3. Disable 2FA

**Endpoint:** `POST /auth/2fa/disable`  
**Access:** Private (Admin only)  
**Description:** Disables 2FA after verifying password and either TOTP code or backup code.

**Request:**
```json
{
  "password": "userPassword123!",
  "code": "123456"  // or backup code like "ABCD1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA has been disabled successfully"
}
```

**Error Responses:**
- `403 Forbidden`: User is not an admin
- `400 Bad Request`: Invalid password or verification code

### 4. Get 2FA Status

**Endpoint:** `GET /auth/2fa/status`  
**Access:** Private (Admin only)  
**Description:** Returns the current 2FA status and remaining backup codes.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": {
      "is_enabled": true,
      "last_verified_at": "2024-12-17T10:30:00.000Z",
      "backup_codes_remaining": 8
    }
  }
}
```

### 5. Login with 2FA

**Endpoint:** `POST /auth/login`  
**Access:** Public  
**Description:** Enhanced login endpoint that requires 2FA for admin users with enabled 2FA.

**Request (First attempt - without 2FA code):**
```json
{
  "email": "admin@example.com",
  "password": "password123!"
}
```

**Response (2FA required):**
```json
{
  "success": true,
  "message": "2FA code required",
  "data": {
    "require_2fa": true
  }
}
```

**Request (Second attempt - with 2FA code):**
```json
{
  "email": "admin@example.com",
  "password": "password123!",
  "two_fa_code": "123456"  // or backup code
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "uuid": "user-uuid",
      "email": "admin@example.com",
      "full_name": "Admin User",
      "roles": ["ADMIN"]
    },
    "access_token": "jwt-token",
    "expires_in": 3600
  }
}
```

## Security Features

### Encryption
- TOTP secrets are encrypted using **AES-256-CBC** before storage
- Encryption key derived from `ENCRYPTION_KEY` environment variable
- Secrets are never stored in plain text

### Backup Codes
- **8 backup codes** generated when 2FA is enabled
- Codes are **SHA-256 hashed** before storage
- **One-time use** - codes are marked as used after verification
- **8-character alphanumeric** format (uppercase letters and numbers)

### Time Tolerance
- **±1 time step** tolerance (30 seconds) to handle device time drift
- Uses standard TOTP algorithm with 30-second time windows

### Audit Logging
All 2FA events are logged in the `audit_logs` table:
- `2fa_enabled` - 2FA successfully enabled
- `2fa_disabled` - 2FA successfully disabled
- `2fa_enable_failed` - Failed 2FA enable attempt
- `2fa_disable_failed` - Failed 2FA disable attempt
- `2fa_login_failed` - Failed 2FA verification during login
- `2fa_backup_code_used` - Backup code used for verification

## Database Schema

### two_fa_secrets
```sql
CREATE TABLE two_fa_secrets (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  secret_encrypted BLOB NOT NULL,
  is_enabled TINYINT(1) DEFAULT 0,
  last_verified_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### two_fa_backup_codes
```sql
CREATE TABLE two_fa_backup_codes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  code_hash CHAR(64) UNIQUE NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  UNIQUE INDEX idx_code_hash (code_hash)
);
```

## Usage Flow

### 1. Admin Setup Flow
1. Admin calls `POST /auth/2fa/setup`
2. System generates TOTP secret and QR code URL
3. Admin scans QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Admin calls `POST /auth/2fa/enable` with code from app
5. System enables 2FA and returns backup codes
6. Admin securely stores backup codes

### 2. Login Flow
1. Admin calls `POST /auth/login` with email/password
2. If 2FA enabled, system returns `require_2fa: true`
3. Admin calls `POST /auth/login` again with 2FA code
4. System verifies code and returns access token

### 3. Disable Flow
1. Admin calls `POST /auth/2fa/disable` with password and code
2. System verifies credentials and disables 2FA
3. All backup codes are deleted

## Error Handling

### Common Error Scenarios
- **Invalid TOTP code**: Code doesn't match current time window
- **Expired backup code**: Backup code already used
- **Wrong password**: Invalid password during disable
- **No 2FA setup**: Trying to enable without setup
- **Already enabled**: Trying to setup when already enabled

### Rate Limiting
- Login attempts are rate-limited to prevent brute force
- 2FA verification attempts are logged for security monitoring

## Environment Variables

```bash
# Required for 2FA encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

## Testing

The implementation includes comprehensive unit tests covering:
- TOTP secret generation and verification
- Encryption/decryption functionality
- Backup code generation and verification
- 2FA status checking
- Error scenarios

Run tests with:
```bash
npm test -- src/__tests__/2fa.test.js
```

## Security Considerations

1. **Secret Storage**: TOTP secrets are encrypted at rest
2. **Backup Codes**: Hashed and one-time use only
3. **Audit Trail**: All 2FA events are logged
4. **Time Tolerance**: Handles device time drift
5. **Admin Only**: 2FA is restricted to admin users
6. **Rate Limiting**: Prevents brute force attacks

## Integration Notes

- Compatible with standard TOTP apps (Google Authenticator, Authy, 1Password, etc.)
- Follows RFC-6238 standard for TOTP
- Integrates seamlessly with existing JWT authentication
- Maintains backward compatibility with non-admin users
