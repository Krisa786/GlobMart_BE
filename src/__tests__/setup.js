const dotenv = require('dotenv');
const testSequelize = require('./test-database');

// Load test environment variables
dotenv.config({ path: 'test.env' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock JWT keys for testing
process.env.JWT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
wXI2qJ8Cq2Jt3QrJv7z3c8V9zU+QZ7l9k8Y9wP2n6f3Kj2L8G5s1V8Q9zS7p3k
9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w
2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f
3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8
G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8
Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p
3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w
2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj
2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V
8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS
7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k
9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n
6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj2L8G5s1V8Q9zS7p3k9Y8w2n6f3Kj
-----END PRIVATE KEY-----`;

process.env.JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCgcFyNq
ifAqtibd0Kyb+893PFfc1PkGe5fZPGPcD9p+n9yo9i/BubNVfEPc0u6d5PWPMN
p+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo
9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/Bub
NVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc
0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PW
PMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n
9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/B
ubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfE
Pc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d
5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMN
p+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo9i/BubNVfEPc0u6d5PWPMNp+n9yo
QIDAQAB
-----END PUBLIC KEY-----`;

// Global test timeout
jest.setTimeout(30000);

// Use test database
const db = require('../database/models');

beforeAll(async () => {
  // Replace the sequelize instance with our test database
  db.sequelize = testSequelize;
  await db.sequelize.sync({ force: true }); // Recreate tables for each test run
});

afterAll(async () => {
  await db.sequelize.close();
});
