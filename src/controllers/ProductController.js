const ProductService = require('../services/ProductService');
const { logger } = require('../middleware/errorHandler');
const { formatPaginatedResponse, setPaginationHeaders } = require('../middleware/pagination');

class ProductController {
  /**
   * Create a new product (Admin only)
   * @route POST /api/admin/products
   */
  static async createProduct(req, res) {
    try {
      const productData = req.body;
      const userId = req.auth?.userId;

      const product = await ProductService.createProduct(productData, userId);

      logger.info('Product created successfully', {
        productId: product.id,
        title: product.title,
        userId,
        requestId: req.requestId
      });

      res.status(201).json({
        data: product
      });
    } catch (error) {
      logger.error('Failed to create product:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Category not found') {
        return res.status(404).json({
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'PRODUCT_CREATE_ERROR',
          message: 'Failed to create product'
        }
      });
    }
  }

  /**
   * Update a product (Admin only)
   * @route PUT /api/admin/products/:id
   */
  static async updateProduct(req, res) {
    try {
      const productId = parseInt(req.params.id);
      const updateData = req.body;
      const userId = req.auth?.userId;

      const product = await ProductService.updateProduct(productId, updateData, userId);

      logger.info('Product updated successfully', {
        productId: product.id,
        title: product.title,
        userId,
        requestId: req.requestId
      });

      res.status(200).json({
        data: product
      });
    } catch (error) {
      logger.error('Failed to update product:', {
        error: error.message,
        productId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      if (error.message === 'Category not found') {
        return res.status(404).json({
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: 'Category not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'PRODUCT_UPDATE_ERROR',
          message: 'Failed to update product'
        }
      });
    }
  }

  /**
   * Delete a product (Admin only - soft delete)
   * @route DELETE /api/admin/products/:id
   */
  static async deleteProduct(req, res) {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.auth?.userId;

      await ProductService.deleteProduct(productId, userId);

      logger.info('Product deleted successfully', {
        productId,
        userId,
        requestId: req.requestId
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete product:', {
        error: error.message,
        productId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'PRODUCT_DELETE_ERROR',
          message: 'Failed to delete product'
        }
      });
    }
  }

  /**
   * Publish a product (Admin only)
   * @route POST /api/admin/products/:id/publish
   */
  static async publishProduct(req, res) {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.auth?.userId;

      const product = await ProductService.updateProduct(productId, { status: 'published' }, userId);

      logger.info('Product published successfully', {
        productId: product.id,
        title: product.title,
        userId,
        requestId: req.requestId
      });

      res.status(200).json({
        data: product
      });
    } catch (error) {
      logger.error('Failed to publish product:', {
        error: error.message,
        productId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'PRODUCT_PUBLISH_ERROR',
          message: 'Failed to publish product'
        }
      });
    }
  }

  /**
   * Unpublish a product (Admin only)
   * @route POST /api/admin/products/:id/unpublish
   */
  static async unpublishProduct(req, res) {
    try {
      const productId = parseInt(req.params.id);
      const userId = req.auth?.userId;

      const product = await ProductService.updateProduct(productId, { status: 'draft' }, userId);

      logger.info('Product unpublished successfully', {
        productId: product.id,
        title: product.title,
        userId,
        requestId: req.requestId
      });

      res.status(200).json({
        data: product
      });
    } catch (error) {
      logger.error('Failed to unpublish product:', {
        error: error.message,
        productId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'PRODUCT_UNPUBLISH_ERROR',
          message: 'Failed to unpublish product'
        }
      });
    }
  }

  /**
   * Get products with filters (Public)
   * @route GET /api/products
   */
  static async getProducts(req, res) {
    try {
      const {
        q = '',
        category,
        minPrice,
        maxPrice,
        badge,
        sort = 'newest',
        page = 1,
        limit = 20
      } = req.query;

      // Map sort parameter to database fields
      const sortMap = {
        'price': 'price',
        'newest': 'created_at',
        'oldest': 'created_at',
        'name': 'title',
        'brand': 'brand'
      };

      const sortBy = sortMap[sort] || 'created_at';
      const sortOrder = sort === 'oldest' ? 'ASC' : 'DESC';

      // Build search options
      const searchOptions = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
        categoryId: category ? parseInt(category) : null,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        sustainabilityBadges: badge ? [badge] : null
      };

      const result = await ProductService.searchProducts(q, searchOptions);

      // Set pagination headers
      setPaginationHeaders(res, result.pagination);

      res.status(200).json(formatPaginatedResponse(result.products, result.pagination));
    } catch (error) {
      logger.error('Failed to fetch products:', {
        error: error.message,
        query: req.query,
        requestId: req.requestId
      });

      res.status(500).json({
        error: {
          code: 'PRODUCTS_FETCH_ERROR',
          message: 'Failed to fetch products'
        }
      });
    }
  }

  /**
   * Get product by slug (Public)
   * @route GET /api/products/:slug
   */
  static async getProductBySlug(req, res) {
    try {
      const slug = req.params.slug;
      const isAdmin = req.auth && req.auth.role === 'admin';

      const product = await ProductService.getProductBySlug(slug, false, isAdmin);

      res.status(200).json({
        data: product
      });
    } catch (error) {
      logger.error('Failed to fetch product by slug:', {
        error: error.message,
        slug: req.params.slug,
        requestId: req.requestId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'PRODUCT_FETCH_ERROR',
          message: 'Failed to fetch product'
        }
      });
    }
  }

  /**
   * Get product by ID (Admin only)
   * @route GET /api/admin/products/:id
   */
  static async getProductById(req, res) {
    try {
      const productId = parseInt(req.params.id);
      const includeDeleted = req.query.includeDeleted === 'true';

      const product = await ProductService.getProductById(productId, includeDeleted);

      res.status(200).json({
        data: product
      });
    } catch (error) {
      logger.error('Failed to fetch product by ID:', {
        error: error.message,
        productId: req.params.id,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Product not found') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'PRODUCT_FETCH_ERROR',
          message: 'Failed to fetch product'
        }
      });
    }
  }

  /**
   * Get products by category (Public)
   * @route GET /api/categories/:id/products
   */
  static async getProductsByCategory(req, res) {
    try {
      const categoryId = parseInt(req.params.id);
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      };

      const result = await ProductService.getProductsByCategory(categoryId, options);

      // Set pagination headers
      setPaginationHeaders(res, result.pagination);

      res.status(200).json(formatPaginatedResponse(result.products, result.pagination));
    } catch (error) {
      logger.error('Failed to fetch products by category:', {
        error: error.message,
        categoryId: req.params.id,
        requestId: req.requestId
      });

      res.status(500).json({
        error: {
          code: 'PRODUCTS_FETCH_ERROR',
          message: 'Failed to fetch products'
        }
      });
    }
  }
}

module.exports = ProductController;
