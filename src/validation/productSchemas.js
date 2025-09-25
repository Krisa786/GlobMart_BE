const Joi = require('joi');
const { getAllowedBadges, validateBadges } = require('../config/sustainability');

// Category validation schemas
const createCategorySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(160)
    .required()
    .messages({
      'string.min': 'Category name must be at least 1 character long',
      'string.max': 'Category name must not exceed 160 characters',
      'any.required': 'Category name is required'
    }),
  parent_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Parent ID must be a number',
      'number.integer': 'Parent ID must be an integer',
      'number.positive': 'Parent ID must be positive'
    }),
  is_active: Joi.boolean()
    .default(true)
    .optional()
    .messages({
      'boolean.base': 'is_active must be a boolean'
    })
});

const updateCategorySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(160)
    .optional()
    .messages({
      'string.min': 'Category name must be at least 1 character long',
      'string.max': 'Category name must not exceed 160 characters'
    }),
  parent_id: Joi.number()
    .integer()
    .positive()
    .allow(null)
    .optional()
    .messages({
      'number.base': 'Parent ID must be a number',
      'number.integer': 'Parent ID must be an integer',
      'number.positive': 'Parent ID must be positive'
    }),
  is_active: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'is_active must be a boolean'
    })
});

// Product validation schemas
const createProductSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(220)
    .required()
    .messages({
      'string.min': 'Product title must be at least 1 character long',
      'string.max': 'Product title must not exceed 220 characters',
      'any.required': 'Product title is required'
    }),
  category_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Category ID must be a number',
      'number.integer': 'Category ID must be an integer',
      'number.positive': 'Category ID must be positive',
      'any.required': 'Category ID is required'
    }),
  short_desc: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Short description must not exceed 1000 characters'
    }),
  long_desc: Joi.string()
    .max(10000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Long description must not exceed 10000 characters'
    }),
  brand: Joi.string()
    .max(120)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Brand name must not exceed 120 characters'
    }),
  price: Joi.number()
    .precision(2)
    .min(0)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price must be greater than or equal to 0',
      'any.required': 'Price is required'
    }),
  currency: Joi.string()
    .length(3)
    .valid('USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD')
    .default('USD')
    .optional()
    .messages({
      'string.length': 'Currency must be exactly 3 characters',
      'any.only': 'Currency must be one of: USD, EUR, GBP, INR, CAD, AUD'
    }),
  status: Joi.string()
    .valid('draft', 'published', 'archived')
    .default('draft')
    .optional()
    .messages({
      'any.only': 'Status must be one of: draft, published, archived'
    }),
  sustainability_badges: Joi.array()
    .items(Joi.string().valid(...getAllowedBadges()))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 sustainability badges allowed',
      'any.only': `Sustainability badges must be one of: ${getAllowedBadges().join(', ')}`
    }),
  meta: Joi.object()
    .optional()
    .messages({
      'object.base': 'Meta must be an object'
    })
});

const updateProductSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(220)
    .optional()
    .messages({
      'string.min': 'Product title must be at least 1 character long',
      'string.max': 'Product title must not exceed 220 characters'
    }),
  category_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Category ID must be a number',
      'number.integer': 'Category ID must be an integer',
      'number.positive': 'Category ID must be positive'
    }),
  short_desc: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Short description must not exceed 1000 characters'
    }),
  long_desc: Joi.string()
    .max(10000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Long description must not exceed 10000 characters'
    }),
  brand: Joi.string()
    .max(120)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Brand name must not exceed 120 characters'
    }),
  price: Joi.number()
    .precision(2)
    .min(0)
    .optional()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price must be greater than or equal to 0'
    }),
  currency: Joi.string()
    .length(3)
    .valid('USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD')
    .optional()
    .messages({
      'string.length': 'Currency must be exactly 3 characters',
      'any.only': 'Currency must be one of: USD, EUR, GBP, INR, CAD, AUD'
    }),
  status: Joi.string()
    .valid('draft', 'published', 'archived')
    .optional()
    .messages({
      'any.only': 'Status must be one of: draft, published, archived'
    }),
  sustainability_badges: Joi.array()
    .items(Joi.string().valid(...getAllowedBadges()))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 sustainability badges allowed',
      'any.only': `Sustainability badges must be one of: ${getAllowedBadges().join(', ')}`
    }),
  meta: Joi.object()
    .optional()
    .messages({
      'object.base': 'Meta must be an object'
    })
});

// Inventory validation schemas
const adjustInventorySchema = Joi.object({
  quantity: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be an integer',
      'number.min': 'Quantity must be greater than or equal to 0',
      'any.required': 'Quantity is required'
    }),
  note: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Note must not exceed 255 characters'
    })
});

const inventoryQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    })
});

// Query parameter validation schemas
const categoryQuerySchema = Joi.object({
  flat: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'flat parameter must be a boolean'
    })
});

const productQuerySchema = Joi.object({
  q: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Search query must not exceed 100 characters'
    }),
  category: Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': 'Category filter must be a number',
      'number.integer': 'Category filter must be an integer',
      'number.positive': 'Category filter must be positive'
    }),
  minPrice: Joi.number()
    .precision(2)
    .min(0)
    .optional()
    .messages({
      'number.base': 'Minimum price must be a number',
      'number.min': 'Minimum price must be greater than or equal to 0'
    }),
  maxPrice: Joi.number()
    .precision(2)
    .min(0)
    .optional()
    .messages({
      'number.base': 'Maximum price must be a number',
      'number.min': 'Maximum price must be greater than or equal to 0'
    }),
  badge: Joi.string()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Badge filter must not exceed 50 characters'
    }),
  sort: Joi.string()
    .valid('price', 'newest', 'oldest', 'name', 'brand')
    .default('newest')
    .optional()
    .messages({
      'any.only': 'Sort must be one of: price, newest, oldest, name, brand'
    }),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    })
}).custom((value, helpers) => {
  // If minPrice and maxPrice are both provided, ensure minPrice <= maxPrice
  if (value.minPrice !== undefined && value.maxPrice !== undefined) {
    if (value.minPrice > value.maxPrice) {
      return helpers.error('any.custom', {
        message: 'Minimum price cannot be greater than maximum price'
      });
    }
  }
  return value;
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors
        }
      });
    }

    req.body = value;
    next();
  };
};

// Query validation middleware factory
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(422).json({
        error: {
          code: 'QUERY_VALIDATION_ERROR',
          message: 'Query validation failed',
          details: errors
        }
      });
    }

    req.query = value;
    next();
  };
};

module.exports = {
  // Category schemas
  createCategorySchema,
  updateCategorySchema,
  categoryQuerySchema,

  // Product schemas
  createProductSchema,
  updateProductSchema,
  productQuerySchema,

  // Inventory schemas
  adjustInventorySchema,
  inventoryQuerySchema,

  // Middleware
  validate,
  validateQuery
};
