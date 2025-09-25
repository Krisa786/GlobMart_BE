/**
 * OpenAPI 3.0 specification for Product & Category CRUD APIs
 * This file generates the OpenAPI JSON for frontend integration
 */

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'GlobeMart Product & Category API',
    description: 'REST API for managing products and categories in the GlobeMart e-commerce platform',
    version: '1.0.0',
    contact: {
      name: 'GlobeMart API Support',
      email: 'api-support@globemart.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development server'
    },
    {
      url: 'https://api.globemart.com/api',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code'
              },
              message: {
                type: 'string',
                description: 'Error message'
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: {
                      type: 'string'
                    },
                    message: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        }
      },
      Category: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Category ID'
          },
          name: {
            type: 'string',
            description: 'Category name'
          },
          slug: {
            type: 'string',
            description: 'Category slug'
          },
          parent_id: {
            type: 'integer',
            nullable: true,
            description: 'Parent category ID'
          },
          path: {
            type: 'string',
            description: 'Category path'
          },
          level: {
            type: 'integer',
            description: 'Category level in hierarchy'
          },
          is_active: {
            type: 'boolean',
            description: 'Category active status'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            description: 'Product ID'
          },
          title: {
            type: 'string',
            description: 'Product title'
          },
          slug: {
            type: 'string',
            description: 'Product slug'
          },
          sku: {
            type: 'string',
            description: 'Product SKU'
          },
          short_desc: {
            type: 'string',
            nullable: true,
            description: 'Short description'
          },
          long_desc: {
            type: 'string',
            nullable: true,
            description: 'Long description'
          },
          brand: {
            type: 'string',
            nullable: true,
            description: 'Product brand'
          },
          category_id: {
            type: 'integer',
            description: 'Category ID'
          },
          price: {
            type: 'number',
            format: 'decimal',
            description: 'Product price'
          },
          currency: {
            type: 'string',
            enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'],
            description: 'Currency code'
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            description: 'Product status'
          },
          sustainability_badges: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['FSC', 'FairTrade', 'Recycled', 'Organic', 'BPA-Free']
            },
            description: 'Sustainability badges'
          },
          in_stock: {
            type: 'boolean',
            description: 'Whether the product is in stock'
          },
          inventory: {
            type: 'object',
            properties: {
              quantity: {
                type: 'integer',
                minimum: 0,
                description: 'Current stock quantity'
              },
              low_stock: {
                type: 'boolean',
                description: 'Whether the product is in low stock'
              }
            },
            description: 'Inventory information'
          },
          specs: {
            type: 'object',
            description: 'Product specifications from metadata'
          },
          meta: {
            type: 'object',
            nullable: true,
            description: 'Additional metadata'
          },
          created_at: {
            type: 'string',
            format: 'date-time'
          },
          updated_at: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            description: 'Total number of records'
          },
          page: {
            type: 'integer',
            description: 'Current page'
          },
          limit: {
            type: 'integer',
            description: 'Records per page'
          },
          totalPages: {
            type: 'integer',
            description: 'Total number of pages'
          },
          hasNextPage: {
            type: 'boolean',
            description: 'Whether there is a next page'
          },
          hasPrevPage: {
            type: 'boolean',
            description: 'Whether there is a previous page'
          }
        }
      },
      CreateCategoryRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160,
            description: 'Category name'
          },
          parent_id: {
            type: 'integer',
            minimum: 1,
            description: 'Parent category ID'
          },
          is_active: {
            type: 'boolean',
            default: true,
            description: 'Category active status'
          }
        }
      },
      UpdateCategoryRequest: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160,
            description: 'Category name'
          },
          parent_id: {
            type: 'integer',
            minimum: 1,
            nullable: true,
            description: 'Parent category ID'
          },
          is_active: {
            type: 'boolean',
            description: 'Category active status'
          }
        }
      },
      CreateProductRequest: {
        type: 'object',
        required: ['title', 'category_id', 'price'],
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 220,
            description: 'Product title'
          },
          category_id: {
            type: 'integer',
            minimum: 1,
            description: 'Category ID'
          },
          short_desc: {
            type: 'string',
            maxLength: 1000,
            description: 'Short description'
          },
          long_desc: {
            type: 'string',
            maxLength: 10000,
            description: 'Long description'
          },
          brand: {
            type: 'string',
            maxLength: 120,
            description: 'Product brand'
          },
          price: {
            type: 'number',
            format: 'decimal',
            minimum: 0,
            description: 'Product price'
          },
          currency: {
            type: 'string',
            enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'],
            default: 'USD',
            description: 'Currency code'
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
            description: 'Product status'
          },
          sustainability_badges: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['FSC', 'FairTrade', 'Recycled', 'Organic', 'BPA-Free']
            },
            maxItems: 10,
            description: 'Sustainability badges'
          },
          meta: {
            type: 'object',
            description: 'Additional metadata'
          }
        }
      },
      UpdateProductRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 220,
            description: 'Product title'
          },
          category_id: {
            type: 'integer',
            minimum: 1,
            description: 'Category ID'
          },
          short_desc: {
            type: 'string',
            maxLength: 1000,
            description: 'Short description'
          },
          long_desc: {
            type: 'string',
            maxLength: 10000,
            description: 'Long description'
          },
          brand: {
            type: 'string',
            maxLength: 120,
            description: 'Product brand'
          },
          price: {
            type: 'number',
            format: 'decimal',
            minimum: 0,
            description: 'Product price'
          },
          currency: {
            type: 'string',
            enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'],
            description: 'Currency code'
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            description: 'Product status'
          },
          sustainability_badges: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['FSC', 'FairTrade', 'Recycled', 'Organic', 'BPA-Free']
            },
            maxItems: 10,
            description: 'Sustainability badges'
          },
          meta: {
            type: 'object',
            description: 'Additional metadata'
          }
        }
      }
    }
  },
  paths: {
    // Public Category Routes
    '/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Get categories tree or flat list',
        description: 'Retrieve categories in tree structure or flat list format',
        parameters: [
          {
            name: 'flat',
            in: 'query',
            description: 'Return flat list instead of tree structure',
            schema: {
              type: 'boolean',
              default: false
            }
          }
        ],
        responses: {
          '200': {
            description: 'Categories retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Category'
                      }
                    }
                  }
                }
              }
            }
          },
          '422': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/categories/{slug}': {
      get: {
        tags: ['Categories'],
        summary: 'Get category by slug',
        description: 'Retrieve a category by its slug',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            description: 'Category slug',
            schema: {
              type: 'string'
            }
          },
          {
            name: 'includeProducts',
            in: 'query',
            description: 'Include products in response',
            schema: {
              type: 'boolean',
              default: false
            }
          }
        ],
        responses: {
          '200': {
            description: 'Category retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Category'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    // Public Product Routes
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'Get products with filters',
        description: 'Retrieve products with optional filtering, sorting, and pagination',
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search query',
            schema: {
              type: 'string',
              maxLength: 100
            }
          },
          {
            name: 'category',
            in: 'query',
            description: 'Filter by category ID',
            schema: {
              type: 'integer',
              minimum: 1
            }
          },
          {
            name: 'minPrice',
            in: 'query',
            description: 'Minimum price filter',
            schema: {
              type: 'number',
              format: 'decimal',
              minimum: 0
            }
          },
          {
            name: 'maxPrice',
            in: 'query',
            description: 'Maximum price filter',
            schema: {
              type: 'number',
              format: 'decimal',
              minimum: 0
            }
          },
          {
            name: 'badge',
            in: 'query',
            description: 'Filter by sustainability badge',
            schema: {
              type: 'string',
              maxLength: 50
            }
          },
          {
            name: 'sort',
            in: 'query',
            description: 'Sort order',
            schema: {
              type: 'string',
              enum: ['price', 'newest', 'oldest', 'name', 'brand'],
              default: 'newest'
            }
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Records per page',
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20
            }
          }
        ],
        responses: {
          '200': {
            description: 'Products retrieved successfully',
            headers: {
              'X-Total-Count': {
                description: 'Total number of products',
                schema: {
                  type: 'integer'
                }
              },
              'X-Page': {
                description: 'Current page',
                schema: {
                  type: 'integer'
                }
              },
              'X-Limit': {
                description: 'Records per page',
                schema: {
                  type: 'integer'
                }
              }
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Product'
                      }
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        pagination: {
                          $ref: '#/components/schemas/PaginationMeta'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '422': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/products/{slug}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by slug',
        description: 'Retrieve a product by its slug',
        parameters: [
          {
            name: 'slug',
            in: 'path',
            required: true,
            description: 'Product slug',
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Product retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Product'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    // Admin Category Routes
    '/admin/categories': {
      post: {
        tags: ['Admin - Categories'],
        summary: 'Create a new category',
        description: 'Create a new category (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateCategoryRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Category created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Category'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - Admin role required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          '422': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/admin/categories/{id}': {
      put: {
        tags: ['Admin - Categories'],
        summary: 'Update a category',
        description: 'Update an existing category (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Category ID',
            schema: {
              type: 'integer'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateCategoryRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Category updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Category'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Admin - Categories'],
        summary: 'Delete a category',
        description: 'Delete a category (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Category ID',
            schema: {
              type: 'integer'
            }
          },
          {
            name: 'force',
            in: 'query',
            description: 'Force delete even if category has children or products',
            schema: {
              type: 'boolean',
              default: false
            }
          }
        ],
        responses: {
          '204': {
            description: 'Category deleted successfully'
          },
          '409': {
            description: 'Conflict - Category has dependencies',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    // Admin Product Routes
    '/admin/products': {
      post: {
        tags: ['Admin - Products'],
        summary: 'Create a new product',
        description: 'Create a new product (Admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateProductRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Product created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Product'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/admin/products/{id}': {
      put: {
        tags: ['Admin - Products'],
        summary: 'Update a product',
        description: 'Update an existing product (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: {
              type: 'integer'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateProductRequest'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Product updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Product'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Admin - Products'],
        summary: 'Delete a product',
        description: 'Delete a product (Admin only - soft delete)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: {
              type: 'integer'
            }
          }
        ],
        responses: {
          '204': {
            description: 'Product deleted successfully'
          },
          '404': {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/admin/products/{id}/publish': {
      post: {
        tags: ['Admin - Products'],
        summary: 'Publish a product',
        description: 'Publish a product (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: {
              type: 'integer'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Product published successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Product'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/admin/products/{id}/unpublish': {
      post: {
        tags: ['Admin - Products'],
        summary: 'Unpublish a product',
        description: 'Unpublish a product (Admin only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: {
              type: 'integer'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Product unpublished successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/Product'
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    }
  }
};

module.exports = openApiSpec;
