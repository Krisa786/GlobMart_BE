'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Self-referencing association for parent-child relationship
      Category.belongsTo(models.Category, {
        as: 'parent',
        foreignKey: 'parent_id',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      Category.hasMany(models.Category, {
        as: 'children',
        foreignKey: 'parent_id',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      // Association with products
      Category.hasMany(models.Product, {
        as: 'products',
        foreignKey: 'category_id',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      });

      // Association with users (created_by, updated_by)
      Category.belongsTo(models.User, {
        as: 'creator',
        foreignKey: 'created_by',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });

      Category.belongsTo(models.User, {
        as: 'updater',
        foreignKey: 'updated_by',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }

    /**
     * Get all ancestors of this category
     */
    async getAncestors() {
      const ancestors = [];
      let current = this;

      while (current.parent_id) {
        current = await Category.findByPk(current.parent_id, {
          include: ['parent']
        });
        if (current) {
          ancestors.unshift(current);
        }
      }

      return ancestors;
    }

    /**
     * Get all descendants of this category
     */
    async getDescendants() {
      const descendants = [];

      const findChildren = async (categoryId) => {
        const children = await Category.findAll({
          where: { parent_id: categoryId }
        });

        for (const child of children) {
          descendants.push(child);
          await findChildren(child.id);
        }
      };

      await findChildren(this.id);
      return descendants;
    }

    /**
     * Check if this category is an ancestor of another category
     */
    async isAncestorOf(categoryId) {
      const descendants = await this.getDescendants();
      return descendants.some(desc => desc.id === categoryId);
    }

    /**
     * Generate breadcrumb path
     */
    async generateBreadcrumb() {
      const ancestors = await this.getAncestors();
      return [...ancestors, this];
    }
  }

  Category.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 160]
      }
    },
    slug: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 180],
        isSlug(value) {
          if (!/^[a-z0-9-]+$/.test(value)) {
            throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
          }
        }
      }
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Cached path like "/root/child/leaf" for fast breadcrumbs'
    },
    level: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10
      },
      comment: 'Depth level in hierarchy (0 = root)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
    timestamps: true,
    underscored: true,
    paranoid: false,
    indexes: [
      {
        unique: true,
        fields: ['slug']
      },
      {
        fields: ['parent_id']
      },
      {
        fields: ['path']
      },
      {
        fields: ['is_active']
      }
    ],
    hooks: {
      beforeValidate: async (category) => {
        // Generate slug if not provided
        if (!category.slug && category.name) {
          category.slug = category.name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
        }
      },
      afterCreate: async (category) => {
        // Update path and level after creation
        await category.updatePathAndLevel();
      },
      afterUpdate: async (category) => {
        // Update path and level if parent changed
        if (category.changed('parent_id')) {
          await category.updatePathAndLevel();
        }
      }
    }
  });

  // Add instance methods
  Category.prototype.updatePathAndLevel = async function() {
    let path = '';
    let level = 0;

    if (this.parent_id) {
      const parent = await Category.findByPk(this.parent_id);
      if (parent) {
        path = parent.path ? `${parent.path}/${parent.slug}` : parent.slug;
        level = parent.level + 1;
      }
    }

    await this.update({
      path,
      level
    });

    // Update all descendants
    const descendants = await this.getDescendants();
    for (const descendant of descendants) {
      await descendant.updatePathAndLevel();
    }
  };

  return Category;
};
