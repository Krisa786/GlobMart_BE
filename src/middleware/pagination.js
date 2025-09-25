/**
 * Pagination utility middleware
 * Provides consistent pagination handling across all endpoints
 */

/**
 * Parse pagination parameters from query string
 * @param {Object} query - Express request query object
 * @returns {Object} Pagination parameters
 */
const parsePaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset
  };
};

/**
 * Create pagination metadata
 * @param {number} total - Total number of records
 * @param {number} page - Current page
 * @param {number} limit - Records per page
 * @returns {Object} Pagination metadata
 */
const createPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPrevPage
  };
};

/**
 * Pagination middleware that adds pagination info to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const paginationMiddleware = (req, res, next) => {
  const pagination = parsePaginationParams(req.query);

  // Add pagination info to request
  req.pagination = pagination;

  next();
};

/**
 * Format paginated response
 * @param {Object} data - Response data
 * @param {Object} pagination - Pagination metadata
 * @param {Object} meta - Additional metadata
 * @returns {Object} Formatted response
 */
const formatPaginatedResponse = (data, pagination, meta = {}) => {
  return {
    data,
    meta: {
      pagination: createPaginationMeta(pagination.total, pagination.page, pagination.limit),
      ...meta
    }
  };
};

/**
 * Set pagination headers
 * @param {Object} res - Express response object
 * @param {Object} pagination - Pagination metadata
 */
const setPaginationHeaders = (res, pagination) => {
  res.set({
    'X-Total-Count': pagination.total.toString(),
    'X-Page': pagination.page.toString(),
    'X-Limit': pagination.limit.toString(),
    'X-Total-Pages': pagination.totalPages.toString(),
    'X-Has-Next-Page': pagination.hasNextPage.toString(),
    'X-Has-Prev-Page': pagination.hasPrevPage.toString()
  });
};

/**
 * Create pagination options for Sequelize queries
 * @param {Object} pagination - Pagination parameters
 * @returns {Object} Sequelize pagination options
 */
const createSequelizePagination = (pagination) => {
  return {
    limit: pagination.limit,
    offset: pagination.offset
  };
};

/**
 * Handle pagination for Sequelize findAndCountAll results
 * @param {Object} result - Sequelize findAndCountAll result
 * @param {Object} pagination - Pagination parameters
 * @returns {Object} Formatted result with pagination
 */
const handleSequelizePagination = (result, pagination) => {
  const { count, rows } = result;

  return {
    data: rows,
    pagination: createPaginationMeta(count, pagination.page, pagination.limit)
  };
};

/**
 * Validate pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Validation result
 */
const validatePaginationParams = (query) => {
  const errors = [];

  if (query.page && (isNaN(query.page) || parseInt(query.page) < 1)) {
    errors.push({
      field: 'page',
      message: 'Page must be a positive integer'
    });
  }

  if (query.limit && (isNaN(query.limit) || parseInt(query.limit) < 1 || parseInt(query.limit) > 100)) {
    errors.push({
      field: 'limit',
      message: 'Limit must be between 1 and 100'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  parsePaginationParams,
  createPaginationMeta,
  paginationMiddleware,
  formatPaginatedResponse,
  setPaginationHeaders,
  createSequelizePagination,
  handleSequelizePagination,
  validatePaginationParams
};
