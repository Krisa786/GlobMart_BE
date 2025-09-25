#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Rotate JWT keys for enhanced security
 * This script generates new RSA key pairs and provides instructions for rotation
 */

const KEY_SIZE = 2048;
const KEY_DIR = path.join(__dirname, '..', 'keys');

// Ensure keys directory exists
if (!fs.existsSync(KEY_DIR)) {
  fs.mkdirSync(KEY_DIR, { mode: 0o700 });
}

console.log('🔄 JWT Key Rotation Script');
console.log('==========================');
console.log('');

try {
  // Generate new key pair
  console.log('🔐 Generating new RSA key pair...');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: KEY_SIZE,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Generate unique key ID
  const keyId = `key-${Date.now()}-${uuidv4().substring(0, 8)}`;

  // Create backup of current keys (if they exist)
  const currentPrivatePath = path.join(KEY_DIR, 'jwt-private.pem');
  const currentPublicPath = path.join(KEY_DIR, 'jwt-public.pem');
  
  if (fs.existsSync(currentPrivatePath)) {
    const backupPrivatePath = path.join(KEY_DIR, `jwt-private-backup-${Date.now()}.pem`);
    fs.copyFileSync(currentPrivatePath, backupPrivatePath);
    console.log(`📦 Backed up current private key to: ${backupPrivatePath}`);
  }

  if (fs.existsSync(currentPublicPath)) {
    const backupPublicPath = path.join(KEY_DIR, `jwt-public-backup-${Date.now()}.pem`);
    fs.copyFileSync(currentPublicPath, backupPublicPath);
    console.log(`📦 Backed up current public key to: ${backupPublicPath}`);
  }

  // Write new keys
  const newPrivateKeyPath = path.join(KEY_DIR, 'jwt-private.pem');
  const newPublicKeyPath = path.join(KEY_DIR, 'jwt-public.pem');
  
  fs.writeFileSync(newPrivateKeyPath, privateKey, { mode: 0o600 });
  fs.writeFileSync(newPublicKeyPath, publicKey, { mode: 0o644 });

  console.log('✅ New key pair generated successfully!');
  console.log(`🔑 New private key: ${newPrivateKeyPath}`);
  console.log(`🔑 New public key: ${newPublicKeyPath}`);
  console.log(`🆔 New key ID: ${keyId}`);
  console.log('');

  // Generate environment variables
  console.log('📋 Update your .env file with these new values:');
  console.log('');
  console.log('# JWT Configuration (Updated)');
  console.log('JWT_ACCESS_TTL=15m');
  console.log('JWT_REFRESH_TTL=30d');
  console.log('JWT_CLOCK_SKEW_TOLERANCE=120');
  console.log('JWT_KEY_ROTATION_ENABLED=true');
  console.log(`JWT_CURRENT_KEY_ID=${keyId}`);
  console.log('JWT_PRIVATE_KEY=' + privateKey.replace(/\n/g, '\\n'));
  console.log('JWT_PUBLIC_KEY=' + publicKey.replace(/\n/g, '\\n'));
  console.log('');

  // Key rotation instructions
  console.log('🔄 Key Rotation Instructions:');
  console.log('=============================');
  console.log('');
  console.log('1. **Update Environment Variables**:');
  console.log('   - Update your .env file with the new keys above');
  console.log('   - Set JWT_KEY_ROTATION_ENABLED=true');
  console.log('   - Update JWT_CURRENT_KEY_ID to the new key ID');
  console.log('');
  console.log('2. **Deploy New Keys**:');
  console.log('   - Deploy the new keys to all application instances');
  console.log('   - Ensure all instances use the same key ID');
  console.log('   - Restart the application to load new keys');
  console.log('');
  console.log('3. **Monitor Token Validation**:');
  console.log('   - Old tokens will continue to work until they expire');
  console.log('   - New tokens will use the new key ID');
  console.log('   - Monitor logs for any token validation issues');
  console.log('');
  console.log('4. **Cleanup Old Keys** (after successful deployment):');
  console.log('   - Remove backup key files after confirming new keys work');
  console.log('   - Update any external systems that validate your tokens');
  console.log('');
  console.log('⚠️  IMPORTANT SECURITY NOTES:');
  console.log('   - Keep backup keys secure until rotation is complete');
  console.log('   - Test token generation and validation before full deployment');
  console.log('   - Consider gradual rollout for production environments');
  console.log('   - Monitor for any authentication failures during rotation');
  console.log('   - Have a rollback plan ready in case of issues');

} catch (error) {
  console.error('❌ Key rotation failed:', error.message);
  process.exit(1);
}
