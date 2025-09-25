const { validateBadges } = require('../config/sustainability');
const { logger } = require('./errorHandler');

/**
 * Middleware to validate sustainability badges against allow-list
 * Returns 422 for invalid badges as specified in task requirements
 */
const validateSustainabilityBadges = (req, res, next) => {
  try {
    const { sustainability_badges } = req.body;
    
    // Skip validation if no badges provided
    if (!sustainability_badges || !Array.isArray(sustainability_badges) || sustainability_badges.length === 0) {
      return next();
    }

    const validation = validateBadges(sustainability_badges);
    
    if (!validation.isValid) {
      logger.warn('Invalid sustainability badges provided', {
        invalidBadges: validation.invalidBadges,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      return res.status(422).json({
        error: {
          code: 'INVALID_SUSTAINABILITY_BADGES',
          message: validation.error,
          details: {
            invalidBadges: validation.invalidBadges,
            allowedBadges: ['FSC', 'FairTrade', 'Recycled', 'Organic', 'BPA-Free']
          }
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Error validating sustainability badges:', {
      error: error.message,
      requestId: req.requestId
    });

    res.status(500).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate sustainability badges'
      }
    });
  }
};

module.exports = {
  validateSustainabilityBadges
};
