const CategoryService = require('../services/CategoryService');
const { logger } = require('../middleware/errorHandler');
const { formatPaginatedResponse, setPaginationHeaders } = require('../middleware/pagination');

class CategoryController {
  /**
   * Create a new category (Admin only)
   * @route POST /api/admin/categories
   */
  static async createCategory(req, res) {
    try {
      const categoryData = req.body;
      const userId = req.auth?.userId;

      const category = await CategoryService.createCategory(categoryData, userId);

      logger.info('Category created successfully', {
        categoryId: category.id,
        name: category.name,
        userId,
        requestId: req.requestId
      });

      res.status(201).json({
        data: category
      });
    } catch (error) {
      logger.error('Failed to create category:', {
        error: error.message,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      if (error.message === 'Parent category not found') {
        return res.status(404).json({
          error: {
            code: 'PARENT_CATEGORY_NOT_FOUND',
            message: 'Parent category not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'CATEGORY_CREATE_ERROR',
          message: 'Failed to create category'
        }
      });
    }
  }

  /**
   * Update a category (Admin only)
   * @route PUT /api/admin/categories/:id
   */
  static async updateCategory(req, res) {
    try {
      const categoryId = parseInt(req.params.id);
      const updateData = req.body;
      const userId = req.auth?.userId;

      const category = await CategoryService.updateCategory(categoryId, updateData, userId);

      logger.info('Category updated successfully', {
        categoryId: category.id,
        name: category.name,
        userId,
        requestId: req.requestId
      });

      res.status(200).json({
        data: category
      });
    } catch (error) {
      logger.error('Failed to update category:', {
        error: error.message,
        categoryId: req.params.id,
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

      if (error.message === 'Parent category not found') {
        return res.status(404).json({
          error: {
            code: 'PARENT_CATEGORY_NOT_FOUND',
            message: 'Parent category not found'
          }
        });
      }

      if (error.message === 'Category cannot be its own parent') {
        return res.status(400).json({
          error: {
            code: 'INVALID_PARENT',
            message: 'Category cannot be its own parent'
          }
        });
      }

      if (error.message.includes('circular reference')) {
        return res.status(400).json({
          error: {
            code: 'CIRCULAR_REFERENCE',
            message: 'Cannot set parent: would create circular reference'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'CATEGORY_UPDATE_ERROR',
          message: 'Failed to update category'
        }
      });
    }
  }

  /**
   * Delete a category (Admin only)
   * @route DELETE /api/admin/categories/:id
   */
  static async deleteCategory(req, res) {
    try {
      const categoryId = parseInt(req.params.id);
      const force = req.query.force === 'true';

      await CategoryService.deleteCategory(categoryId, force);

      logger.info('Category deleted successfully', {
        categoryId,
        force,
        requestId: req.requestId,
        userId: req.auth?.userId
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete category:', {
        error: error.message,
        categoryId: req.params.id,
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

      if (error.message.includes('children') || error.message.includes('products')) {
        return res.status(409).json({
          error: {
            code: 'CATEGORY_HAS_DEPENDENCIES',
            message: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'CATEGORY_DELETE_ERROR',
          message: 'Failed to delete category'
        }
      });
    }
  }

  /**
   * Get categories tree or flat list (Public)
   * @route GET /api/categories
   */
  static async getCategories(req, res) {
    try {
      const flat = req.query.flat === 'true';

      if (flat) {
        // Return flat list of categories
        const categories = await CategoryService.getCategoriesWithProductCounts();
        res.status(200).json({
          data: categories
        });
      } else {
        // Return tree structure
        const categoryTree = await CategoryService.getCategoryTree();
        res.status(200).json({
          data: categoryTree
        });
      }
    } catch (error) {
      logger.error('Failed to fetch categories:', {
        error: error.message,
        query: req.query,
        requestId: req.requestId
      });

      res.status(500).json({
        error: {
          code: 'CATEGORIES_FETCH_ERROR',
          message: 'Failed to fetch categories'
        }
      });
    }
  }

  /**
   * Get category by slug (Public)
   * @route GET /api/categories/:slug
   */
  static async getCategoryBySlug(req, res) {
    try {
      const slug = req.params.slug;
      const includeProducts = req.query.includeProducts === 'true';

      const category = await CategoryService.getCategoryBySlug(slug, includeProducts);

      res.status(200).json({
        data: category
      });
    } catch (error) {
      logger.error('Failed to fetch category by slug:', {
        error: error.message,
        slug: req.params.slug,
        requestId: req.requestId
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
          code: 'CATEGORY_FETCH_ERROR',
          message: 'Failed to fetch category'
        }
      });
    }
  }

  /**
   * Get category by ID (Admin only)
   * @route GET /api/admin/categories/:id
   */
  static async getCategoryById(req, res) {
    try {
      const categoryId = parseInt(req.params.id);
      const includeProducts = req.query.includeProducts === 'true';

      const category = await CategoryService.getCategoryById(categoryId, includeProducts);

      res.status(200).json({
        data: category
      });
    } catch (error) {
      logger.error('Failed to fetch category by ID:', {
        error: error.message,
        categoryId: req.params.id,
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
          code: 'CATEGORY_FETCH_ERROR',
          message: 'Failed to fetch category'
        }
      });
    }
  }

  /**
   * Get category breadcrumb (Public)
   * @route GET /api/categories/:id/breadcrumb
   */
  static async getCategoryBreadcrumb(req, res) {
    try {
      const categoryId = parseInt(req.params.id);

      const breadcrumb = await CategoryService.getCategoryBreadcrumb(categoryId);

      res.status(200).json({
        data: breadcrumb
      });
    } catch (error) {
      logger.error('Failed to fetch category breadcrumb:', {
        error: error.message,
        categoryId: req.params.id,
        requestId: req.requestId
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
          code: 'CATEGORY_BREADCRUMB_ERROR',
          message: 'Failed to fetch category breadcrumb'
        }
      });
    }
  }

  /**
   * Search categories (Public)
   * @route GET /api/categories/search
   */
  static async searchCategories(req, res) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          error: {
            code: 'SEARCH_QUERY_REQUIRED',
            message: 'Search query is required'
          }
        });
      }

      const categories = await CategoryService.searchCategories(q, parseInt(limit));

      res.status(200).json({
        data: categories
      });
    } catch (error) {
      logger.error('Failed to search categories:', {
        error: error.message,
        query: req.query,
        requestId: req.requestId
      });

      res.status(500).json({
        error: {
          code: 'CATEGORY_SEARCH_ERROR',
          message: 'Failed to search categories'
        }
      });
    }
  }

  /**
   * Move category to new parent (Admin only)
   * @route PUT /api/admin/categories/:id/move
   */
  static async moveCategory(req, res) {
    try {
      const categoryId = parseInt(req.params.id);
      const { parent_id } = req.body;
      const userId = req.auth?.userId;

      const category = await CategoryService.moveCategory(categoryId, parent_id, userId);

      logger.info('Category moved successfully', {
        categoryId: category.id,
        newParentId: parent_id,
        userId,
        requestId: req.requestId
      });

      res.status(200).json({
        data: category
      });
    } catch (error) {
      logger.error('Failed to move category:', {
        error: error.message,
        categoryId: req.params.id,
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

      if (error.message === 'New parent category not found') {
        return res.status(404).json({
          error: {
            code: 'PARENT_CATEGORY_NOT_FOUND',
            message: 'New parent category not found'
          }
        });
      }

      if (error.message === 'Category cannot be its own parent') {
        return res.status(400).json({
          error: {
            code: 'INVALID_PARENT',
            message: 'Category cannot be its own parent'
          }
        });
      }

      if (error.message.includes('circular reference')) {
        return res.status(400).json({
          error: {
            code: 'CIRCULAR_REFERENCE',
            message: 'Cannot move: would create circular reference'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'CATEGORY_MOVE_ERROR',
          message: 'Failed to move category'
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
      const categoryId = req.params.id;
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

      const products = await CategoryService.getProductsByCategory(categoryId, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });

      res.status(200).json({
        data: products.rows,
        meta: {
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: products.count,
            totalPages: Math.ceil(products.count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Failed to fetch products by category:', {
        error: error.message,
        categoryId: req.params.id,
        requestId: req.requestId
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
          code: 'PRODUCTS_FETCH_ERROR',
          message: 'Failed to fetch products'
        }
      });
    }
  }
}

module.exports = CategoryController;
