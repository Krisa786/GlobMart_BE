const crypto = require('crypto');
const fs = require('fs');

console.log('🔑 Generating keys for GlobeMart Backend...\n');

// Generate JWT key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Generate 32-byte encryption key
const encryptionKey = crypto.randomBytes(32).toString('base64');

console.log('✅ Generated keys successfully!\n');

console.log('📋 Add these to your .env file:\n');

console.log('# JWT Configuration');
console.log(`JWT_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"`);
console.log(`JWT_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"`);
console.log('');

console.log('# Encryption Key (32 bytes base64)');
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log('');

console.log('💡 Copy the above values to your .env file');
console.log('⚠️  Keep these keys secure and never commit them to version control!');
