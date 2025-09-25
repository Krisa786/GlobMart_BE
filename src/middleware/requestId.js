const { v4: uuidv4 } = require('uuid');
const { logger } = require('./errorHandler');

/**
 * Request ID Middleware
 * Adds a unique request ID (UUID v4) to each request for log correlation
 * Attaches requestId to req object and adds it to response headers
 * Also sets the request ID in the logger context for automatic correlation
 */
const requestIdMiddleware = (req, res, next) => {
  // Generate or use existing request ID
  const requestId = req.headers['x-request-id'] || uuidv4();

  // Attach to request object
  req.requestId = requestId;

  // Set request ID in logger context for automatic correlation
  logger.setRequestId(requestId);

  // Add to response headers for client correlation
  res.setHeader('X-Request-ID', requestId);

  // Log the incoming request
  logger.logRequest(req, 'Incoming request', {
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Override res.end to log response and clear request ID
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // Log the response
    logger.logResponse(req, res, 'Request completed');
    
    // Clear request ID from logger context
    logger.clearRequestId();
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  requestIdMiddleware
};
