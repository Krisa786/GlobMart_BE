const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateAccessToken, requireRoles } = require('../middleware/auth');
const { auditAdminAction } = require('../middleware/audit');
const { validate, validateQuery } = require('../validation/productSchemas');
const { createCategorySchema, updateCategorySchema } = require('../validation/productSchemas');

// Import controllers
const CategoryController = require('../controllers/CategoryController');

/**
 * @route   POST /api/admin/categories
 * @desc    Create a new category (Admin only)
 * @access  Private (Admin role required)
 * @body    { name, parent_id?, is_active? }
 */
router.post('/',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('CATEGORY_CREATE', 'CATEGORY'),
  validate(createCategorySchema),
  CategoryController.createCategory
);

/**
 * @route   PUT /api/admin/categories/:id
 * @desc    Update a category (Admin only)
 * @access  Private (Admin role required)
 * @body    { name?, parent_id?, is_active? }
 */
router.put('/:id',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('CATEGORY_UPDATE', 'CATEGORY'),
  validate(updateCategorySchema),
  CategoryController.updateCategory
);

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Delete a category (Admin only)
 * @access  Private (Admin role required)
 * @query   { force? }
 */
router.delete('/:id',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('CATEGORY_DELETE', 'CATEGORY'),
  CategoryController.deleteCategory
);

/**
 * @route   GET /api/admin/categories/:id
 * @desc    Get category by ID (Admin only)
 * @access  Private (Admin role required)
 * @query   { includeProducts? }
 */
router.get('/:id',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('CATEGORY_VIEW', 'CATEGORY'),
  CategoryController.getCategoryById
);

/**
 * @route   PUT /api/admin/categories/:id/move
 * @desc    Move category to new parent (Admin only)
 * @access  Private (Admin role required)
 * @body    { parent_id? }
 */
router.put('/:id/move',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('CATEGORY_MOVE', 'CATEGORY'),
  CategoryController.moveCategory
);

module.exports = router;
