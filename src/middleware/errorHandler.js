const winston = require('winston');

// List of sensitive fields to redact from logs
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'jwt',
  'api_key',
  'access_token',
  'refresh_token',
  'private_key',
  'public_key',
  'encryption_key',
  'email_pass',
  's3_secret',
  'redis_password',
  'meilisearch_api_key'
];

// Custom format to redact sensitive information
const redactSensitive = winston.format((info) => {
  if (info.message && typeof info.message === 'object') {
    info.message = redactObject(info.message);
  }
  
  if (info.meta && typeof info.meta === 'object') {
    info.meta = redactObject(info.meta);
  }
  
  // Redact sensitive fields in the info object itself
  Object.keys(info).forEach(key => {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      info[key] = '[REDACTED]';
    }
  });
  
  return info;
});

// Recursively redact sensitive fields from objects
function redactObject(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const redacted = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

// Custom format for request correlation
const requestCorrelation = winston.format((info) => {
  // Add request ID if available from the current context
  if (process.requestId) {
    info.requestId = process.requestId;
  }
  
  return info;
});

// Configure Winston logger with enhanced features
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    redactSensitive(),
    requestCorrelation(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'globe-mart-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss.SSS'
      }),
      winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
        const requestIdStr = requestId ? `[${requestId}] ` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${requestIdStr}${message}${metaStr}`;
      })
    )
  }));
}

// Add request ID to the current process context
logger.setRequestId = (requestId) => {
  process.requestId = requestId;
};

// Clear request ID from the current process context
logger.clearRequestId = () => {
  delete process.requestId;
};

// Enhanced logging methods with request correlation
logger.logRequest = (req, message, meta = {}) => {
  logger.info(message, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    ...meta
  });
};

logger.logResponse = (req, res, message, meta = {}) => {
  logger.info(message, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: res.responseTime,
    userId: req.user?.id,
    ...meta
  });
};

logger.logError = (req, error, message = 'Request error', meta = {}) => {
  logger.error(message, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    userId: req.user?.id,
    ...meta
  });
};

logger.logSecurity = (req, message, meta = {}) => {
  logger.warn(message, {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    security: true,
    ...meta
  });
};

logger.logPerformance = (req, operation, duration, meta = {}) => {
  logger.info(`Performance: ${operation}`, {
    requestId: req.requestId,
    operation,
    duration,
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    performance: true,
    ...meta
  });
};

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId
  });

  // Default error
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors.map(error => error.message).join(', ');
    error = {
      message,
      statusCode: 400,
      code: 'VALIDATION_ERROR'
    };
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = 'Duplicate field value entered';
    error = {
      message,
      statusCode: 400,
      code: 'DUPLICATE_ENTRY'
    };
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404,
      code: 'RESOURCE_NOT_FOUND'
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: 401,
      code: 'INVALID_TOKEN'
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: 401,
      code: 'TOKEN_EXPIRED'
    };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    error = {
      message: 'Too many requests',
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED'
    };
  }

  // Standard error format as per task requirements
  const response = {
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Server Error'
    }
  };

  // Add request ID for correlation
  if (req.requestId) {
    response.error.requestId = req.requestId;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

module.exports = { errorHandler, logger };
