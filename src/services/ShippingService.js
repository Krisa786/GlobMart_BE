const { logger } = require('../middleware/errorHandler');

class ShippingService {
  /**
   * Calculate shipping cost for a given address and cart
   * @param {Object} shippingAddress - Shipping address object
   * @param {Array} cartItems - Array of cart items
   * @param {string} shippingMethod - Shipping method
   * @param {string} currency - Currency code
   * @returns {Promise<Object>} Shipping calculation result
   */
  static async calculateShipping(shippingAddress, cartItems, shippingMethod = 'standard', currency = 'INR') {
    try {
      this.validateShippingInputs(shippingAddress, cartItems, shippingMethod);

      const totalWeight = this.calculateTotalWeight(cartItems);
      const totalValue = this.calculateTotalValue(cartItems);
      const shippingZone = this.getShippingZone(shippingAddress.country);
      
      const baseRate = this.getBaseShippingRate(shippingZone, shippingMethod);
      const weightRate = this.getWeightBasedRate(totalWeight, shippingZone, shippingMethod);
      const valueRate = this.getValueBasedRate(totalValue, shippingZone, shippingMethod);
      
      const shippingCost = Math.max(baseRate, weightRate, valueRate);
      const finalCost = this.applyShippingRules(shippingCost, totalValue, shippingZone, shippingMethod);

      const result = {
        shipping_cost: Math.round(finalCost * 100) / 100,
        currency,
        shipping_method: shippingMethod,
        shipping_zone: shippingZone,
        weight: totalWeight,
        value: totalValue,
        breakdown: {
          base_rate: baseRate,
          weight_rate: weightRate,
          value_rate: valueRate,
          final_cost: finalCost
        },
        estimated_delivery: this.getEstimatedDelivery(shippingZone, shippingMethod),
        is_available: this.isShippingAvailable(shippingZone, shippingMethod)
      };

      logger.info('Shipping calculated successfully', {
        country: shippingAddress.country,
        shippingMethod,
        shippingCost: result.shipping_cost,
        currency,
        weight: totalWeight
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate shipping:', {
        error: error.message,
        country: shippingAddress?.country,
        shippingMethod
      });
      throw new Error('Shipping calculation failed');
    }
  }

  /**
   * Get available shipping methods for an address
   * @param {Object} shippingAddress - Shipping address
   * @param {Array} cartItems - Cart items
   * @returns {Promise<Array>} Available shipping methods
   */
  static async getAvailableShippingMethods(shippingAddress, cartItems) {
    const shippingZone = this.getShippingZone(shippingAddress.country);
    const totalWeight = this.calculateTotalWeight(cartItems);
    const totalValue = this.calculateTotalValue(cartItems);

    const methods = [
      { code: 'standard', name: 'Standard Shipping', description: '5-7 business days' },
      { code: 'express', name: 'Express Shipping', description: '2-3 business days' },
      { code: 'overnight', name: 'Overnight Shipping', description: 'Next business day' },
      { code: 'pickup', name: 'Store Pickup', description: 'Available at select locations' }
    ];

    return methods.filter(method => 
      this.isShippingAvailable(shippingZone, method.code) &&
      this.isMethodAvailableForWeight(method.code, totalWeight) &&
      this.isMethodAvailableForValue(method.code, totalValue)
    );
  }

  /**
   * Calculate total weight of cart items
   * @param {Array} cartItems - Cart items
   * @returns {number} Total weight in kg
   */
  static calculateTotalWeight(cartItems) {
    return cartItems.reduce((total, item) => {
      const itemWeight = parseFloat(item.product?.weight) || 0.1; // Default 100g if no weight
      return total + (itemWeight * item.qty);
    }, 0);
  }

  /**
   * Calculate total value of cart items
   * @param {Array} cartItems - Cart items
   * @returns {number} Total value
   */
  static calculateTotalValue(cartItems) {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.line_subtotal) || 0);
    }, 0);
  }

  /**
   * Get shipping zone based on country
   * @param {string} country - Country code
   * @returns {string} Shipping zone
   */
  static getShippingZone(country) {
    const zones = {
      'US': 'domestic',
      'CA': 'domestic',
      'GB': 'europe',
      'DE': 'europe',
      'FR': 'europe',
      'IT': 'europe',
      'ES': 'europe',
      'NL': 'europe',
      'IN': 'asia',
      'AU': 'oceania',
      'JP': 'asia',
      'CN': 'asia',
      'KR': 'asia',
      'SG': 'asia',
      'MY': 'asia',
      'TH': 'asia',
      'PH': 'asia',
      'ID': 'asia',
      'VN': 'asia',
      'BR': 'south_america',
      'MX': 'north_america'
    };

    return zones[country] || 'international';
  }

  /**
   * Get base shipping rate for zone and method
   * @param {string} zone - Shipping zone
   * @param {string} method - Shipping method
   * @returns {number} Base rate
   */
  static getBaseShippingRate(zone, method) {
    const rates = {
      domestic: {
        standard: 5.99,
        express: 12.99,
        overnight: 24.99,
        pickup: 0.00
      },
      europe: {
        standard: 8.99,
        express: 19.99,
        overnight: 39.99,
        pickup: 0.00
      },
      asia: {
        standard: 6.99,
        express: 15.99,
        overnight: 29.99,
        pickup: 0.00
      },
      oceania: {
        standard: 9.99,
        express: 22.99,
        overnight: 44.99,
        pickup: 0.00
      },
      north_america: {
        standard: 7.99,
        express: 16.99,
        overnight: 32.99,
        pickup: 0.00
      },
      south_america: {
        standard: 11.99,
        express: 24.99,
        overnight: 49.99,
        pickup: 0.00
      },
      international: {
        standard: 15.99,
        express: 34.99,
        overnight: 69.99,
        pickup: 0.00
      }
    };

    return rates[zone]?.[method] || 15.99;
  }

  /**
   * Get weight-based shipping rate
   * @param {number} weight - Total weight in kg
   * @param {string} zone - Shipping zone
   * @param {string} method - Shipping method
   * @returns {number} Weight-based rate
   */
  static getWeightBasedRate(weight, zone, method) {
    const weightRates = {
      domestic: { standard: 1.5, express: 2.5, overnight: 4.0, pickup: 0 },
      europe: { standard: 2.0, express: 3.5, overnight: 6.0, pickup: 0 },
      asia: { standard: 1.8, express: 3.0, overnight: 5.0, pickup: 0 },
      oceania: { standard: 2.5, express: 4.0, overnight: 7.0, pickup: 0 },
      north_america: { standard: 2.0, express: 3.5, overnight: 6.0, pickup: 0 },
      south_america: { standard: 3.0, express: 5.0, overnight: 8.0, pickup: 0 },
      international: { standard: 4.0, express: 6.0, overnight: 10.0, pickup: 0 }
    };

    const ratePerKg = weightRates[zone]?.[method] || 4.0;
    return weight * ratePerKg;
  }

  /**
   * Get value-based shipping rate
   * @param {number} value - Total value
   * @param {string} zone - Shipping zone
   * @param {string} method - Shipping method
   * @returns {number} Value-based rate
   */
  static getValueBasedRate(value, zone, method) {
    // Insurance and handling fees based on value
    const valueRates = {
      domestic: { standard: 0.02, express: 0.03, overnight: 0.04, pickup: 0 },
      europe: { standard: 0.025, express: 0.035, overnight: 0.045, pickup: 0 },
      asia: { standard: 0.02, express: 0.03, overnight: 0.04, pickup: 0 },
      oceania: { standard: 0.03, express: 0.04, overnight: 0.05, pickup: 0 },
      north_america: { standard: 0.025, express: 0.035, overnight: 0.045, pickup: 0 },
      south_america: { standard: 0.035, express: 0.045, overnight: 0.055, pickup: 0 },
      international: { standard: 0.04, express: 0.05, overnight: 0.06, pickup: 0 }
    };

    const ratePercentage = valueRates[zone]?.[method] || 0.04;
    return value * ratePercentage;
  }

  /**
   * Apply shipping rules (free shipping thresholds, etc.)
   * @param {number} cost - Calculated shipping cost
   * @param {number} value - Total order value
   * @param {string} zone - Shipping zone
   * @param {string} method - Shipping method
   * @returns {number} Final shipping cost
   */
  static applyShippingRules(cost, value, zone, method) {
    // Free shipping thresholds
    const freeShippingThresholds = {
      domestic: 50,
      europe: 75,
      asia: 60,
      oceania: 80,
      north_america: 55,
      south_america: 90,
      international: 100
    };

    const threshold = freeShippingThresholds[zone] || 100;
    
    // Free shipping for standard method if order value exceeds threshold
    if (method === 'standard' && value >= threshold) {
      return 0;
    }

    // Minimum shipping cost
    const minShippingCost = method === 'pickup' ? 0 : 2.99;
    return Math.max(cost, minShippingCost);
  }

  /**
   * Get estimated delivery time
   * @param {string} zone - Shipping zone
   * @param {string} method - Shipping method
   * @returns {string} Estimated delivery
   */
  static getEstimatedDelivery(zone, method) {
    const deliveryTimes = {
      domestic: {
        standard: '5-7 business days',
        express: '2-3 business days',
        overnight: 'Next business day',
        pickup: 'Ready for pickup'
      },
      europe: {
        standard: '7-10 business days',
        express: '3-5 business days',
        overnight: '1-2 business days',
        pickup: 'Ready for pickup'
      },
      asia: {
        standard: '6-8 business days',
        express: '3-4 business days',
        overnight: '1-2 business days',
        pickup: 'Ready for pickup'
      },
      oceania: {
        standard: '8-12 business days',
        express: '4-6 business days',
        overnight: '2-3 business days',
        pickup: 'Ready for pickup'
      },
      north_america: {
        standard: '7-10 business days',
        express: '3-5 business days',
        overnight: '1-2 business days',
        pickup: 'Ready for pickup'
      },
      south_america: {
        standard: '10-14 business days',
        express: '5-7 business days',
        overnight: '2-3 business days',
        pickup: 'Ready for pickup'
      },
      international: {
        standard: '12-18 business days',
        express: '6-10 business days',
        overnight: '3-5 business days',
        pickup: 'Ready for pickup'
      }
    };

    return deliveryTimes[zone]?.[method] || '12-18 business days';
  }

  /**
   * Check if shipping is available for zone and method
   * @param {string} zone - Shipping zone
   * @param {string} method - Shipping method
   * @returns {boolean} Is available
   */
  static isShippingAvailable(zone, method) {
    // Some methods may not be available in certain zones
    const unavailableMethods = {
      international: ['overnight'], // No overnight to international
      south_america: ['overnight'] // Limited overnight to South America
    };

    return !unavailableMethods[zone]?.includes(method);
  }

  /**
   * Check if method is available for weight
   * @param {string} method - Shipping method
   * @param {number} weight - Weight in kg
   * @returns {boolean} Is available
   */
  static isMethodAvailableForWeight(method, weight) {
    const weightLimits = {
      standard: 30, // 30kg
      express: 20,  // 20kg
      overnight: 10, // 10kg
      pickup: 50    // 50kg
    };

    return weight <= (weightLimits[method] || 30);
  }

  /**
   * Check if method is available for value
   * @param {string} method - Shipping method
   * @param {number} value - Order value
   * @returns {boolean} Is available
   */
  static isMethodAvailableForValue(method, value) {
    const valueLimits = {
      standard: 10000, // $10,000
      express: 5000,   // $5,000
      overnight: 2000, // $2,000
      pickup: 50000    // $50,000
    };

    return value <= (valueLimits[method] || 10000);
  }

  /**
   * Validate shipping calculation inputs
   * @param {Object} shippingAddress - Shipping address
   * @param {Array} cartItems - Cart items
   * @param {string} shippingMethod - Shipping method
   */
  static validateShippingInputs(shippingAddress, cartItems, shippingMethod) {
    if (!shippingAddress || !shippingAddress.country) {
      throw new Error('Shipping address and country are required');
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('Cart items are required');
    }

    if (!shippingMethod) {
      throw new Error('Shipping method is required');
    }

    const validMethods = ['standard', 'express', 'overnight', 'pickup'];
    if (!validMethods.includes(shippingMethod)) {
      throw new Error('Invalid shipping method');
    }
  }
}

module.exports = ShippingService;
