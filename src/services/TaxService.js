const { logger } = require('../middleware/errorHandler');

class TaxService {
  /**
   * Calculate tax for a given address and cart items
   * @param {Object} shippingAddress - Shipping address object
   * @param {Array} cartItems - Array of cart items with prices
   * @param {string} currency - Currency code
   * @returns {Promise<Object>} Tax calculation result
   */
  static async calculateTax(shippingAddress, cartItems, currency = 'INR') {
    try {
      const taxRates = this.getTaxRatesByCountry(shippingAddress.country);
      const stateTaxRate = this.getStateTaxRate(shippingAddress.country, shippingAddress.state);
      
      let totalTax = 0;
      const itemTaxes = [];

      for (const item of cartItems) {
        const itemSubtotal = parseFloat(item.line_subtotal) || 0;
        const itemTax = this.calculateItemTax(itemSubtotal, taxRates, stateTaxRate);
        
        totalTax += itemTax;
        itemTaxes.push({
          cart_item_id: item.id,
          sku: item.sku,
          subtotal: itemSubtotal,
          tax_rate: taxRates.total,
          state_tax_rate: stateTaxRate,
          tax_amount: itemTax
        });
      }

      const result = {
        total_tax: Math.round(totalTax * 100) / 100, // Round to 2 decimal places
        currency,
        tax_breakdown: {
          federal_tax_rate: taxRates.federal,
          state_tax_rate: stateTaxRate,
          total_tax_rate: taxRates.total + stateTaxRate
        },
        item_taxes: itemTaxes
      };

      logger.info('Tax calculated successfully', {
        country: shippingAddress.country,
        state: shippingAddress.state,
        totalTax: result.total_tax,
        currency
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate tax:', {
        error: error.message,
        country: shippingAddress?.country,
        state: shippingAddress?.state
      });
      throw new Error('Tax calculation failed');
    }
  }

  /**
   * Get tax rates by country
   * @param {string} country - Country code
   * @returns {Object} Tax rates object
   */
  static getTaxRatesByCountry(country) {
    const taxRates = {
      'US': { federal: 0.00, state: 0.00, total: 0.00 }, // Varies by state
      'CA': { federal: 0.05, state: 0.00, total: 0.05 }, // GST
      'GB': { federal: 0.20, state: 0.00, total: 0.20 }, // VAT
      'IN': { federal: 0.18, state: 0.00, total: 0.18 }, // GST
      'AU': { federal: 0.10, state: 0.00, total: 0.10 }, // GST
      'DE': { federal: 0.19, state: 0.00, total: 0.19 }, // VAT
      'FR': { federal: 0.20, state: 0.00, total: 0.20 }, // VAT
      'IT': { federal: 0.22, state: 0.00, total: 0.22 }, // VAT
      'ES': { federal: 0.21, state: 0.00, total: 0.21 }, // VAT
      'NL': { federal: 0.21, state: 0.00, total: 0.21 }, // VAT
      'BR': { federal: 0.00, state: 0.00, total: 0.00 }, // Varies by state
      'MX': { federal: 0.16, state: 0.00, total: 0.16 }, // VAT
      'JP': { federal: 0.10, state: 0.00, total: 0.10 }, // Consumption Tax
      'CN': { federal: 0.13, state: 0.00, total: 0.13 }, // VAT
      'KR': { federal: 0.10, state: 0.00, total: 0.10 }, // VAT
      'SG': { federal: 0.07, state: 0.00, total: 0.07 }, // GST
      'MY': { federal: 0.06, state: 0.00, total: 0.06 }, // SST
      'TH': { federal: 0.07, state: 0.00, total: 0.07 }, // VAT
      'PH': { federal: 0.12, state: 0.00, total: 0.12 }, // VAT
      'ID': { federal: 0.11, state: 0.00, total: 0.11 }, // VAT
      'VN': { federal: 0.10, state: 0.00, total: 0.10 }  // VAT
    };

    return taxRates[country] || { federal: 0.00, state: 0.00, total: 0.00 };
  }

  /**
   * Get state/province tax rate
   * @param {string} country - Country code
   * @param {string} state - State/province name
   * @returns {number} State tax rate
   */
  static getStateTaxRate(country, state) {
    // US state tax rates (simplified)
    if (country === 'US') {
      const stateTaxRates = {
        'CA': 0.075, 'NY': 0.08, 'TX': 0.0625, 'FL': 0.06,
        'IL': 0.0625, 'PA': 0.06, 'OH': 0.0575, 'GA': 0.04,
        'NC': 0.0475, 'MI': 0.06, 'NJ': 0.06625, 'VA': 0.053,
        'WA': 0.065, 'AZ': 0.056, 'MA': 0.0625, 'TN': 0.07,
        'IN': 0.07, 'MO': 0.04225, 'MD': 0.06, 'WI': 0.05,
        'CO': 0.029, 'MN': 0.06875, 'SC': 0.06, 'AL': 0.04,
        'LA': 0.0445, 'KY': 0.06, 'OR': 0.00, 'OK': 0.045,
        'CT': 0.0635, 'UT': 0.061, 'IA': 0.06, 'NV': 0.0685,
        'AR': 0.065, 'MS': 0.07, 'KS': 0.065, 'NM': 0.05125,
        'NE': 0.055, 'WV': 0.06, 'ID': 0.06, 'HI': 0.04,
        'NH': 0.00, 'ME': 0.055, 'RI': 0.07, 'MT': 0.00,
        'DE': 0.00, 'SD': 0.045, 'ND': 0.05, 'AK': 0.00,
        'VT': 0.06, 'WY': 0.04, 'DC': 0.06
      };
      return stateTaxRates[state] || 0.00;
    }

    // Canadian provincial tax rates
    if (country === 'CA') {
      const provincialTaxRates = {
        'AB': 0.00, 'BC': 0.07, 'MB': 0.07, 'NB': 0.10,
        'NL': 0.10, 'NS': 0.10, 'ON': 0.08, 'PE': 0.10,
        'QC': 0.09975, 'SK': 0.06, 'NT': 0.00, 'NU': 0.00,
        'YT': 0.00
      };
      return provincialTaxRates[state] || 0.00;
    }

    // For other countries, return 0 as they typically use federal tax only
    return 0.00;
  }

  /**
   * Calculate tax for a single item
   * @param {number} subtotal - Item subtotal
   * @param {Object} taxRates - Tax rates object
   * @param {number} stateTaxRate - State tax rate
   * @returns {number} Tax amount
   */
  static calculateItemTax(subtotal, taxRates, stateTaxRate) {
    const federalTax = subtotal * taxRates.federal;
    const stateTax = subtotal * stateTaxRate;
    return federalTax + stateTax;
  }

  /**
   * Validate tax calculation inputs
   * @param {Object} shippingAddress - Shipping address
   * @param {Array} cartItems - Cart items
   * @returns {boolean} Validation result
   */
  static validateTaxInputs(shippingAddress, cartItems) {
    if (!shippingAddress || !shippingAddress.country) {
      throw new Error('Shipping address and country are required');
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error('Cart items are required');
    }

    for (const item of cartItems) {
      if (!item.line_subtotal || parseFloat(item.line_subtotal) < 0) {
        throw new Error('Invalid item subtotal');
      }
    }

    return true;
  }

  /**
   * Get tax exemption status for a customer
   * @param {string} customerType - Customer type (individual, business)
   * @param {string} taxId - Tax ID number
   * @returns {boolean} Is tax exempt
   */
  static isTaxExempt(customerType, taxId) {
    // Business customers with valid tax ID are typically tax exempt
    if (customerType === 'business' && taxId) {
      return true;
    }
    return false;
  }

  /**
   * Calculate tax with exemptions
   * @param {Object} shippingAddress - Shipping address
   * @param {Array} cartItems - Cart items
   * @param {string} currency - Currency code
   * @param {Object} customerInfo - Customer information
   * @returns {Promise<Object>} Tax calculation result
   */
  static async calculateTaxWithExemptions(shippingAddress, cartItems, currency = 'INR', customerInfo = {}) {
    // Check if customer is tax exempt
    const isExempt = this.isTaxExempt(customerInfo.type, customerInfo.taxId);
    
    if (isExempt) {
      return {
        total_tax: 0,
        currency,
        tax_breakdown: {
          federal_tax_rate: 0,
          state_tax_rate: 0,
          total_tax_rate: 0,
          exemption_reason: 'Tax exempt customer'
        },
        item_taxes: cartItems.map(item => ({
          cart_item_id: item.id,
          sku: item.sku,
          subtotal: parseFloat(item.line_subtotal) || 0,
          tax_rate: 0,
          state_tax_rate: 0,
          tax_amount: 0
        }))
      };
    }

    return await this.calculateTax(shippingAddress, cartItems, currency);
  }
}

module.exports = TaxService;
