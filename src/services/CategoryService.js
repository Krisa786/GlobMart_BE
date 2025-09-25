const { Category, Product } = require('../database/models');
const { Op } = require('sequelize');

class CategoryService {
  /**
   * Generate a unique slug from a name
   */
  static async generateSlug(name, excludeId = null) {
    const baseSlug = name
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

      const existing = await Category.findOne({ where: whereClause });
      if (!existing) {
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Create a new category
   */
  static async createCategory(categoryData, userId = null) {
    const { name, parent_id, is_active = true } = categoryData;

    // Validate parent category exists if provided
    if (parent_id) {
      const parent = await Category.findByPk(parent_id);
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    // Generate unique slug
    const slug = await this.generateSlug(name);

    // Create category
    const category = await Category.create({
      name,
      slug,
      parent_id,
      is_active,
      created_by: userId,
      updated_by: userId
    });

    // Update path and level
    await category.updatePathAndLevel();

    return category;
  }

  /**
   * Update a category
   */
  static async updateCategory(categoryId, updateData, userId = null) {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const { name, parent_id, is_active } = updateData;

    // Validate parent category exists if provided
    if (parent_id && parent_id !== category.parent_id) {
      if (parent_id === categoryId) {
        throw new Error('Category cannot be its own parent');
      }

      const parent = await Category.findByPk(parent_id);
      if (!parent) {
        throw new Error('Parent category not found');
      }

      // Check for circular reference
      const isAncestor = await parent.isAncestorOf(categoryId);
      if (isAncestor) {
        throw new Error('Cannot set parent: would create circular reference');
      }
    }

    // Generate new slug if name changed
    let slug = category.slug;
    if (name && name !== category.name) {
      slug = await this.generateSlug(name, categoryId);
    }

    // Update category
    await category.update({
      name: name || category.name,
      slug,
      parent_id: parent_id !== undefined ? parent_id : category.parent_id,
      is_active: is_active !== undefined ? is_active : category.is_active,
      updated_by: userId
    });

    // Update path and level if parent changed
    if (parent_id !== undefined && parent_id !== category.parent_id) {
      await category.updatePathAndLevel();
    }

    return category;
  }

  /**
   * Delete a category
   */
  static async deleteCategory(categoryId, force = false) {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Check if category has children
    const children = await category.getDescendants();
    if (children.length > 0 && !force) {
      throw new Error('Cannot delete category with children. Use force=true to delete with children.');
    }

    // Check if category has products
    const productCount = await Product.count({
      where: { category_id: categoryId }
    });
    if (productCount > 0 && !force) {
      throw new Error('Cannot delete category with products. Use force=true to delete with products.');
    }

    // Delete children first if force is true
    if (force && children.length > 0) {
      for (const child of children) {
        await this.deleteCategory(child.id, true);
      }
    }

    // Delete the category
    await category.destroy();

    return true;
  }

  /**
   * Get category by ID with full details
   */
  static async getCategoryById(categoryId, includeProducts = false) {
    const include = [];

    if (includeProducts) {
      include.push({
        model: Product,
        as: 'products',
        where: {
          status: 'published',
          deleted_at: null
        },
        required: false
      });
    }

    const category = await Category.findByPk(categoryId, {
      include: [
        { model: Category, as: 'parent' },
        { model: Category, as: 'children' },
        ...include
      ]
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(slug, includeProducts = false) {
    const include = [];

    if (includeProducts) {
      include.push({
        model: Product,
        as: 'products',
        where: {
          status: 'published',
          deleted_at: null
        },
        required: false
      });
    }

    const category = await Category.findOne({
      where: { slug, is_active: true },
      include: [
        { model: Category, as: 'parent' },
        { model: Category, as: 'children' },
        ...include
      ]
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return category;
  }

  /**
   * Get all categories in tree structure
   */
  static async getCategoryTree(includeInactive = false) {
    const whereClause = {};
    if (!includeInactive) {
      whereClause.is_active = true;
    }

    const categories = await Category.findAll({
      where: whereClause,
      include: [
        { model: Category, as: 'parent' },
        { model: Category, as: 'children' }
      ],
      order: [['level', 'ASC'], ['name', 'ASC']]
    });

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories = [];

    // First pass: create map
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category.toJSON(), children: [] });
    });

    // Second pass: build tree
    categories.forEach(category => {
      const categoryData = categoryMap.get(category.id);
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          parent.children.push(categoryData);
        }
      } else {
        rootCategories.push(categoryData);
      }
    });

    return rootCategories;
  }

  /**
   * Get categories with product counts
   */
  static async getCategoriesWithProductCounts(includeInactive = false) {
    const whereClause = {};
    if (!includeInactive) {
      whereClause.is_active = true;
    }

    const categories = await Category.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: 'products',
          where: {
            status: 'published',
            deleted_at: null
          },
          required: false,
          attributes: []
        }
      ],
      attributes: {
        include: [
          [Category.sequelize.fn('COUNT', Category.sequelize.col('products.id')), 'product_count']
        ]
      },
      group: ['Category.id'],
      order: [['level', 'ASC'], ['name', 'ASC']]
    });

    return categories;
  }

  /**
   * Get breadcrumb for a category
   */
  static async getCategoryBreadcrumb(categoryId) {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    return await category.generateBreadcrumb();
  }

  /**
   * Search categories by name
   */
  static async searchCategories(query, limit = 10) {
    const categories = await Category.findAll({
      where: {
        name: {
          [Op.like]: `%${query}%`
        },
        is_active: true
      },
      include: [
        { model: Category, as: 'parent' }
      ],
      limit,
      order: [['name', 'ASC']]
    });

    return categories;
  }

  /**
   * Get all descendants of a category
   */
  static async getCategoryDescendants(categoryId) {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    return await category.getDescendants();
  }

  /**
   * Get all ancestors of a category
   */
  static async getCategoryAncestors(categoryId) {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    return await category.getAncestors();
  }

  /**
   * Move category to new parent
   */
  static async moveCategory(categoryId, newParentId, userId = null) {
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Validate new parent
    if (newParentId) {
      if (newParentId === categoryId) {
        throw new Error('Category cannot be its own parent');
      }

      const newParent = await Category.findByPk(newParentId);
      if (!newParent) {
        throw new Error('New parent category not found');
      }

      // Check for circular reference
      const isAncestor = await newParent.isAncestorOf(categoryId);
      if (isAncestor) {
        throw new Error('Cannot move: would create circular reference');
      }
    }

    // Update parent
    await category.update({
      parent_id: newParentId,
      updated_by: userId
    });

    // Update path and level
    await category.updatePathAndLevel();

    return category;
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(categoryId, options = {}) {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = options;

    // First verify the category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const offset = (page - 1) * limit;

    const products = await Product.findAndCountAll({
      where: {
        category_id: categoryId,
        status: 'published',
        deleted_at: null
      },
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'slug']
        }
      ]
    });

    return products;
  }
}

module.exports = CategoryService;
