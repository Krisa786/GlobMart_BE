const express = require('express');
const router = express.Router();

// Import middleware
const { authenticateAccessToken, requireRoles } = require('../middleware/auth');
const { auditAdminAction } = require('../middleware/audit');
const { validate, validateQuery } = require('../validation/productSchemas');
const { createProductSchema, updateProductSchema, adjustInventorySchema, inventoryQuerySchema } = require('../validation/productSchemas');
const { validateSustainabilityBadges } = require('../middleware/sustainabilityValidation');

// Import controllers
const ProductController = require('../controllers/ProductController');
const ProductImageController = require('../controllers/ProductImageController');
const InventoryController = require('../controllers/InventoryController');

// Import upload middleware
const { uploadMultiple, validateUploadedFiles, getUploadInfo } = require('../middleware/upload');

/**
 * @route   POST /api/admin/products
 * @desc    Create a new product (Admin only)
 * @access  Private (Admin role required)
 * @body    { title, category_id, short_desc?, long_desc?, brand?, price, currency?, status?, sustainability_badges?, meta? }
 */
router.post('/',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_CREATE', 'PRODUCT'),
  validate(createProductSchema),
  validateSustainabilityBadges,
  ProductController.createProduct
);

/**
 * @route   PUT /api/admin/products/:id
 * @desc    Update a product (Admin only)
 * @access  Private (Admin role required)
 * @body    { title?, category_id?, short_desc?, long_desc?, brand?, price?, currency?, status?, sustainability_badges?, meta? }
 */
router.put('/:id',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_UPDATE', 'PRODUCT'),
  validate(updateProductSchema),
  validateSustainabilityBadges,
  ProductController.updateProduct
);

/**
 * @route   DELETE /api/admin/products/:id
 * @desc    Delete a product (Admin only - soft delete)
 * @access  Private (Admin role required)
 */
router.delete('/:id',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_DELETE', 'PRODUCT'),
  ProductController.deleteProduct
);

/**
 * @route   POST /api/admin/products/:id/publish
 * @desc    Publish a product (Admin only)
 * @access  Private (Admin role required)
 */
router.post('/:id/publish',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_PUBLISH', 'PRODUCT'),
  ProductController.publishProduct
);

/**
 * @route   POST /api/admin/products/:id/unpublish
 * @desc    Unpublish a product (Admin only)
 * @access  Private (Admin role required)
 */
router.post('/:id/unpublish',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_UNPUBLISH', 'PRODUCT'),
  ProductController.unpublishProduct
);

/**
 * @route   GET /api/admin/products/:id
 * @desc    Get product by ID (Admin only)
 * @access  Private (Admin role required)
 * @query   { includeDeleted? }
 */
router.get('/:id',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_VIEW', 'PRODUCT'),
  ProductController.getProductById
);

// ===== PRODUCT IMAGE ROUTES =====

/**
 * @route   GET /api/admin/products/upload-info
 * @desc    Get upload configuration and limits (Admin only)
 * @access  Private (Admin role required)
 */
router.get('/upload-info',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  getUploadInfo
);

/**
 * @route   POST /api/admin/products/:id/images
 * @desc    Upload product images with multiple size variants (Admin only)
 * @access  Private (Admin role required)
 * @body    { images: File[] } - Multipart form data with image files
 */
router.post('/:id/images',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_IMAGE_UPLOAD', 'PRODUCT'),
  uploadMultiple('images', 10),
  validateUploadedFiles,
  ProductImageController.uploadImages
);

/**
 * @route   GET /api/admin/products/:id/images
 * @desc    Get product images (Admin only)
 * @access  Private (Admin role required)
 * @query   { size?: 'original'|'thumb'|'medium'|'large' }
 */
router.get('/:id/images',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_IMAGES_VIEW', 'PRODUCT'),
  ProductImageController.getProductImages
);

/**
 * @route   DELETE /api/admin/products/:id/images/:imageId
 * @desc    Delete a product image (Admin only)
 * @access  Private (Admin role required)
 */
router.delete('/:id/images/:imageId',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_IMAGE_DELETE', 'PRODUCT'),
  ProductImageController.deleteImage
);

/**
 * @route   PUT /api/admin/products/:id/images/reorder
 * @desc    Reorder product images (Admin only)
 * @access  Private (Admin role required)
 * @body    { imageIds: number[] } - Array of image IDs in desired order
 */
router.put('/:id/images/reorder',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_IMAGES_REORDER', 'PRODUCT'),
  ProductImageController.reorderImages
);

/**
 * @route   PUT /api/admin/products/:id/images/:imageId/primary
 * @desc    Set primary image for product (Admin only)
 * @access  Private (Admin role required)
 */
router.put('/:id/images/:imageId/primary',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('PRODUCT_PRIMARY_IMAGE_SET', 'PRODUCT'),
  ProductImageController.setPrimaryImage
);

// ===== INVENTORY ROUTES =====

/**
 * @route   PUT /api/admin/products/:id/inventory
 * @desc    Adjust product inventory stock (Admin only)
 * @access  Private (Admin role required)
 * @body    { quantity: number, note?: string }
 */
router.put('/:id/inventory',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('INVENTORY_ADJUST', 'PRODUCT'),
  validate(adjustInventorySchema),
  InventoryController.adjustStock
);

/**
 * @route   GET /api/admin/products/:id/inventory
 * @desc    Get product inventory details (Admin only)
 * @access  Private (Admin role required)
 */
router.get('/:id/inventory',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('INVENTORY_VIEW', 'PRODUCT'),
  InventoryController.getInventory
);

/**
 * @route   GET /api/admin/products/:id/inventory/history
 * @desc    Get product stock history (Admin only)
 * @access  Private (Admin role required)
 * @query   { limit?: number, page?: number }
 */
router.get('/:id/inventory/history',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('INVENTORY_HISTORY_VIEW', 'PRODUCT'),
  validateQuery(inventoryQuerySchema),
  InventoryController.getStockHistory
);

/**
 * @route   GET /api/admin/inventory/low-stock
 * @desc    Get low stock products (Admin only)
 * @access  Private (Admin role required)
 * @query   { limit?: number, page?: number }
 */
router.get('/inventory/low-stock',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('INVENTORY_LOW_STOCK_VIEW', 'PRODUCT'),
  validateQuery(inventoryQuerySchema),
  InventoryController.getLowStockProducts
);

/**
 * @route   GET /api/admin/inventory/out-of-stock
 * @desc    Get out of stock products (Admin only)
 * @access  Private (Admin role required)
 * @query   { limit?: number, page?: number }
 */
router.get('/inventory/out-of-stock',
  authenticateAccessToken,
  requireRoles('ADMIN'),
  auditAdminAction('INVENTORY_OUT_OF_STOCK_VIEW', 'PRODUCT'),
  validateQuery(inventoryQuerySchema),
  InventoryController.getOutOfStockProducts
);

module.exports = router;
