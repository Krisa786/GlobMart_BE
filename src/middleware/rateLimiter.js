const { logger } = require('./errorHandler');

/**
 * In-memory rate limiter for basic rate limiting
 * In production, this should be replaced with Redis-based rate limiting
 */
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  /**
   * Check if request is within rate limit
   * @param {string} key - Unique identifier for the client
   * @param {number} limit - Maximum number of requests
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} - { allowed: boolean, remaining: number, resetTime: number }
   */
  checkLimit(key, limit, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request history for this key
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const requestHistory = this.requests.get(key);

    // Remove old requests outside the window
    const validRequests = requestHistory.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);

    // Check if under limit
    const requestCount = validRequests.length;
    const allowed = requestCount < limit;

    if (allowed) {
      // Add current request
      validRequests.push(now);
      this.requests.set(key, validRequests);
    }

    // Calculate reset time (when the oldest request in window will expire)
    const resetTime = validRequests.length > 0 ? validRequests[0] + windowMs : now + windowMs;

    return {
      allowed,
      remaining: Math.max(0, limit - requestCount - (allowed ? 1 : 0)),
      resetTime,
      total: limit
    };
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(timestamp => now - timestamp < maxAge);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  /**
   * Destroy the rate limiter and clear cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware factory
 * @param {Object} options - Rate limiting options
 * @param {number} options.limit - Maximum number of requests
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {Function} options.keyGenerator - Function to generate unique key for each request
 * @param {Function} options.skip - Function to determine if request should be skipped
 * @param {string} options.message - Custom error message
 * @returns {Function} - Express middleware function
 */
const createRateLimit = (options = {}) => {
  const {
    limit = 100,
    windowMs = 15 * 60 * 1000, // 15 minutes
    keyGenerator = (req) => req.ip,
    skip = () => false,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    // Skip rate limiting if skip function returns true
    if (skip(req)) {
      return next();
    }

    try {
      const key = keyGenerator(req);
      const result = rateLimiter.checkLimit(key, limit, windowMs);

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': result.total,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });

      if (!result.allowed) {
        logger.logSecurity(req, 'Rate limit exceeded', {
          key,
          limit,
          windowMs,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            requestId: req.requestId,
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
          }
        });
      }

      // Log rate limit info for monitoring
      if (result.remaining < 10) {
        logger.warn('Rate limit approaching', {
          requestId: req.requestId,
          key,
          remaining: result.remaining,
          limit: result.total,
          ip: req.ip
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error', {
        requestId: req.requestId,
        error: error.message,
        stack: error.stack
      });
      
      // If rate limiting fails, allow the request to proceed
      next();
    }
  };
};

/**
 * Predefined rate limiters for different use cases
 */
const rateLimiters = {
  // General API rate limiting
  general: createRateLimit({
    limit: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests from this IP, please try again later'
  }),

  // Strict rate limiting for auth endpoints
  auth: createRateLimit({
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts, please try again later',
    keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`
  }),

  // Search endpoint rate limiting
  search: createRateLimit({
    limit: 60,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many search requests, please slow down'
  }),

  // Upload endpoint rate limiting
  upload: createRateLimit({
    limit: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many upload requests, please try again later'
  }),

  // Admin endpoints rate limiting
  admin: createRateLimit({
    limit: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many admin requests, please try again later',
    skip: (req) => !req.user || !req.user.roles?.some(role => role.name === 'admin')
  }),

  // Public endpoints (more lenient)
  public: createRateLimit({
    limit: 300,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests, please try again later'
  }),

  // Health check endpoints (very lenient)
  health: createRateLimit({
    limit: 1000,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many health check requests'
  })
};

/**
 * Dynamic rate limiter based on user authentication status
 */
const dynamicRateLimit = createRateLimit({
  limit: (req) => {
    // Authenticated users get higher limits
    if (req.user) {
      // Admin users get highest limits
      if (req.user.roles?.some(role => role.name === 'admin')) {
        return 1000;
      }
      // Regular authenticated users
      return 500;
    }
    // Anonymous users get lower limits
    return 100;
  },
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Rate limit exceeded, please try again later'
});

/**
 * Rate limiter for specific endpoints that need custom logic
 */
const customRateLimit = (config) => {
  return createRateLimit({
    ...config,
    keyGenerator: (req) => {
      // Default key generation with user context
      const baseKey = req.ip;
      if (req.user) {
        return `${baseKey}:user:${req.user.id}`;
      }
      return baseKey;
    }
  });
};

module.exports = {
  createRateLimit,
  rateLimiters,
  dynamicRateLimit,
  customRateLimit,
  rateLimiter
};