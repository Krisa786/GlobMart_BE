# RBAC Middleware Implementation - Task 4

## Overview

This document describes the implementation of Role-Based Access Control (RBAC) middleware for the GlobeMart backend API, as specified in Task 4 of Sprint 1.

## Implementation Summary

### 1. Enhanced Authentication Middleware

#### `authenticateAccessToken`
- **Location**: `src/middleware/auth.js`
- **Purpose**: Verifies JWT access tokens with RS256, loads user & roles, attaches `req.auth`
- **Features**:
  - Supports both `Authorization: Bearer` header and cookies
  - Verifies tokens with RS256 algorithm
  - Loads user with roles from database
  - Attaches `req.auth = { userId, uuid, roles }` as specified
  - Returns 401 for missing/expired tokens
  - Returns 403 for inactive users (forces re-auth)
  - Uses consistent error format with error codes

### 2. Role-Based Authorization Middleware

#### `requireRoles(...roles)`
- **Location**: `src/middleware/auth.js`
- **Purpose**: Checks intersection with `req.auth.roles`, returns 403 if not allowed
- **Features**:
  - Accepts multiple roles as arguments
  - Checks intersection with user roles
  - Returns 403 with audit logging for denied access
  - Audits denied access attempts to `audit_logs` table
  - Uses consistent error format

#### `requirePermissions(...permissions)` (Scaffold)
- **Location**: `src/middleware/auth.js`
- **Purpose**: Scaffold for future permission-based checks
- **Features**:
  - Stub implementation for Sprint 1
  - Logs permission check requests
  - Ready for future role_permissions table integration

### 3. Request Correlation Middleware

#### `requestIdMiddleware`
- **Location**: `src/middleware/requestId.js`
- **Purpose**: Adds UUID v4 request ID for log correlation
- **Features**:
  - Generates or uses existing `X-Request-ID` header
  - Attaches `req.requestId` to request object
  - Adds `X-Request-ID` to response headers
  - Enables end-to-end request tracing

### 4. Enhanced Error Handling

#### Updated `errorHandler`
- **Location**: `src/middleware/errorHandler.js`
- **Purpose**: Standardized error format with request correlation
- **Features**:
  - Consistent error format: `{ error: { code, message } }`
  - Includes request ID for correlation
  - Handles various error types (validation, JWT, rate limiting)
  - Adds stack traces in development mode

### 5. Sample Admin Routes

#### Admin Routes (`/admin/*`)
- **Location**: `src/routes/admin.js`
- **Purpose**: Demonstrates RBAC middleware usage
- **Endpoints**:
  - `GET /admin/audit-logs` - View audit logs (Admin only)
  - `GET /admin/users` - View all users (Admin only)
  - `GET /admin/stats` - Dashboard statistics (Admin only)

## Usage Examples

### Basic Authentication
```javascript
// Protect a route with authentication
router.get('/protected', authenticateAccessToken, (req, res) => {
  // req.auth contains { userId, uuid, roles }
  res.json({ user: req.auth });
});
```

### Role-Based Protection
```javascript
// Admin-only route
router.get('/admin/users', 
  authenticateAccessToken, 
  requireRoles('ADMIN'), 
  (req, res) => {
    // Only users with ADMIN role can access
  }
);

// Multiple roles allowed
router.get('/manager/approvals',
  authenticateAccessToken,
  requireRoles('SALES_MANAGER', 'ADMIN'),
  (req, res) => {
    // Users with either SALES_MANAGER or ADMIN role can access
  }
);
```

### Permission-Based Protection (Future)
```javascript
// Future permission-based route
router.post('/products',
  authenticateAccessToken,
  requirePermissions('products:create'),
  (req, res) => {
    // Will check role_permissions table in future sprints
  }
);
```

## Error Response Format

All errors follow the standardized format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "requestId": "uuid-v4-request-id"
  }
}
```

### Common Error Codes

- `MISSING_TOKEN` - No access token provided
- `TOKEN_EXPIRED` - Access token has expired
- `INVALID_TOKEN` - Access token is invalid
- `USER_INACTIVE` - User account is inactive
- `AUTHENTICATION_REQUIRED` - Authentication middleware not applied
- `INSUFFICIENT_ROLES` - User lacks required roles
- `ROLE_ACCESS_DENIED` - Access denied due to role restrictions

## Database Integration

### Audit Logging
All access denials are automatically logged to the `audit_logs` table with:
- `actor_user_id` - User who attempted access
- `action` - Type of access denied (e.g., 'ROLE_ACCESS_DENIED')
- `resource_type` - 'ENDPOINT'
- `resource_id` - Requested URL
- `request_id` - Request correlation ID
- `ip_address` - Client IP address
- `user_agent` - Client user agent
- `meta_json` - Additional context (required roles, user roles, etc.)

### Role Structure
- Users have many roles through `user_roles` table
- Roles have many permissions through `role_permissions` table (future)
- Current roles: `ADMIN`, `CUSTOMER`, `SALES_MANAGER` (as seeded)

## Security Features

### Edge Cases Handled
1. **Missing/Expired Token** → 401 with appropriate error code
2. **User Deactivated After Token Issuance** → 403 with force re-auth
3. **Role Removed Mid-Session** → 403 with audit logging
4. **Invalid Token Format** → 401 with clear error message

### Audit Trail
- All access denials are logged with full context
- Request correlation enables tracing across services
- IP address and user agent tracking for security analysis

## Testing Scenarios

The implementation handles these test scenarios:

1. **Valid Token Access** - User with correct role can access protected routes
2. **Invalid Token** - Returns 401 with appropriate error
3. **Expired Token** - Returns 401 with TOKEN_EXPIRED code
4. **Role Mismatch** - Returns 403 with audit logging
5. **Deactivated User** - Returns 403 forcing re-authentication
6. **Missing Authentication** - Returns 401 when middleware not applied

## Future Enhancements

### Permission System (Future Sprints)
- Implement `requirePermissions` with role_permissions table lookup
- Add permission-based route protection
- Support resource-specific permissions

### Advanced Features
- Role hierarchy support
- Dynamic permission assignment
- Permission caching for performance
- Fine-grained resource access control

## Integration Notes

### Server Configuration
The middleware is integrated into the main server (`src/server.js`):
- Request ID middleware applied globally
- Admin routes mounted at `/admin`
- Error handler updated for consistent format

### Backward Compatibility
- Legacy `authenticateToken` and `authorize` middleware preserved
- Existing routes continue to work unchanged
- Gradual migration path to new RBAC system

## API Examples

### Successful Admin Access
```bash
GET /admin/audit-logs
Authorization: Bearer <valid-admin-token>

Response: 200 OK
{
  "success": true,
  "data": {
    "auditLogs": [...],
    "pagination": {...}
  }
}
```

### Role Access Denied
```bash
GET /admin/audit-logs
Authorization: Bearer <customer-token>

Response: 403 Forbidden
{
  "error": {
    "code": "INSUFFICIENT_ROLES",
    "message": "Insufficient role permissions",
    "requestId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

This implementation provides a robust, scalable RBAC system that meets all Task 4 requirements while maintaining backward compatibility and preparing for future permission-based enhancements.
