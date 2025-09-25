// Simple test to verify Jest is working
describe('Basic Test Suite', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should verify environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
