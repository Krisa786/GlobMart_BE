#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate RSA key pair for JWT signing
 * This script generates a 2048-bit RSA key pair for JWT RS256 signing
 */

const KEY_SIZE = 2048;
const KEY_DIR = path.join(__dirname, '..', 'keys');

// Ensure keys directory exists
if (!fs.existsSync(KEY_DIR)) {
  fs.mkdirSync(KEY_DIR, { mode: 0o700 }); // Only owner can read/write/execute
}

console.log('🔐 Generating RSA key pair for JWT signing...');
console.log(`📁 Keys will be saved to: ${KEY_DIR}`);

try {
  // Generate key pair
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

  // Write private key
  const privateKeyPath = path.join(KEY_DIR, 'jwt-private.pem');
  fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 }); // Only owner can read/write

  // Write public key
  const publicKeyPath = path.join(KEY_DIR, 'jwt-public.pem');
  fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 }); // Owner can read/write, others can read

  console.log('✅ Key pair generated successfully!');
  console.log(`🔑 Private key: ${privateKeyPath}`);
  console.log(`🔑 Public key: ${publicKeyPath}`);
  console.log('');
  console.log('📋 Add these to your .env file:');
  console.log('');
  console.log('# JWT Configuration');
  console.log('JWT_PRIVATE_KEY=' + privateKey.replace(/\n/g, '\\n'));
  console.log('JWT_PUBLIC_KEY=' + publicKey.replace(/\n/g, '\\n'));
  console.log('');
  console.log('⚠️  IMPORTANT SECURITY NOTES:');
  console.log('   - Keep the private key secure and never commit it to version control');
  console.log('   - The keys directory is already added to .gitignore');
  console.log('   - Use different keys for different environments (dev, staging, prod)');
  console.log('   - Consider using a key management service in production');
  console.log('   - Rotate keys periodically for enhanced security');

} catch (error) {
  console.error('❌ Failed to generate key pair:', error.message);
  process.exit(1);
}
