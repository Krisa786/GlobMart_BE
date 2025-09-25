const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConfiguration() {
  console.log('🔍 Testing Email Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`EMAIL_ENABLED: ${process.env.EMAIL_ENABLED}`);
  console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST}`);
  console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT}`);
  console.log(`EMAIL_SECURE: ${process.env.EMAIL_SECURE}`);
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER}`);
  console.log(`EMAIL_PASS: ${process.env.EMAIL_PASS ? '***SET***' : 'NOT SET'}`);
  console.log(`EMAIL_FROM_NAME: ${process.env.EMAIL_FROM_NAME}`);
  console.log(`EMAIL_FROM_ADDRESS: ${process.env.EMAIL_FROM_ADDRESS}`);
  console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}\n`);

  if (process.env.EMAIL_ENABLED !== 'true') {
    console.log('❌ Email is disabled. Set EMAIL_ENABLED=true in your .env file');
    return;
  }

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('❌ Missing required email configuration. Please check your .env file');
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
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

  try {
    console.log('🔌 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Test email sending
    const testEmail = process.env.EMAIL_USER; // Send to yourself for testing
    const testToken = 'test-token-' + Date.now();
    const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password/${testToken}`;

    console.log('📧 Sending test email...');
    console.log(`To: ${testEmail}`);
    console.log(`Reset URL: ${resetUrl}\n`);

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: testEmail,
      subject: 'Test - Reset Your GlobeMart Password',
      html: `
        <h2>Test Email - GlobeMart Password Reset</h2>
        <p>This is a test email to verify email functionality.</p>
        <p><strong>Reset URL:</strong> <a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you can see this email, the email service is working correctly!</p>
      `,
      text: `
Test Email - GlobeMart Password Reset

This is a test email to verify email functionality.

Reset URL: ${resetUrl}

If you can see this email, the email service is working correctly!
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log(`Message ID: ${result.messageId}`);
    console.log(`Accepted: ${result.accepted}`);
    console.log(`Rejected: ${result.rejected}\n`);

    console.log('📬 Check your email inbox (and spam folder) for the test email.');
    console.log('🔗 The reset URL in the email should be:', resetUrl);

  } catch (error) {
    console.log('❌ Email test failed:');
    console.log(error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Gmail users: Make sure you\'re using an App Password, not your regular password.');
      console.log('   Go to: Google Account → Security → 2-Step Verification → App passwords');
    }
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Check your EMAIL_HOST setting. Common values:');
      console.log('   Gmail: smtp.gmail.com');
      console.log('   Outlook: smtp-mail.outlook.com');
    }
  }
}

// Run the test
testEmailConfiguration().catch(console.error);
