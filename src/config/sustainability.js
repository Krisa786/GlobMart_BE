/**
 * Sustainability Badges Configuration
 * 
 * This file contains the allowed sustainability badges that can be assigned to products.
 * All badges must be validated against this allow-list to ensure consistency and prevent
 * invalid badge assignments.
 */

const SUSTAINABILITY_BADGES = {
  // Forest Stewardship Council - certified sustainable forestry
  FSC: {
    name: 'FSC',
    description: 'Forest Stewardship Council certified',
    category: 'forestry'
  },
  
  // Fair Trade certification
  FairTrade: {
    name: 'FairTrade',
    description: 'Fair Trade certified',
    category: 'social'
  },
  
  // Recycled materials
  Recycled: {
    name: 'Recycled',
    description: 'Made from recycled materials',
    category: 'materials'
  },
  
  // Organic certification
  Organic: {
    name: 'Organic',
    description: 'Organic certified',
    category: 'agriculture'
  },
  
  // BPA-Free certification
  'BPA-Free': {
    name: 'BPA-Free',
    description: 'BPA-Free certified',
    category: 'health'
  },
  
  // Biodegradable materials
  Biodegradable: {
    name: 'Biodegradable',
    description: 'Biodegradable materials',
    category: 'materials'
  },
  
  // Energy efficient products
  'Energy-Efficient': {
    name: 'Energy-Efficient',
    description: 'Energy efficient design',
    category: 'efficiency'
  },
  
  // Water saving products
  'Water-Saving': {
    name: 'Water-Saving',
    description: 'Water saving technology',
    category: 'efficiency'
  }
};

/**
 * Get all allowed sustainability badge names
 * @returns {string[]} Array of allowed badge names
 */
function getAllowedBadges() {
  return Object.keys(SUSTAINABILITY_BADGES);
}

/**
 * Check if a badge is allowed
 * @param {string} badge - Badge name to validate
 * @returns {boolean} True if badge is allowed
 */
function isAllowedBadge(badge) {
  return Object.prototype.hasOwnProperty.call(SUSTAINABILITY_BADGES, badge);
}

/**
 * Validate an array of sustainability badges
 * @param {string[]} badges - Array of badge names to validate
 * @returns {Object} Validation result with isValid and invalidBadges
 */
function validateBadges(badges) {
  if (!Array.isArray(badges)) {
    return {
      isValid: false,
      invalidBadges: [],
      error: 'Sustainability badges must be an array'
    };
  }

  const invalidBadges = badges.filter(badge => !isAllowedBadge(badge));
  
  return {
    isValid: invalidBadges.length === 0,
    invalidBadges,
    error: invalidBadges.length > 0 ? `Invalid sustainability badges: ${invalidBadges.join(', ')}` : null
  };
}

/**
 * Get badge information
 * @param {string} badge - Badge name
 * @returns {Object|null} Badge information or null if not found
 */
function getBadgeInfo(badge) {
  return SUSTAINABILITY_BADGES[badge] || null;
}

/**
 * Get all badge information
 * @returns {Object} All badge information
 */
function getAllBadgeInfo() {
  return SUSTAINABILITY_BADGES;
}

module.exports = {
  SUSTAINABILITY_BADGES,
  getAllowedBadges,
  isAllowedBadge,
  validateBadges,
  getBadgeInfo,
  getAllBadgeInfo
};
