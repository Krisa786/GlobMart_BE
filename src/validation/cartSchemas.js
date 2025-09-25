const Joi = require('joi');

/**
 * Validation schemas for cart operations
 */

// Schema for creating/retrieving cart
const createCartSchema = Joi.object({
  cart_token: Joi.string().uuid().optional(),
  currency: Joi.string().length(3).valid('USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD').optional()
});

// Schema for adding item to cart
const addItemSchema = Joi.object({
  sku: Joi.string().min(1).max(64).required(),
  qty: Joi.number().integer().min(1).max(1000).required()
});

// Schema for updating cart item
const updateItemSchema = Joi.object({
  qty: Joi.number().integer().min(1).max(1000).required()
});

// Schema for cart merge
const mergeCartSchema = Joi.object({
  guest_cart_token: Joi.string().uuid().required()
});

// Schema for cart query parameters
const cartQuerySchema = Joi.object({
  cart_token: Joi.string().uuid().optional(),
  include_items: Joi.boolean().optional()
});

/**
 * Validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errorDetails
        }
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validation middleware for query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query validation failed',
          details: errorDetails
        }
      });
    }

    req.query = value;
    next();
  };
};

/**
 * Validation middleware for URL parameters
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter validation failed',
          details: errorDetails
        }
      });
    }

    req.params = value;
    next();
  };
};

module.exports = {
  createCartSchema,
  addItemSchema,
  updateItemSchema,
  mergeCartSchema,
  cartQuerySchema,
  validate,
  validateQuery,
  validateParams
};
