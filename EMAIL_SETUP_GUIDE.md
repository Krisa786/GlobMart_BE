# Email Setup Guide for GlobeMart Backend

This guide explains how to set up and configure email functionality for the GlobeMart backend, including password reset emails, welcome emails, and email verification.

## Overview

The email functionality has been implemented with the following features:
- ✅ Password reset emails with secure tokens
- ✅ Welcome emails for new user registrations
- ✅ Email verification emails (ready for future implementation)
- ✅ Professional HTML and text email templates
- ✅ Configurable SMTP settings
- ✅ Fallback logging when email service is unavailable
- ✅ Test endpoint for development

## Dependencies

The following dependency has been added to `package.json`:
```json
"nodemailer": "^6.9.8"
```

Install it by running:
```bash
npm install
```

## Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_NAME=GlobeMart
EMAIL_FROM_ADDRESS=noreply@globemart.com

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

### Email Provider Setup

#### Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASS`

3. **Configure your .env**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

#### Other SMTP Providers

**SendGrid**:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

**Mailgun**:
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-mailgun-smtp-username
EMAIL_PASS=your-mailgun-smtp-password
```

**Outlook/Hotmail**:
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-outlook@outlook.com
EMAIL_PASS=your-password
```

## Email Templates

The system includes three types of email templates:

### 1. Password Reset Email
- **Trigger**: When user requests password reset via `/auth/forgot-password`
- **Features**: 
  - Secure reset token with 1-hour expiry
  - Professional HTML design with GlobeMart branding
  - Clear call-to-action button
  - Security warnings and instructions
  - Fallback text version

### 2. Welcome Email
- **Trigger**: When new user registers via `/auth/register`
- **Features**:
  - Welcome message with user's name
  - Overview of platform features
  - Call-to-action to start shopping
  - Professional branding

### 3. Email Verification Email
- **Trigger**: Ready for future email verification feature
- **Features**:
  - Verification link with token
  - Professional design
  - Clear instructions

## API Endpoints

### Password Reset Flow

1. **Request Password Reset**:
   ```bash
   POST /auth/forgot-password
   Content-Type: application/json
   
   {
     "email": "user@example.com"
   }
   ```

2. **Reset Password**:
   ```bash
   POST /auth/reset-password
   Content-Type: application/json
   
   {
     "token": "reset-token-from-email",
     "password": "NewSecurePassword123!"
   }
   ```

### Test Email Endpoint (Development)

Test the email functionality:

```bash
# Test password reset email
POST /auth/test-email
Content-Type: application/json

{
  "email": "test@example.com",
  "type": "reset"
}

# Test welcome email
POST /auth/test-email
Content-Type: application/json

{
  "email": "test@example.com",
  "type": "welcome"
}

# Test verification email
POST /auth/test-email
Content-Type: application/json

{
  "email": "test@example.com",
  "type": "verify"
}
```

## Security Features

### Password Reset Security
- **Token Expiry**: Reset tokens expire after 1 hour
- **Single Use**: Tokens are marked as used after successful reset
- **Secure Generation**: Tokens are cryptographically secure
- **Rate Limiting**: Password reset requests are rate-limited
- **Audit Logging**: All password reset attempts are logged

### Email Security
- **No Token Exposure**: Tokens are never logged in production
- **Secure SMTP**: Uses TLS encryption for email transmission
- **Input Validation**: All email inputs are validated
- **Error Handling**: Graceful fallback when email service fails

## Troubleshooting

### Common Issues

#### 1. Email Not Sending
**Symptoms**: No emails received, logs show "Email service unavailable"

**Solutions**:
- Check `EMAIL_ENABLED=true` in your `.env`
- Verify SMTP credentials are correct
- Test SMTP connection using the test endpoint
- Check firewall/network restrictions
- Verify email provider settings (Gmail app passwords, etc.)

#### 2. Gmail Authentication Failed
**Symptoms**: "Invalid login" or "Authentication failed" errors

**Solutions**:
- Ensure 2FA is enabled on Gmail account
- Use App Password instead of regular password
- Check that "Less secure app access" is disabled (use App Passwords instead)

#### 3. Emails Going to Spam
**Solutions**:
- Configure SPF, DKIM, and DMARC records for your domain
- Use a dedicated email service (SendGrid, Mailgun) for production
- Avoid spam trigger words in email content
- Set up proper email authentication

#### 4. Frontend URL Issues
**Symptoms**: Reset links don't work or redirect incorrectly

**Solutions**:
- Verify `FRONTEND_URL` in `.env` matches your frontend URL
- Ensure frontend has proper reset password page
- Check that the frontend can handle the token parameter

### Testing Email Configuration

1. **Test SMTP Connection**:
   ```bash
   # The EmailService automatically tests connection on startup
   # Check logs for "Email transporter is ready to send messages"
   ```

2. **Test Email Sending**:
   ```bash
   curl -X POST http://localhost:3001/auth/test-email \
     -H "Content-Type: application/json" \
     -d '{"email": "your-email@example.com", "type": "reset"}'
   ```

3. **Check Logs**:
   ```bash
   # Look for email-related log messages
   tail -f logs/combined.log | grep -i email
   ```

## Production Considerations

### Email Service Provider
For production, consider using a dedicated email service:

1. **SendGrid** (Recommended)
   - High deliverability rates
   - Detailed analytics
   - Easy setup and configuration

2. **Mailgun**
   - Developer-friendly API
   - Good deliverability
   - Webhook support

3. **Amazon SES**
   - Cost-effective for high volume
   - Integrates well with AWS
   - Good deliverability

### Security Hardening
1. **Remove Test Endpoint**: Remove `/auth/test-email` in production
2. **Environment Variables**: Use secure environment variable management
3. **Rate Limiting**: Ensure rate limiting is properly configured
4. **Monitoring**: Set up email delivery monitoring and alerts

### Email Templates Customization
To customize email templates:

1. **Modify Templates**: Edit the template methods in `EmailService.js`
2. **Add Branding**: Update colors, logos, and styling
3. **Localization**: Add support for multiple languages
4. **A/B Testing**: Implement template versioning

## Monitoring and Analytics

### Log Monitoring
Monitor these log patterns:
- `Password reset email sent successfully`
- `Email service unavailable`
- `Email transporter verification failed`

### Email Delivery Metrics
Consider implementing:
- Email open tracking
- Click tracking
- Bounce handling
- Unsubscribe management

## Support

If you encounter issues with email functionality:

1. Check the logs in `logs/combined.log`
2. Verify your SMTP configuration
3. Test with the `/auth/test-email` endpoint
4. Review this guide for common solutions

For additional help, check the nodemailer documentation: https://nodemailer.com/
