# Auth API Implementation - Task 2

## Overview

This document describes the complete Auth API implementation for GlobeMart Backend, including JWT-based authentication with refresh token rotation, password reset functionality, and comprehensive security measures.

## Features Implemented

### ✅ Core Authentication
- **User Registration** with email/password validation
- **User Login** with password verification
- **JWT Access Tokens** (RS256, 15-minute expiry)
- **Refresh Token Rotation** with reuse detection
- **Secure Logout** with token revocation
- **Password Reset** flow with secure tokens

### ✅ Security Features
- **Argon2id Password Hashing** (memory cost: 64MB, time cost: 3)
- **Rate Limiting** on auth endpoints (5 attempts per 15 minutes)
- **Login Attempt Tracking** with IP and User-Agent logging
- **Refresh Token Reuse Detection** (revokes all sessions on reuse)
- **HttpOnly Cookies** for web clients
- **Secure Cookie Settings** (Secure, SameSite=Strict)

### ✅ 2FA Support (Stub)
- **2FA Detection** for admin users
- **2FA Code Validation** (stub for Task 3)
- **Graceful 2FA Flow** with proper error handling

## API Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe",
  "phone_country_code": "+1",
  "phone": "1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "uuid": "user-uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "roles": ["CUSTOMER"]
    },
    "access_token": "jwt-access-token",
    "expires_in": 900
  }
}
```

### POST /auth/login
Authenticate user and issue tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "two_fa_code": "123456"
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
      "email": "user@example.com",
      "full_name": "John Doe",
      "roles": ["CUSTOMER"]
    },
    "access_token": "jwt-access-token",
    "expires_in": 900
  }
}
```

**Response (2FA Required):**
```json
{
  "success": true,
  "message": "2FA code required",
  "data": {
    "require_2fa": true
  }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body (Optional):**
```json
{
  "refresh_token": "refresh-token"
}
```
*Note: Refresh token can also be provided via httpOnly cookie*

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "new-jwt-access-token",
    "expires_in": 900
  }
}
```

### POST /auth/logout
Logout user and revoke refresh token.

**Request Body (Optional):**
```json
{
  "refresh_token": "refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### GET /auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "uuid": "user-uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "phone_country_code": "+1",
      "phone": "1234567890",
      "roles": ["CUSTOMER"],
      "is_active": true,
      "email_verified": false,
      "last_login_at": "2024-01-01T12:00:00.000Z",
      "created_at": "2024-01-01T10:00:00.000Z"
    }
  }
}
```

### POST /auth/forgot-password
Initiate password reset process.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

### POST /auth/reset-password
Reset password using reset token.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Security Implementation

### Password Security
- **Argon2id Hashing**: Industry-standard password hashing
- **Strong Password Policy**: Minimum 8 characters with complexity requirements
- **Salt Generation**: Automatic salt generation per password

### Token Security
- **JWT RS256**: Asymmetric signing for access tokens
- **Short-lived Access Tokens**: 15-minute expiry
- **Long-lived Refresh Tokens**: 30-day expiry with rotation
- **Token Rotation**: New refresh token on each refresh
- **Reuse Detection**: Revokes all sessions on token reuse

### Rate Limiting
- **Login Attempts**: 5 per 15 minutes per IP+email
- **Password Reset**: 3 per hour per IP
- **General Auth**: 5 per 15 minutes per IP
- **API Requests**: 100 per 15 minutes per IP

### Cookie Security
- **HttpOnly**: Prevents XSS attacks
- **Secure**: HTTPS only in production
- **SameSite=Strict**: CSRF protection
- **Automatic Cleanup**: Expired tokens removed

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone_country_code VARCHAR(5),
  phone VARCHAR(15),
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Refresh Tokens Table
```sql
CREATE TABLE refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_revoked BOOLEAN DEFAULT FALSE,
  rotated_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Login Attempts Table
```sql
CREATE TABLE login_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Password Resets Table
```sql
CREATE TABLE password_resets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Environment Variables

```env
# JWT Configuration
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
JWT_PRIVATE_KEY=your-private-key-here
JWT_PUBLIC_KEY=your-public-key-here

# Server Configuration
NODE_ENV=development
PORT=3001

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## Usage Examples

### Frontend Integration

#### Login with Cookie Support
```javascript
// Login request
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();
if (data.success) {
  // Store access token
  localStorage.setItem('access_token', data.data.access_token);
  // Refresh token is automatically stored in httpOnly cookie
}
```

#### Token Refresh
```javascript
// Refresh token (automatic with cookie)
const response = await fetch('/auth/refresh', {
  method: 'POST',
  credentials: 'include'
});

const data = await response.json();
if (data.success) {
  localStorage.setItem('access_token', data.data.access_token);
}
```

#### Protected API Calls
```javascript
// Make authenticated requests
const response = await fetch('/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
```

### Mobile App Integration

#### Login with Bearer Token
```javascript
// Login request (mobile)
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    set_cookie: false // Disable cookie for mobile
  })
});

const data = await response.json();
if (data.success) {
  // Store both tokens securely
  await SecureStore.setItemAsync('access_token', data.data.access_token);
  await SecureStore.setItemAsync('refresh_token', data.data.refresh_token);
}
```

#### Token Refresh (Mobile)
```javascript
// Refresh token (mobile)
const refreshToken = await SecureStore.getItemAsync('refresh_token');
const response = await fetch('/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    refresh_token: refreshToken
  })
});

const data = await response.json();
if (data.success) {
  await SecureStore.setItemAsync('access_token', data.data.access_token);
  await SecureStore.setItemAsync('refresh_token', data.data.refresh_token);
}
```

## Error Handling

### Common Error Responses

#### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

#### Authentication Error (401)
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

#### Rate Limit Error (429)
```json
{
  "success": false,
  "message": "Too many login attempts, please try again later",
  "retryAfter": 900
}
```

#### Token Reuse Error (401)
```json
{
  "success": false,
  "message": "Security violation detected. Please login again."
}
```

## Testing

### Manual Testing Scenarios

1. **Registration Flow**
   - Register new user
   - Verify user creation
   - Test duplicate email handling

2. **Login Flow**
   - Login with valid credentials
   - Test invalid credentials
   - Test 2FA requirement for admin users

3. **Token Refresh**
   - Use refresh token to get new access token
   - Test token rotation
   - Test reuse detection

4. **Password Reset**
   - Initiate password reset
   - Use reset token to change password
   - Test token expiry

5. **Rate Limiting**
   - Exceed login attempt limits
   - Verify rate limit headers
   - Test different IP addresses

### Automated Testing

Run the test suite:
```bash
npm test
```

## Security Considerations

### Production Deployment
1. **Use Strong JWT Keys**: Generate RSA key pairs with at least 2048 bits
2. **Enable HTTPS**: All authentication endpoints must use HTTPS
3. **Configure CORS**: Restrict CORS origins to your frontend domains
4. **Use Redis**: Replace in-memory rate limiting with Redis for production
5. **Monitor Logs**: Set up alerting for failed login attempts and security events

### Key Rotation
- Implement JWT key rotation strategy
- Use `kid` (Key ID) in JWT headers for key identification
- Maintain backward compatibility during key transitions

### Audit Logging
- All authentication events are logged with IP and User-Agent
- Failed login attempts are tracked and can be monitored
- Token issuance and revocation events are logged

## Dependencies

### Core Dependencies
- `jsonwebtoken`: JWT token handling
- `argon2`: Password hashing
- `joi`: Input validation
- `express`: Web framework
- `sequelize`: Database ORM
- `mysql2`: MySQL database driver

### Security Dependencies
- `helmet`: Security headers
- `cors`: Cross-origin resource sharing
- `cookie-parser`: Cookie handling

## Future Enhancements

### Planned Features (Task 3)
- **Complete 2FA Implementation**: TOTP-based two-factor authentication
- **Backup Codes**: Recovery codes for 2FA
- **Device Management**: Track and manage trusted devices

### Additional Security Features
- **Account Lockout**: Temporary account suspension after failed attempts
- **IP Allowlisting**: Restrict admin access to specific IP ranges
- **Session Management**: Active session monitoring and management
- **Email Verification**: Complete email verification flow

## Support

For issues or questions regarding the Auth API implementation, please refer to:
- Task 2 documentation
- Developer SOP guidelines
- Security best practices documentation
