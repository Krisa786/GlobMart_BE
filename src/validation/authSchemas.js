const Joi = require('joi');

// Registration validation schema
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  full_name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name must not exceed 100 characters',
      'any.required': 'Full name is required'
    }),
  phone_country_code: Joi.string()
    .pattern(/^\+[1-9]\d{1,3}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone country code must be in format +XXX'
    }),
  phone: Joi.string()
    .pattern(/^\d{7,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be 7-15 digits'
    }),
  role: Joi.string()
    .valid('CUSTOMER', 'ADMIN', 'SALES_MANAGER', 'WAREHOUSE', 'FINANCE', 'SUPPORT')
    .default('CUSTOMER')
    .optional()
    .messages({
      'any.only': 'Role must be one of: CUSTOMER, ADMIN, SALES_MANAGER, WAREHOUSE, FINANCE, SUPPORT',
      'string.base': 'Role must be a string'
    })
}).custom((value, helpers) => {
  // If phone is provided, phone_country_code is required
  if (value.phone && !value.phone_country_code) {
    return helpers.error('any.custom', { message: 'Phone country code is required when phone is provided' });
  }
  return value;
});

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),
  two_fa_code: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .optional()
    .messages({
      'string.length': '2FA code must be exactly 6 digits',
      'string.pattern.base': '2FA code must contain only digits'
    })
});

// Refresh token validation schema
const refreshSchema = Joi.object({
  refresh_token: Joi.string()
    .optional()
    .messages({
      'string.base': 'Refresh token must be a string'
    })
});

// Forgot password validation schema
const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

// Reset password validation schema
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    })
});

// 2FA enable validation schema
const enable2FASchema = Joi.object({
  code: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': '2FA code must be exactly 6 digits',
      'string.pattern.base': '2FA code must contain only digits',
      'any.required': '2FA code is required'
    })
});

// 2FA disable validation schema
const disable2FASchema = Joi.object({
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),
  code: Joi.string()
    .min(6)
    .max(8)
    .pattern(/^[A-Z0-9]+$/)
    .required()
    .messages({
      'string.min': 'Code must be at least 6 characters',
      'string.max': 'Code must not exceed 8 characters',
      'string.pattern.base': 'Code must contain only uppercase letters and numbers',
      'any.required': 'Verification code is required'
    })
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

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  enable2FASchema,
  disable2FASchema,
  validate
};
