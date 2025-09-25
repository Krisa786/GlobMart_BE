const express = require('express');
const router = express.Router();
const { logger } = require('../middleware/errorHandler');

/**
 * OpenAPI 3.0 specification for GlobeMart API
 */
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'GlobeMart API',
    description: 'Global International E-commerce Platform API for hospitality and healthcare supplies',
    version: '1.0.0',
    contact: {
      name: 'GlobeMart API Support',
      email: 'api-support@globemart.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://api.globemart.com',
      description: 'Production server'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check and system monitoring endpoints'
    },
    {
      name: 'Authentication',
      description: 'User authentication and authorization'
    },
    {
      name: 'Categories',
      description: 'Product category management'
    },
    {
      name: 'Products',
      description: 'Product catalog management'
    },
    {
      name: 'Search',
      description: 'Product search and filtering'
    },
    {
      name: 'Admin',
      description: 'Administrative operations'
    }
  ],
  paths: {
    '/': {
      get: {
        tags: ['Health'],
        summary: 'API Status',
        description: 'Get basic API status and information',
        responses: {
          '200': {
            description: 'API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    version: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Comprehensive Health Check',
        description: 'Get detailed health status of all services including database, search, and Redis',
        responses: {
          '200': {
            description: 'All services are healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number' },
                    version: { type: 'string' },
                    environment: { type: 'string' },
                    responseTime: { type: 'number' },
                    services: {
                      type: 'object',
                      properties: {
                        database: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                            responseTime: { type: 'number' },
                            details: {
                              type: 'object',
                              properties: {
                                connected: { type: 'boolean' },
                                dialect: { type: 'string' },
                                userCount: { type: 'number' },
                                productCount: { type: 'number' },
                                categoryCount: { type: 'number' }
                              }
                            }
                          }
                        },
                        search: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                            responseTime: { type: 'number' },
                            details: {
                              type: 'object',
                              properties: {
                                engine: { type: 'string' },
                                indexName: { type: 'string' },
                                documentCount: { type: 'number' },
                                isIndexing: { type: 'boolean' }
                              }
                            }
                          }
                        },
                        redis: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                            responseTime: { type: 'number' },
                            details: {
                              type: 'object',
                              properties: {
                                connected: { type: 'boolean' },
                                host: { type: 'string' },
                                port: { type: 'number' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Some services are unhealthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/health/db': {
      get: {
        tags: ['Health'],
        summary: 'Database Health Check',
        description: 'Check database connection and basic statistics',
        responses: {
          '200': {
            description: 'Database is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    database: {
                      type: 'object',
                      properties: {
                        connected: { type: 'boolean' },
                        dialect: { type: 'string' },
                        userCount: { type: 'number' },
                        productCount: { type: 'number' },
                        categoryCount: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Database connection failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/health/search': {
      get: {
        tags: ['Health'],
        summary: 'Search Service Health Check',
        description: 'Check search service connection and statistics',
        responses: {
          '200': {
            description: 'Search service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    search: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                        engine: { type: 'string' },
                        indexName: { type: 'string' },
                        stats: {
                          type: 'object',
                          properties: {
                            numberOfDocuments: { type: 'number' },
                            isIndexing: { type: 'boolean' },
                            fieldDistribution: { type: 'object' },
                            lastUpdate: { type: 'string', format: 'date-time' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Search service is not responding',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/health/system': {
      get: {
        tags: ['Health'],
        summary: 'System Information',
        description: 'Get detailed system information including memory usage and CPU stats',
        responses: {
          '200': {
            description: 'System information retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    timestamp: { type: 'string', format: 'date-time' },
                    system: {
                      type: 'object',
                      properties: {
                        nodeVersion: { type: 'string' },
                        platform: { type: 'string' },
                        arch: { type: 'string' },
                        uptime: { type: 'number' },
                        memory: {
                          type: 'object',
                          properties: {
                            used: { type: 'number' },
                            total: { type: 'number' },
                            external: { type: 'number' }
                          }
                        },
                        cpu: {
                          type: 'object',
                          properties: {
                            loadAverage: { type: 'array', items: { type: 'number' } },
                            cpuCount: { type: 'number' }
                          }
                        }
                      }
                    },
                    environment: {
                      type: 'object',
                      properties: {
                        nodeEnv: { type: 'string' },
                        port: { type: 'number' },
                        version: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User Login',
        description: 'Authenticate user with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        tokens: {
                          type: 'object',
                          properties: {
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          },
          '429': {
            description: 'Too many login attempts',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Get Categories',
        description: 'Retrieve all active categories with optional filtering',
        parameters: [
          {
            name: 'parent_id',
            in: 'query',
            description: 'Filter by parent category ID',
            schema: { type: 'integer' }
          },
          {
            name: 'level',
            in: 'query',
            description: 'Filter by category level',
            schema: { type: 'integer', minimum: 0, maximum: 10 }
          },
          {
            name: 'include_children',
            in: 'query',
            description: 'Include child categories',
            schema: { type: 'boolean', default: false }
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
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Category' }
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'Get Products',
        description: 'Retrieve products with filtering, sorting, and pagination',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'category_id',
            in: 'query',
            description: 'Filter by category ID',
            schema: { type: 'integer' }
          },
          {
            name: 'brand',
            in: 'query',
            description: 'Filter by brand',
            schema: { type: 'string' }
          },
          {
            name: 'min_price',
            in: 'query',
            description: 'Minimum price filter',
            schema: { type: 'number', minimum: 0 }
          },
          {
            name: 'max_price',
            in: 'query',
            description: 'Maximum price filter',
            schema: { type: 'number', minimum: 0 }
          },
          {
            name: 'sort',
            in: 'query',
            description: 'Sort order',
            schema: { 
              type: 'string', 
              enum: ['price_asc', 'price_desc', 'name_asc', 'name_desc', 'newest', 'oldest'],
              default: 'newest'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Products retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' }
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Search Products',
        description: 'Search products with advanced filtering and faceting',
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search query',
            schema: { type: 'string' }
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'category',
            in: 'query',
            description: 'Filter by category slug',
            schema: { type: 'string' }
          },
          {
            name: 'badge',
            in: 'query',
            description: 'Filter by sustainability badge',
            schema: { type: 'string' }
          },
          {
            name: 'min_price',
            in: 'query',
            description: 'Minimum price filter',
            schema: { type: 'number', minimum: 0 }
          },
          {
            name: 'max_price',
            in: 'query',
            description: 'Maximum price filter',
            schema: { type: 'number', minimum: 0 }
          },
          {
            name: 'sort',
            in: 'query',
            description: 'Sort order',
            schema: { 
              type: 'string', 
              enum: ['relevance', 'price', 'newest'],
              default: 'relevance'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Search results retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        hits: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/SearchResult' }
                        },
                        total: { type: 'number' },
                        page: { type: 'number' },
                        limit: { type: 'number' },
                        totalPages: { type: 'number' },
                        hasNextPage: { type: 'boolean' },
                        hasPrevPage: { type: 'boolean' },
                        processingTimeMs: { type: 'number' },
                        query: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          isActive: { type: 'boolean' },
          emailVerified: { type: 'boolean' },
          twoFactorEnabled: { type: 'boolean' },
          roles: {
            type: 'array',
            items: { $ref: '#/components/schemas/Role' }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string' },
          permissions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Permission' }
          }
        }
      },
      Permission: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          resource: { type: 'string' },
          action: { type: 'string' }
        }
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          parentId: { type: 'integer', nullable: true },
          path: { type: 'string' },
          level: { type: 'integer' },
          isActive: { type: 'boolean' },
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/Category' }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          slug: { type: 'string' },
          sku: { type: 'string' },
          shortDesc: { type: 'string' },
          longDesc: { type: 'string' },
          brand: { type: 'string' },
          categoryId: { type: 'integer' },
          price: { type: 'number', format: 'float' },
          currency: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          sustainabilityBadges: {
            type: 'array',
            items: { type: 'string' }
          },
          meta: { type: 'object' },
          category: { $ref: '#/components/schemas/Category' },
          images: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProductImage' }
          },
          inventory: { $ref: '#/components/schemas/Inventory' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      ProductImage: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          productId: { type: 'integer' },
          s3Key: { type: 'string' },
          url: { type: 'string' },
          alt: { type: 'string' },
          position: { type: 'integer' },
          width: { type: 'integer' },
          height: { type: 'integer' },
          isPrimary: { type: 'boolean' }
        }
      },
      Inventory: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          productId: { type: 'integer' },
          quantity: { type: 'integer' },
          lowStockThreshold: { type: 'integer' },
          inStock: { type: 'boolean' },
          reservedQuantity: { type: 'integer' },
          reorderPoint: { type: 'integer' }
        }
      },
      SearchResult: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          slug: { type: 'string' },
          title: { type: 'string' },
          price: { type: 'number' },
          badges: {
            type: 'array',
            items: { type: 'string' }
          },
          inStock: { type: 'boolean' },
          imageUrl: { type: 'string' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNextPage: { type: 'boolean' },
          hasPrevPage: { type: 'boolean' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              requestId: { type: 'string' },
              stack: { type: 'string' }
            }
          }
        }
      }
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken'
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ]
};

// Serve OpenAPI specification
router.get('/openapi.json', (req, res) => {
  try {
    logger.logRequest(req, 'OpenAPI specification requested');
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(openApiSpec);
  } catch (error) {
    logger.logError(req, error, 'Failed to serve OpenAPI specification');
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate OpenAPI specification',
        requestId: req.requestId
      }
    });
  }
});

// Serve OpenAPI documentation (Swagger UI)
router.get('/docs', (req, res) => {
  try {
    logger.logRequest(req, 'API documentation requested');
    
    const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GlobeMart API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        validatorUrl: null,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        onComplete: function() {
          console.log('GlobeMart API Documentation loaded successfully');
        },
        onFailure: function(data) {
          console.error('Failed to load API documentation:', data);
        }
      });
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(swaggerHtml);
  } catch (error) {
    logger.logError(req, error, 'Failed to serve API documentation');
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate API documentation',
        requestId: req.requestId
      }
    });
  }
});

// API information endpoint
router.get('/info', (req, res) => {
  try {
    logger.logRequest(req, 'API information requested');
    
    const apiInfo = {
      success: true,
      data: {
        name: 'GlobeMart API',
        version: '1.0.0',
        description: 'Global International E-commerce Platform API',
        documentation: {
          openapi: '/api/openapi.json',
          swagger: '/api/docs'
        },
        endpoints: {
          health: '/health',
          auth: '/auth',
          categories: '/api/categories',
          products: '/api/products',
          search: '/api/search',
          admin: '/admin'
        },
        features: [
          'JWT Authentication',
          'Role-based Access Control',
          'Product Catalog Management',
          'Advanced Search with Meilisearch',
          'Image Upload to S3',
          'Rate Limiting',
          'Request Correlation',
          'Comprehensive Logging',
          'Health Monitoring'
        ],
        technologies: [
          'Node.js',
          'Express.js',
          'Sequelize ORM',
          'MySQL',
          'Meilisearch',
          'Redis',
          'AWS S3',
          'JWT',
          'Winston Logging'
        ]
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(apiInfo);
  } catch (error) {
    logger.logError(req, error, 'Failed to serve API information');
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate API information',
        requestId: req.requestId
      }
    });
  }
});

module.exports = router;
