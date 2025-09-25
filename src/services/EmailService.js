const nodemailer = require('nodemailer');
const { logger } = require('../middleware/errorHandler');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isEnabled = process.env.EMAIL_ENABLED === 'true';
    this.fromName = process.env.EMAIL_FROM_NAME || 'GlobeMart';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@globemart.com';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter
   */
  initializeTransporter() {
    if (!this.isEnabled) {
      logger.warn('Email service is disabled. Set EMAIL_ENABLED=true to enable.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email transporter verification failed:', error);
        } else {
          logger.info('Email transporter is ready to send messages');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User's full name
   * @returns {Promise<boolean>} Success status
   */
  async sendPasswordResetEmail(email, resetToken, userName = 'User') {
    if (!this.isEnabled || !this.transporter) {
      logger.warn('Email service is not available. Password reset token:', resetToken);
      return false;
    }

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/admin/reset-password/${resetToken}`;

      // Log the reset URL for debugging
      logger.info('Password reset email details:', {
        email,
        resetUrl,
        frontendUrl: this.frontendUrl,
        token: resetToken
      });

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to: email,
        subject: 'Reset Your GlobeMart Password',
        html: this.getPasswordResetEmailTemplate(userName, resetUrl),
        text: this.getPasswordResetEmailText(userName, resetUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Password reset email sent successfully', {
        email,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      });

      return true;
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Send welcome email after registration
   * @param {string} email - Recipient email
   * @param {string} userName - User's full name
   * @returns {Promise<boolean>} Success status
   */
  async sendWelcomeEmail(email, userName) {
    if (!this.isEnabled || !this.transporter) {
      logger.warn('Email service is not available for welcome email');
      return false;
    }

    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to: email,
        subject: 'Welcome to GlobeMart!',
        html: this.getWelcomeEmailTemplate(userName),
        text: this.getWelcomeEmailText(userName)
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Welcome email sent successfully', {
        email,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Send email verification email
   * @param {string} email - Recipient email
   * @param {string} verificationToken - Email verification token
   * @param {string} userName - User's full name
   * @returns {Promise<boolean>} Success status
   */
  async sendEmailVerificationEmail(email, verificationToken, userName = 'User') {
    if (!this.isEnabled || !this.transporter) {
      logger.warn('Email service is not available for email verification');
      return false;
    }

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to: email,
        subject: 'Verify Your GlobeMart Email Address',
        html: this.getEmailVerificationTemplate(userName, verificationUrl),
        text: this.getEmailVerificationText(userName, verificationUrl)
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email verification sent successfully', {
        email,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email verification:', error);
      return false;
    }
  }

  /**
   * Get HTML template for password reset email
   * @param {string} userName - User's name
   * @param {string} resetUrl - Password reset URL
   * @returns {string} HTML email template
   */
  getPasswordResetEmailTemplate(userName, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - GlobeMart</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
          .warning { background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GlobeMart</h1>
          <h2>Password Reset Request</h2>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password for your GlobeMart account. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #e2e8f0; padding: 10px; border-radius: 4px;">${resetUrl}</p>
          
          <div class="warning">
            <strong>Important:</strong>
            <ul>
              <li>This link will expire in 1 hour for security reasons</li>
              <li>If you didn't request this password reset, please ignore this email</li>
              <li>Your password will remain unchanged until you create a new one</li>
            </ul>
          </div>
          
          <p>If you're having trouble clicking the button, copy and paste the URL above into your web browser.</p>
        </div>
        <div class="footer">
          <p>This email was sent from GlobeMart. If you have any questions, please contact our support team.</p>
          <p>&copy; ${new Date().getFullYear()} GlobeMart. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get text version of password reset email
   * @param {string} userName - User's name
   * @param {string} resetUrl - Password reset URL
   * @returns {string} Text email content
   */
  getPasswordResetEmailText(userName, resetUrl) {
    return `
GlobeMart - Password Reset Request

Hello ${userName},

We received a request to reset your password for your GlobeMart account. If you made this request, please visit the following link to reset your password:

${resetUrl}

Important:
- This link will expire in 1 hour for security reasons
- If you didn't request this password reset, please ignore this email
- Your password will remain unchanged until you create a new one

If you're having trouble with the link above, copy and paste it into your web browser.

This email was sent from GlobeMart. If you have any questions, please contact our support team.

© ${new Date().getFullYear()} GlobeMart. All rights reserved.
    `.trim();
  }

  /**
   * Get HTML template for welcome email
   * @param {string} userName - User's name
   * @returns {string} HTML email template
   */
  getWelcomeEmailTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to GlobeMart!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to GlobeMart!</h1>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Welcome to GlobeMart! We're excited to have you as part of our community.</p>
          <p>Your account has been successfully created and you can now:</p>
          <ul>
            <li>Browse our extensive product catalog</li>
            <li>Make secure purchases</li>
            <li>Track your orders</li>
            <li>Manage your account settings</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Start Shopping</a>
          </div>
          
          <p>If you have any questions or need assistance, our support team is here to help!</p>
        </div>
        <div class="footer">
          <p>Thank you for choosing GlobeMart!</p>
          <p>&copy; ${new Date().getFullYear()} GlobeMart. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get text version of welcome email
   * @param {string} userName - User's name
   * @returns {string} Text email content
   */
  getWelcomeEmailText(userName) {
    return `
Welcome to GlobeMart!

Hello ${userName},

Welcome to GlobeMart! We're excited to have you as part of our community.

Your account has been successfully created and you can now:
- Browse our extensive product catalog
- Make secure purchases
- Track your orders
- Manage your account settings

Visit our website to start shopping: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

If you have any questions or need assistance, our support team is here to help!

Thank you for choosing GlobeMart!

© ${new Date().getFullYear()} GlobeMart. All rights reserved.
    `.trim();
  }

  /**
   * Get HTML template for email verification
   * @param {string} userName - User's name
   * @param {string} verificationUrl - Email verification URL
   * @returns {string} HTML email template
   */
  getEmailVerificationTemplate(userName, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - GlobeMart</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GlobeMart</h1>
          <h2>Verify Your Email Address</h2>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>Thank you for registering with GlobeMart! To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify My Email</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #e2e8f0; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
          
          <p>Once verified, you'll have full access to all GlobeMart features!</p>
        </div>
        <div class="footer">
          <p>This email was sent from GlobeMart. If you have any questions, please contact our support team.</p>
          <p>&copy; ${new Date().getFullYear()} GlobeMart. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get text version of email verification
   * @param {string} userName - User's name
   * @param {string} verificationUrl - Email verification URL
   * @returns {string} Text email content
   */
  getEmailVerificationText(userName, verificationUrl) {
    return `
GlobeMart - Verify Your Email Address

Hello ${userName},

Thank you for registering with GlobeMart! To complete your registration and activate your account, please verify your email address by visiting the following link:

${verificationUrl}

Once verified, you'll have full access to all GlobeMart features!

This email was sent from GlobeMart. If you have any questions, please contact our support team.

© ${new Date().getFullYear()} GlobeMart. All rights reserved.
    `.trim();
  }

  /**
   * Test email configuration
   * @returns {Promise<boolean>} Success status
   */
  async testConnection() {
    if (!this.isEnabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email connection test failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
