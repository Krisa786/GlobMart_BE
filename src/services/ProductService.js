const { Product, Category, ProductImage, Inventory, StockLedger, User } = require('../database/models');
const { Op } = require('sequelize');
const IndexerService = require('./IndexerService');

class ProductService {
  /**
   * Generate a unique slug from a title
   */
  static async generateSlug(title, excludeId = null) {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const whereClause = { slug };
      if (excludeId) {
        whereClause.id = { [Op.ne]: excludeId };
      }

      const existing = await Product.findOne({ where: whereClause });
      if (!existing) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Generate a unique SKU
   */
  static async generateSKU(title, excludeId = null) {
    const timestamp = Date.now().toString().slice(-6);
    const titlePrefix = title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);

    const baseSKU = `${titlePrefix}-${timestamp}`;
    let sku = baseSKU;
    let counter = 1;

    while (true) {
      const whereClause = { sku };
      if (excludeId) {
        whereClause.id = { [Op.ne]: excludeId };
      }

      const existing = await Product.findOne({ where: whereClause });
      if (!existing) {
        break;
      }

      sku = `${baseSKU}-${counter}`;
      counter++;
    }

    return sku;
  }

  /**
   * Create a new product
   */
  static async createProduct(productData, userId = null) {
    const {
      title,
      category_id,
      short_desc,
      long_desc,
      brand,
      price,
      currency = 'USD',
      status = 'draft',
      sustainability_badges,
      meta
    } = productData;

    // Validate category exists
    const category = await Category.findByPk(category_id);
    if (!category) {
      throw new Error('Category not found');
    }

    // Generate unique slug and SKU
    const slug = await this.generateSlug(title);
    const sku = await this.generateSKU(title);

    // Create product
    const product = await Product.create({
      title,
      slug,
      sku,
      category_id,
      short_desc,
      long_desc,
      brand,
      price,
      currency,
      status,
      sustainability_badges,
      meta,
      created_by: userId,
      updated_by: userId
    });

    // Create inventory record if product is published
    if (status === 'published') {
      await Inventory.create({
        product_id: product.id,
        quantity: 0,
        low_stock_threshold: 5
      });
    }

    // Enqueue for search indexing
    await IndexerService.handleProductCreated(product.id);

    return product;
  }

  /**
   * Update a product
   */
  static async updateProduct(productId, updateData, userId = null) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const {
      title,
      category_id,
      short_desc,
      long_desc,
      brand,
      price,
      currency,
      status,
      sustainability_badges,
      meta
    } = updateData;

    // Validate category if provided
    if (category_id && category_id !== product.category_id) {
      const category = await Category.findByPk(category_id);
      if (!category) {
        throw new Error('Category not found');
      }
    }

    // Generate new slug if title changed
    let slug = product.slug;
    if (title && title !== product.title) {
      slug = await this.generateSlug(title, productId);
    }

    // Update product
    await product.update({
      title: title || product.title,
      slug,
      category_id: category_id || product.category_id,
      short_desc: short_desc !== undefined ? short_desc : product.short_desc,
      long_desc: long_desc !== undefined ? long_desc : product.long_desc,
      brand: brand !== undefined ? brand : product.brand,
      price: price !== undefined ? price : product.price,
      currency: currency || product.currency,
      status: status || product.status,
      sustainability_badges: sustainability_badges !== undefined ? sustainability_badges : product.sustainability_badges,
      meta: meta !== undefined ? meta : product.meta,
      updated_by: userId
    });

    // Create inventory record if status changed to published
    if (status === 'published' && product.status !== 'published') {
      const existingInventory = await Inventory.findOne({
        where: { product_id: productId }
      });

      if (!existingInventory) {
        await Inventory.create({
          product_id: productId,
          quantity: 0,
          low_stock_threshold: 5
        });
      }
    }

    // Enqueue for search indexing
    await IndexerService.handleProductUpdated(productId);

    return product;
  }

  /**
   * Delete a product (soft delete)
   */
  static async deleteProduct(productId, userId = null) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    await product.update({
      status: 'archived',
      updated_by: userId
    });

    await product.destroy();

    // Enqueue for search index removal
    await IndexerService.handleProductDeleted(productId);

    return true;
  }

  /**
   * Get product by ID with full details
   */
  static async getProductById(productId, includeDeleted = false) {
    const whereClause = { id: productId };
    if (!includeDeleted) {
      whereClause.deleted_at = null;
    }

    const product = await Product.findOne({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'images', order: [['position', 'ASC']] },
        { model: Inventory, as: 'inventory' }
      ]
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }

  /**
   * Get product by slug
   */
  static async getProductBySlug(slug, includeDeleted = false, isAdmin = false) {
    const whereClause = { slug };
    
    // For public access, only show published products
    if (!isAdmin) {
      whereClause.status = 'published';
    }
    
    if (!includeDeleted) {
      whereClause.deleted_at = null;
    }

    const product = await Product.findOne({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'images', order: [['position', 'ASC']] },
        { model: Inventory, as: 'inventory' }
      ]
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // For public access, ensure product is published
    if (!isAdmin && product.status !== 'published') {
      throw new Error('Product not found');
    }

    // Add inventory information to the product object for public consumption
    if (product.inventory) {
      product.dataValues.inventory = {
        quantity: product.inventory.quantity,
        low_stock: product.inventory.quantity <= product.inventory.low_stock_threshold
      };
      product.dataValues.in_stock = product.inventory.quantity > 0;
    } else {
      product.dataValues.inventory = {
        quantity: 0,
        low_stock: false
      };
      product.dataValues.in_stock = false;
    }

    // Ensure sustainability_badges is always an array
    product.dataValues.sustainability_badges = product.sustainability_badges || [];

    // Add specs from meta if available
    product.dataValues.specs = product.meta || {};

    return product;
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(categoryId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      includeInactive = false,
      includeDeleted = false
    } = options;

    const whereClause = { category_id };

    if (!includeInactive) {
      whereClause.status = 'published';
    }

    if (!includeDeleted) {
      whereClause.deleted_at = null;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'images', limit: 1 },
        { model: Inventory, as: 'inventory' }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    // Add inventory information to each product for public consumption
    const productsWithInventory = rows.map(product => {
      if (product.inventory) {
        product.dataValues.inventory = {
          in_stock: product.inventory.in_stock,
          quantity: product.inventory.quantity, // Expose quantity for public use
          low_stock: product.inventory.isLowStock(),
          stock_status: product.inventory.getStockStatus()
        };
      } else {
        product.dataValues.inventory = {
          in_stock: false,
          quantity: 0,
          low_stock: false,
          stock_status: 'out_of_stock'
        };
      }
      return product;
    });

    return {
      products: productsWithInventory,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Search products
   */
  static async searchProducts(query, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      categoryId = null,
      minPrice = null,
      maxPrice = null,
      brand = null,
      inStock = null,
      sustainabilityBadges = null
    } = options;

    const whereClause = {
      status: 'published',
      deleted_at: null,
      [Op.or]: [
        { title: { [Op.like]: `%${query}%` } },
        { short_desc: { [Op.like]: `%${query}%` } },
        { long_desc: { [Op.like]: `%${query}%` } },
        { brand: { [Op.like]: `%${query}%` } }
      ]
    };

    if (categoryId) {
      whereClause.category_id = categoryId;
    }

    if (minPrice !== null || maxPrice !== null) {
      whereClause.price = {};
      if (minPrice !== null) {whereClause.price[Op.gte] = minPrice;}
      if (maxPrice !== null) {whereClause.price[Op.lte] = maxPrice;}
    }

    if (brand) {
      whereClause.brand = { [Op.like]: `%${brand}%` };
    }

    if (sustainabilityBadges && Array.isArray(sustainabilityBadges)) {
      whereClause.sustainability_badges = {
        [Op.overlap]: sustainabilityBadges
      };
    }

    const offset = (page - 1) * limit;

    const include = [
      { model: Category, as: 'category' },
      { model: ProductImage, as: 'images', limit: 1 },
      { model: Inventory, as: 'inventory' }
    ];

    // Filter by stock if requested
    if (inStock !== null) {
      include[2].where = inStock ? { quantity: { [Op.gt]: 0 } } : { quantity: 0 };
    }

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      include,
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    // Add inventory information to each product for public consumption
    const productsWithInventory = rows.map(product => {
      if (product.inventory) {
        product.dataValues.inventory = {
          in_stock: product.inventory.in_stock,
          quantity: product.inventory.quantity, // Expose quantity for public use
          low_stock: product.inventory.isLowStock(),
          stock_status: product.inventory.getStockStatus()
        };
      } else {
        product.dataValues.inventory = {
          in_stock: false,
          quantity: 0,
          low_stock: false,
          stock_status: 'out_of_stock'
        };
      }
      return product;
    });

    return {
      products: productsWithInventory,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get featured products
   */
  static async getFeaturedProducts(limit = 10) {
    const products = await Product.findAll({
      where: {
        status: 'published',
        deleted_at: null
      },
      include: [
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'images', limit: 1 },
        { model: Inventory, as: 'inventory' }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return products;
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(limit = 50) {
    const products = await Product.findAll({
      where: {
        status: 'published',
        deleted_at: null
      },
      include: [
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'images', limit: 1 },
        {
          model: Inventory,
          as: 'inventory',
          where: {
            [Op.and]: [
              { quantity: { [Op.gt]: 0 } },
              { quantity: { [Op.lte]: Inventory.sequelize.col('low_stock_threshold') } }
            ]
          }
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return products;
  }

  /**
   * Get out of stock products
   */
  static async getOutOfStockProducts(limit = 50) {
    const products = await Product.findAll({
      where: {
        status: 'published',
        deleted_at: null
      },
      include: [
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'images', limit: 1 },
        {
          model: Inventory,
          as: 'inventory',
          where: { quantity: 0 }
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return products;
  }

  /**
   * Update product stock
   */
  static async updateProductStock(productId, quantity, reason = 'manual_adjust', note = null, userId = null) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    let inventory = await Inventory.findOne({
      where: { product_id: productId }
    });

    if (!inventory) {
      inventory = await Inventory.create({
        product_id: productId,
        quantity: 0,
        low_stock_threshold: 5
      });
    }

    const delta = quantity - inventory.quantity;
    await inventory.updateStock(delta, reason, note, userId);

    // Enqueue for search indexing (inventory change affects in_stock status)
    await IndexerService.handleInventoryChanged(productId);

    return inventory;
  }

  /**
   * Get product stock history
   */
  static async getProductStockHistory(productId, limit = 50) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const stockHistory = await StockLedger.findAll({
      where: { product_id: productId },
      include: [
        { model: Product, as: 'product' },
        { model: User, as: 'creator' }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    return stockHistory;
  }

  /**
   * Get products by brand
   */
  static async getProductsByBrand(brand, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    const whereClause = {
      brand: { [Op.like]: `%${brand}%` },
      status: 'published',
      deleted_at: null
    };

    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category' },
        { model: ProductImage, as: 'images', limit: 1 },
        { model: Inventory, as: 'inventory' }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    return {
      products: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Get all brands
   */
  static async getAllBrands() {
    const brands = await Product.findAll({
      where: {
        brand: { [Op.ne]: null },
        status: 'published',
        deleted_at: null
      },
      attributes: ['brand'],
      group: ['brand'],
      order: [['brand', 'ASC']]
    });

    return brands.map(brand => brand.brand).filter(Boolean);
  }
}

module.exports = ProductService;
