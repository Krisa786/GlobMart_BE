# GlobeMart Backend Setup Guide

## Prerequisites

- Node.js 16+ 
- MySQL 8.0+
- npm or yarn

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate JWT Keys
```bash
npm run generate-keys
```
This will create RSA key pairs in the `keys/` directory and display the keys for your `.env` file.

### 3. Environment Configuration
Copy the sample environment file and update with your values:
```bash
cp env.sample .env
```

Update the following in your `.env` file:
- Database credentials
- JWT keys (from step 2)
- Server configuration

### 4. Database Setup
```bash
# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Environment Variables

### Required Variables
```env
# Database
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=globe_mart
DB_HOST=localhost
DB_PORT=3306

# JWT Keys (generate with npm run generate-keys)
JWT_PRIVATE_KEY=your-private-key
JWT_PUBLIC_KEY=your-public-key

# Server
PORT=3001
NODE_ENV=development
```

### Optional Variables
```env
# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info

# Cleanup Service
ENABLE_CLEANUP=false
```

## Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Environment
Tests use an in-memory SQLite database and don't require a MySQL setup.

## Production Deployment

### 1. Environment Setup
- Set `NODE_ENV=production`
- Use strong, unique JWT keys for production
- Enable cleanup service: `ENABLE_CLEANUP=true`
- Configure proper CORS origins
- Set up proper logging levels

### 2. Database
- Use a production MySQL database
- Run migrations: `npm run db:migrate`
- Set up database backups
- Configure connection pooling

### 3. Security
- Use HTTPS in production
- Keep JWT private keys secure
- Set up proper firewall rules
- Enable rate limiting
- Monitor logs for security events

### 4. Monitoring
- Set up log aggregation
- Monitor API performance
- Track authentication events
- Set up alerts for failures

## API Documentation

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request:**
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
    "access_token": "jwt-token",
    "expires_in": 900
  }
}
```

#### POST /auth/login
Authenticate user and get tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
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
    "access_token": "jwt-token",
    "expires_in": 900
  }
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "new-jwt-token",
    "expires_in": 900
  }
}
```

#### GET /auth/me
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
      "roles": ["CUSTOMER"],
      "is_active": true,
      "email_verified": false,
      "last_login_at": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

#### POST /auth/logout
Logout user and revoke refresh token.

**Request:**
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

#### POST /auth/forgot-password
Initiate password reset process.

**Request:**
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

#### POST /auth/reset-password
Reset password using reset token.

**Request:**
```json
{
  "token": "reset-token",
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

## Security Features

### Rate Limiting
- Login attempts: 5 per 15 minutes per IP+email
- Password reset: 3 per hour per IP
- General auth: 5 per 15 minutes per IP

### Token Security
- JWT access tokens: 15-minute expiry
- Refresh tokens: 30-day expiry with rotation
- Token reuse detection and session revocation
- HttpOnly cookies for web clients

### Password Security
- Argon2id hashing with 64MB memory cost
- Strong password requirements
- Automatic salt generation

## Troubleshooting

### Common Issues

#### Database Connection Failed
- Check database credentials in `.env`
- Ensure MySQL is running
- Verify database exists

#### JWT Token Errors
- Generate new keys: `npm run generate-keys`
- Update `.env` with new keys
- Restart the server

#### Migration Errors
- Check database permissions
- Ensure database is empty or use `--force` flag
- Check migration files for syntax errors

#### Test Failures
- Ensure test environment is set up
- Check test database configuration
- Run tests individually to isolate issues

### Logs
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console output in development mode

### Support
For issues or questions:
1. Check the logs for error details
2. Verify environment configuration
3. Run tests to check functionality
4. Review API documentation

## Development

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Database Management
```bash
# Run migrations
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Undo all migrations
npm run db:migrate:undo:all

# Run seeders
npm run db:seed
```

### Adding New Features
1. Create database migrations for schema changes
2. Update models if needed
3. Implement services and controllers
4. Add routes and middleware
5. Write tests for new functionality
6. Update documentation

## Performance

### Optimization Tips
- Use database indexes for frequently queried fields
- Implement caching for expensive operations
- Use connection pooling for database connections
- Monitor and optimize slow queries
- Implement pagination for large datasets

### Monitoring
- Track API response times
- Monitor database query performance
- Set up alerts for high error rates
- Monitor memory and CPU usage
- Track authentication success/failure rates
