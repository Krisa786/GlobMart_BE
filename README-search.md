# Search Index & Sync Documentation

This document provides comprehensive information about the search functionality implemented in GlobeMart Backend, including setup, configuration, and operational procedures.

## Overview

The search system provides fast, intelligent product search with filtering capabilities using Meilisearch as the search engine. It includes:

- **Real-time indexing** of products when they are created, updated, or deleted
- **Background job processing** using BullMQ and Redis
- **Full-text search** with synonyms and highlighting
- **Advanced filtering** by category, price, badges, and stock status
- **Admin management** endpoints for monitoring and maintenance

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Product CRUD  │───▶│  IndexerService │───▶│  QueueService   │
│   Operations    │    │                 │    │   (BullMQ)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  SearchService  │    │     Redis       │
                       │  (Meilisearch)  │    │   (Queue)       │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Search API     │
                       │  /api/search/*  │
                       └─────────────────┘
```

## Components

### 1. SearchService
- **Purpose**: Adapter pattern for search engines (currently Meilisearch)
- **Features**: 
  - Search with filters and pagination
  - Product indexing and removal
  - Index configuration and health checks
  - Synonym management

### 2. IndexerService
- **Purpose**: Manages synchronization between database and search index
- **Features**:
  - Single product indexing
  - Full reindexing with progress tracking
  - Batch processing
  - Index validation

### 3. QueueService
- **Purpose**: Background job processing for indexing operations
- **Features**:
  - Job queuing with retry logic
  - Queue monitoring and management
  - Failed job handling
  - Queue pause/resume

## Setup & Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Search Engine Configuration
SEARCH_ENGINE=meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your-meilisearch-master-key
MEILISEARCH_INDEX_PRODUCTS=products

# Redis Configuration for Queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 2. Install Dependencies

The following packages are required (already added to package.json):

```bash
npm install meilisearch bullmq ioredis
```

### 3. Start Required Services

#### Meilisearch
```bash
# Using Docker
docker run -it --rm -p 7700:7700 -e MEILI_MASTER_KEY=your-master-key getmeili/meilisearch:latest

# Or install locally
curl -L https://install.meilisearch.com | sh
./meilisearch --master-key=your-master-key
```

#### Redis
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
# Follow Redis installation guide for your OS
```

### 4. Initialize Search Index

The search index is automatically created and configured when the application starts. You can also manually trigger a full reindex:

```bash
# Full reindex
npm run reindex

# Dry run (see what would be indexed)
npm run reindex:dry
```

## API Endpoints

### Public Search API

#### Search Products
```http
GET /api/search/products?q=eco straws&category=drinkware&minPrice=10&maxPrice=100&sort=price&page=1&limit=20
```

**Parameters:**
- `q` (string): Search query
- `category` (string): Category slug filter
- `badge` (string): Sustainability badge filter
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sort` (string): Sort order (`relevance`, `price`, `newest`, `oldest`)
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 123,
        "slug": "eco-straws",
        "title": "Eco Straws (Pack of 50)",
        "price": 199.00,
        "currency": "INR",
        "badges": ["FSC", "Recycled"],
        "in_stock": true,
        "image_url": "https://example.com/image.jpg",
        "_formatted": {
          "title": "Eco <mark>Straws</mark> (Pack of 50)"
        }
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "meta": {
      "query": "eco straws",
      "processingTimeMs": 12,
      "searchEngine": "meilisearch"
    }
  }
}
```

#### Get Search Suggestions
```http
GET /api/search/suggestions?q=eco
```

#### Get Search Filters
```http
GET /api/search/filters?q=kitchen&category=kitchen
```

#### Search Health Check
```http
GET /api/search/health
```

### Admin Search API

All admin endpoints require authentication and admin/product_manager role.

#### Get Search Status
```http
GET /api/admin/search/status
```

#### Trigger Full Reindex
```http
POST /api/admin/search/reindex
Content-Type: application/json

{
  "dryRun": false,
  "clearFirst": true,
  "batchSize": 100
}
```

#### Index Specific Product
```http
POST /api/admin/search/index-product
Content-Type: application/json

{
  "productId": 123,
  "force": false
}
```

#### Remove Product from Index
```http
DELETE /api/admin/search/index-product/123
```

#### Get Queue Statistics
```http
GET /api/admin/search/queue
```

#### Get Failed Jobs
```http
GET /api/admin/search/failed-jobs?queue=index&limit=10
```

#### Retry Failed Jobs
```http
POST /api/admin/search/retry-jobs
Content-Type: application/json

{
  "queue": "index",
  "jobIds": ["job-id-1", "job-id-2"]
}
```

#### Clear Completed Jobs
```http
DELETE /api/admin/search/queue/index/completed
```

#### Pause Queue
```http
POST /api/admin/search/queue/index/pause
```

#### Resume Queue
```http
POST /api/admin/search/queue/index/resume
```

#### Clear Search Index
```http
DELETE /api/admin/search/index
```

## Operational Procedures

### 1. Initial Setup

1. **Start Services**: Ensure Meilisearch and Redis are running
2. **Configure Environment**: Set all required environment variables
3. **Start Application**: The search service will auto-initialize
4. **Initial Reindex**: Run `npm run reindex` to index existing products

### 2. Monitoring

#### Health Checks
```bash
# Check search service health
curl http://localhost:3001/api/search/health

# Check admin status
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/admin/search/status
```

#### Queue Monitoring
```bash
# Check queue stats
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/admin/search/queue

# Check failed jobs
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/admin/search/failed-jobs
```

### 3. Maintenance

#### Daily Operations
- Monitor queue statistics for failed jobs
- Check search service health
- Review indexing performance

#### Weekly Operations
- Run full reindex to ensure data consistency
- Clear completed jobs to free up memory
- Review and update synonyms if needed

#### Troubleshooting

**Search not working:**
1. Check Meilisearch service status
2. Verify API key configuration
3. Check Redis connection
4. Review application logs

**Index out of sync:**
1. Compare database vs index counts: `GET /api/admin/search/status`
2. Run full reindex: `POST /api/admin/search/reindex`
3. Check for failed jobs and retry if needed

**Performance issues:**
1. Check queue backlog
2. Monitor Redis memory usage
3. Consider increasing batch size for reindexing
4. Review Meilisearch performance metrics

### 4. CLI Commands

```bash
# Full reindex with default settings
npm run reindex

# Dry run to see what would be indexed
npm run reindex:dry

# Custom batch size
node scripts/reindex-products.js --batch-size=50

# Don't clear index first
node scripts/reindex-products.js --no-clear

# Show help
node scripts/reindex-products.js --help
```

## Index Schema

The search index uses the following document structure:

```json
{
  "id": 123,
  "slug": "eco-straws",
  "title": "Eco Straws (Pack of 50)",
  "short_desc": "Biodegradable paper straws...",
  "category_path": ["home", "kitchen", "drinkware"],
  "category_slug": "drinkware",
  "brand": "Greengo",
  "price": 199.00,
  "currency": "INR",
  "badges": ["FSC", "Recycled"],
  "in_stock": true,
  "image_url": "https://example.com/image.jpg",
  "updated_at": "2025-09-18T12:00:00Z"
}
```

### Searchable Attributes
- `title`
- `short_desc`
- `brand`
- `badges`

### Filterable Attributes
- `category_slug`
- `badges`
- `price`
- `in_stock`

### Sortable Attributes
- `price`
- `updated_at`

## Synonyms

The system includes predefined synonyms for better search results:

- `eco` ↔ `sustainable` ↔ `green` ↔ `environmentally friendly`
- `hair dryer` ↔ `blow dryer`
- `towel` ↔ `bath towel` ↔ `hand towel`

Synonyms can be updated in the `SearchService.configureSynonyms()` method.

## Performance Considerations

### Indexing Performance
- **Batch Size**: Default 100 products per batch
- **Concurrency**: 5 concurrent workers for queue processing
- **Retry Logic**: Exponential backoff with 3 attempts

### Search Performance
- **Response Time**: Target < 300ms p95
- **Pagination**: Default 20 results per page, max 100
- **Caching**: Meilisearch handles internal caching

### Memory Usage
- **Redis**: Stores job data and queue state
- **Meilisearch**: Indexes product data in memory
- **Cleanup**: Completed jobs are automatically removed

## Security Considerations

- **API Keys**: Meilisearch master key should be kept secure
- **Access Control**: Admin endpoints require authentication and proper roles
- **Rate Limiting**: Search endpoints are rate-limited
- **Input Validation**: All search parameters are validated

## Future Enhancements

1. **Elasticsearch Support**: Adapter pattern allows easy switching
2. **Search Analytics**: Track popular searches and performance
3. **Auto-complete**: Enhanced suggestion system
4. **Faceted Search**: Dynamic filter generation
5. **Search Personalization**: User-specific search results
6. **Multi-language Support**: Internationalization for search

## Troubleshooting Guide

### Common Issues

**1. "Search service temporarily unavailable"**
- Check Meilisearch service status
- Verify network connectivity
- Check API key configuration

**2. "Failed to index product"**
- Check product data validity
- Verify database connectivity
- Review queue processing logs

**3. "Queue processing stopped"**
- Check Redis connection
- Restart queue workers
- Review failed jobs

**4. "Index out of sync"**
- Run full reindex
- Check for data inconsistencies
- Verify product status changes

### Log Analysis

Search-related logs can be found in:
- Application logs: Search service operations
- Queue logs: Background job processing
- Meilisearch logs: Search engine operations

### Support

For additional support:
1. Check application logs for detailed error messages
2. Verify all services are running and accessible
3. Test with minimal configuration
4. Review this documentation for configuration details
