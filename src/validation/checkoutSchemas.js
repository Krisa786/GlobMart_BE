const Joi = require('joi');

// Address validation schema
const addressSchema = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  phone: Joi.string().min(1).max(20).required(),
  email: Joi.string().email().max(120).required(),
  line1: Joi.string().min(1).max(255).required(),
  line2: Joi.string().max(255).allow('').optional(),
  city: Joi.string().min(1).max(120).required(),
  state: Joi.string().min(1).max(120).required(),
  postal_code: Joi.string().min(1).max(20).required(),
  country: Joi.string().length(2).valid(
    'US', 'CA', 'GB', 'IN', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 
    'BR', 'MX', 'JP', 'CN', 'KR', 'SG', 'MY', 'TH', 'PH', 'ID', 'VN'
  ).required()
});

// Cart item validation schema
const cartItemSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  sku: Joi.string().min(1).max(64).required(),
  qty: Joi.number().integer().min(1).required(),
  line_subtotal: Joi.number().min(0).required(),
  product: Joi.object({
    id: Joi.number().integer().positive().required(),
    name: Joi.string().required(),
    weight: Joi.number().min(0).optional()
  }).optional()
});

// Create checkout session schema
const createCheckoutSessionSchema = Joi.object({
  cart_id: Joi.number().integer().positive().required(),
  shipping_address: addressSchema.required(),
  billing_address: addressSchema.required(),
  shipping_method: Joi.string().valid('standard', 'express', 'overnight', 'pickup').required()
});

// Get checkout session schema (for params)
const getCheckoutSessionSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

// Shipping methods request schema
const shippingMethodsSchema = Joi.object({
  shipping_address: addressSchema.required(),
  cart_items: Joi.array().items(cartItemSchema).min(1).required()
});

// Shipping cost calculation schema
const shippingCostSchema = Joi.object({
  shipping_address: addressSchema.required(),
  cart_items: Joi.array().items(cartItemSchema).min(1).required(),
  shipping_method: Joi.string().valid('standard', 'express', 'overnight', 'pickup').default('standard'),
  currency: Joi.string().length(3).valid('USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD').default('INR')
});

// Tax calculation schema
const taxCalculationSchema = Joi.object({
  shipping_address: addressSchema.required(),
  cart_items: Joi.array().items(cartItemSchema).min(1).required(),
  currency: Joi.string().length(3).valid('USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD').default('INR'),
  customer_info: Joi.object({
    type: Joi.string().valid('individual', 'business').default('individual'),
    tax_id: Joi.string().optional()
  }).optional()
});

// Customer info schema
const customerInfoSchema = Joi.object({
  type: Joi.string().valid('individual', 'business').default('individual'),
  tax_id: Joi.string().optional(),
  company_name: Joi.string().max(255).optional(),
  vat_number: Joi.string().max(50).optional()
});

// Guest checkout schema (for non-authenticated users)
const guestCheckoutSchema = Joi.object({
  cart_id: Joi.number().integer().positive().required(),
  shipping_address: addressSchema.required(),
  billing_address: addressSchema.required(),
  shipping_method: Joi.string().valid('standard', 'express', 'overnight', 'pickup').required(),
  guest_info: Joi.object({
    email: Joi.string().email().required(),
    phone: Joi.string().min(1).max(20).optional()
  }).optional()
});

// Address validation for different countries
const countrySpecificAddressSchema = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  phone: Joi.string().min(1).max(20).required(),
  email: Joi.string().email().max(120).required(),
  line1: Joi.string().min(1).max(255).required(),
  line2: Joi.string().max(255).allow('').optional(),
  city: Joi.string().min(1).max(120).required(),
  state: Joi.string().min(1).max(120).required(),
  postal_code: Joi.string().min(1).max(20).required(),
  country: Joi.string().length(2).required()
}).custom((value, helpers) => {
  // Custom validation for postal codes based on country
  const postalCodePatterns = {
    'US': /^\d{5}(-\d{4})?$/,
    'CA': /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/,
    'GB': /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/,
    'IN': /^\d{6}$/,
    'AU': /^\d{4}$/,
    'DE': /^\d{5}$/,
    'FR': /^\d{5}$/,
    'IT': /^\d{5}$/,
    'ES': /^\d{5}$/,
    'NL': /^\d{4} [A-Z]{2}$/
  };

  const pattern = postalCodePatterns[value.country];
  if (pattern && !pattern.test(value.postal_code)) {
    return helpers.error('postalCode.invalid', { country: value.country });
  }

  return value;
});

// Validation middleware functions
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
          message: 'Request validation failed',
          details: errorDetails
        }
      });
    }

    req.body = value;
    next();
  };
};

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
          message: 'Query parameter validation failed',
          details: errorDetails
        }
      });
    }

    req.query = value;
    next();
  };
};

module.exports = {
  // Schemas
  createCheckoutSessionSchema,
  getCheckoutSessionSchema,
  shippingMethodsSchema,
  shippingCostSchema,
  taxCalculationSchema,
  guestCheckoutSchema,
  countrySpecificAddressSchema,
  addressSchema,
  cartItemSchema,
  customerInfoSchema,
  
  // Validation middleware
  validate,
  validateParams,
  validateQuery
};
