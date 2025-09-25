# API Usage Examples - Category & Product Services

This document provides examples of how to use the CategoryService and ProductService classes in your API controllers.

## Category Service Examples

### 1. Create a New Category
```javascript
const CategoryService = require('../services/CategoryService');

// Create a root category
const hospitalityCategory = await CategoryService.createCategory({
  name: 'Hospitality Supplies',
  is_active: true
}, userId);

// Create a subcategory
const hotelAmenities = await CategoryService.createCategory({
  name: 'Hotel Amenities',
  parent_id: hospitalityCategory.id,
  is_active: true
}, userId);
```

### 2. Get Category Tree
```javascript
// Get all categories in tree structure
const categoryTree = await CategoryService.getCategoryTree();

// Get categories with product counts
const categoriesWithCounts = await CategoryService.getCategoriesWithProductCounts();
```

### 3. Update Category
```javascript
// Update category name and parent
const updatedCategory = await CategoryService.updateCategory(categoryId, {
  name: 'Updated Category Name',
  parent_id: newParentId
}, userId);
```

### 4. Search Categories
```javascript
// Search categories by name
const searchResults = await CategoryService.searchCategories('hotel', 10);
```

## Product Service Examples

### 1. Create a New Product
```javascript
const ProductService = require('../services/ProductService');

const newProduct = await ProductService.createProduct({
  title: 'Premium Cotton Bath Towels',
  category_id: hotelAmenities.id,
  short_desc: 'Luxurious 100% cotton bath towels',
  long_desc: 'These premium cotton bath towels are made from 100% Egyptian cotton...',
  brand: 'Luxury Linens',
  price: 25.99,
  currency: 'USD',
  status: 'published',
  sustainability_badges: ['Organic Cotton', 'Fair Trade'],
  meta: {
    material: '100% Egyptian Cotton',
    weight: '600 GSM',
    dimensions: '30" x 54"'
  }
}, userId);
```

### 2. Search Products
```javascript
// Basic search
const searchResults = await ProductService.searchProducts('cotton towels', {
  page: 1,
  limit: 20,
  sortBy: 'price',
  sortOrder: 'ASC'
});

// Advanced search with filters
const filteredResults = await ProductService.searchProducts('bath', {
  page: 1,
  limit: 20,
  categoryId: hotelAmenities.id,
  minPrice: 20.00,
  maxPrice: 50.00,
  brand: 'Luxury',
  inStock: true,
  sustainabilityBadges: ['Organic Cotton']
});
```

### 3. Get Products by Category
```javascript
// Get products in a specific category
const categoryProducts = await ProductService.getProductsByCategory(hotelAmenities.id, {
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'DESC'
});
```

### 4. Update Product Stock
```javascript
// Update stock quantity
const inventory = await ProductService.updateProductStock(
  productId,
  100, // new quantity
  'manual_adjust',
  'Initial stock setup',
  userId
);

// Get stock history
const stockHistory = await ProductService.getProductStockHistory(productId, 50);
```

### 5. Get Product Details
```javascript
// Get product by ID with full details
const product = await ProductService.getProductById(productId);

// Get product by slug (for public URLs)
const product = await ProductService.getProductBySlug('premium-cotton-bath-towels');
```

## API Controller Examples

### Category Controller
```javascript
const CategoryService = require('../services/CategoryService');

class CategoryController {
  // GET /api/categories
  async getAllCategories(req, res) {
    try {
      const categories = await CategoryService.getCategoryTree();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/categories/:id
  async getCategoryById(req, res) {
    try {
      const category = await CategoryService.getCategoryById(req.params.id, true);
      res.json({ success: true, data: category });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  // POST /api/categories
  async createCategory(req, res) {
    try {
      const category = await CategoryService.createCategory(req.body, req.user.id);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // PUT /api/categories/:id
  async updateCategory(req, res) {
    try {
      const category = await CategoryService.updateCategory(
        req.params.id,
        req.body,
        req.user.id
      );
      res.json({ success: true, data: category });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // DELETE /api/categories/:id
  async deleteCategory(req, res) {
    try {
      await CategoryService.deleteCategory(req.params.id, req.body.force);
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
```

### Product Controller
```javascript
const ProductService = require('../services/ProductService');

class ProductController {
  // GET /api/products/search
  async searchProducts(req, res) {
    try {
      const { q, page, limit, category, minPrice, maxPrice, brand, inStock } = req.query;
      const results = await ProductService.searchProducts(q, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        categoryId: category,
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        brand,
        inStock: inStock === 'true'
      });
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // GET /api/products/:slug
  async getProductBySlug(req, res) {
    try {
      const product = await ProductService.getProductBySlug(req.params.slug);
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  // GET /api/categories/:id/products
  async getProductsByCategory(req, res) {
    try {
      const { page, limit, sortBy, sortOrder } = req.query;
      const results = await ProductService.getProductsByCategory(req.params.id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy: sortBy || 'created_at',
        sortOrder: sortOrder || 'DESC'
      });
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST /api/products
  async createProduct(req, res) {
    try {
      const product = await ProductService.createProduct(req.body, req.user.id);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // PUT /api/products/:id/stock
  async updateProductStock(req, res) {
    try {
      const { quantity, reason, note } = req.body;
      const inventory = await ProductService.updateProductStock(
        req.params.id,
        quantity,
        reason,
        note,
        req.user.id
      );
      res.json({ success: true, data: inventory });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
```

## Error Handling Examples

### Service Layer Error Handling
```javascript
try {
  const category = await CategoryService.createCategory({
    name: 'Test Category',
    parent_id: 999 // Non-existent parent
  });
} catch (error) {
  if (error.message === 'Parent category not found') {
    // Handle specific error
    console.log('Invalid parent category ID');
  } else {
    // Handle other errors
    console.log('Unexpected error:', error.message);
  }
}
```

### API Response Format
```javascript
// Success response
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Hospitality Supplies",
    "slug": "hospitality-supplies",
    "parent_id": null,
    "path": "",
    "level": 0,
    "is_active": true,
    "created_at": "2024-12-20T10:00:00.000Z",
    "updated_at": "2024-12-20T10:00:00.000Z"
  }
}

// Error response
{
  "success": false,
  "error": "Category not found"
}
```

## Database Query Examples

### Using Models Directly
```javascript
const { Product, Category, Inventory } = require('../database/models');

// Find products with low stock
const lowStockProducts = await Product.findAll({
  where: { status: 'published' },
  include: [{
    model: Inventory,
    as: 'inventory',
    where: {
      quantity: { [Op.lte]: Inventory.sequelize.col('low_stock_threshold') }
    }
  }]
});

// Get category with all descendants
const category = await Category.findByPk(categoryId);
const descendants = await category.getDescendants();

// Get product with primary image
const product = await Product.findByPk(productId, {
  include: [{
    model: ProductImage,
    as: 'images',
    where: { position: 0 },
    required: false
  }]
});
```

This implementation provides a solid foundation for building the product catalog API endpoints in the next sprint.
