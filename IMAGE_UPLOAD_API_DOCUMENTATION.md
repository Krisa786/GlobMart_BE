# Image Upload API Documentation

## Overview

This document describes the image upload functionality for the GlobeMart backend API. The system supports secure image upload to S3 with automatic generation of multiple size variants (thumb, medium, large) using Sharp image processing.

## Features

- **Multi-size Image Generation**: Automatically creates thumb (200x200), medium (800x800), and large (1600x1600) variants
- **S3 Integration**: Secure upload to AWS S3 with configurable CDN support
- **Image Processing**: Uses Sharp for high-quality image processing with EXIF orientation correction
- **File Validation**: Validates file type, size, and format before processing
- **Deduplication**: Optional image hash-based deduplication
- **Admin-only Access**: All endpoints require admin authentication
- **Audit Logging**: All operations are logged for audit purposes

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# S3 Configuration for Media Upload
S3_BUCKET=your-s3-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-s3-access-key-id
S3_SECRET_ACCESS_KEY=your-s3-secret-access-key
ASSET_BASE_URL=https://your-cdn-domain.com
```

### Supported File Formats

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **WebP** (.webp)

### File Size Limits

- **Maximum file size**: 5MB per image
- **Maximum files per request**: 10 images
- **Maximum total request size**: 50MB

## API Endpoints

### 1. Get Upload Configuration

**GET** `/api/admin/products/upload-info`

Get upload limits and supported formats.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "data": {
    "maxFileSize": 5242880,
    "maxFiles": 10,
    "supportedFormats": ["jpeg", "png", "webp"],
    "supportedMimeTypes": ["image/jpeg", "image/png", "image/webp"],
    "maxFileSizeMB": 5
  }
}
```

### 2. Upload Product Images

**POST** `/api/admin/products/:id/images`

Upload one or more images for a product. Each image will be processed to create multiple size variants.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: multipart/form-data
```

**Parameters:**
- `id` (path): Product ID

**Body:**
- `images` (file[]): Array of image files (multipart form data)

**Example Request:**
```bash
curl -X POST \
  http://localhost:3001/api/admin/products/123/images \
  -H 'Authorization: Bearer <admin_jwt_token>' \
  -F 'images=@/path/to/image1.jpg' \
  -F 'images=@/path/to/image2.png'
```

**Response:**
```json
{
  "data": {
    "images": [
      {
        "id": 1,
        "product_id": 123,
        "s3_key": "products/123/images/original/image_1703123456789_abc123.jpg",
        "url": "https://your-cdn-domain.com/products/123/images/original/image_1703123456789_abc123.jpg",
        "alt": "image1.jpg - Original",
        "position": 0,
        "width": 1920,
        "height": 1080,
        "size_variant": "original",
        "file_size": 245760,
        "content_type": "image/jpeg",
        "image_hash": "a1b2c3d4e5f6...",
        "created_at": "2023-12-20T10:30:00.000Z"
      },
      {
        "id": 2,
        "product_id": 123,
        "s3_key": "products/123/images/thumb/image_1703123456789_abc123.jpg",
        "url": "https://your-cdn-domain.com/products/123/images/thumb/image_1703123456789_abc123.jpg",
        "alt": "image1.jpg - thumb",
        "position": 0,
        "width": 200,
        "height": 200,
        "size_variant": "thumb",
        "file_size": 15680,
        "content_type": "image/jpeg",
        "image_hash": "b2c3d4e5f6a1...",
        "created_at": "2023-12-20T10:30:00.000Z"
      }
    ],
    "summary": {
      "uploaded": 8,
      "errors": 0,
      "totalFiles": 2
    }
  }
}
```

**Error Responses:**

**413 - File Too Large:**
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds 5MB limit",
    "requestId": "req_123"
  }
}
```

**415 - Invalid File Type:**
```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "File validation failed: Unsupported file type: image/gif",
    "requestId": "req_123"
  }
}
```

### 3. Get Product Images

**GET** `/api/admin/products/:id/images`

Retrieve all images for a product, optionally filtered by size variant.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Parameters:**
- `id` (path): Product ID
- `size` (query, optional): Filter by size variant (`original`, `thumb`, `medium`, `large`)

**Example Request:**
```bash
curl -X GET \
  'http://localhost:3001/api/admin/products/123/images?size=thumb' \
  -H 'Authorization: Bearer <admin_jwt_token>'
```

**Response:**
```json
{
  "data": {
    "images": [
      {
        "position": 0,
        "variants": {
          "original": {
            "id": 1,
            "product_id": 123,
            "s3_key": "products/123/images/original/image_1703123456789_abc123.jpg",
            "url": "https://your-cdn-domain.com/products/123/images/original/image_1703123456789_abc123.jpg",
            "alt": "image1.jpg - Original",
            "position": 0,
            "width": 1920,
            "height": 1080,
            "size_variant": "original",
            "file_size": 245760,
            "content_type": "image/jpeg",
            "image_hash": "a1b2c3d4e5f6...",
            "created_at": "2023-12-20T10:30:00.000Z"
          },
          "thumb": {
            "id": 2,
            "product_id": 123,
            "s3_key": "products/123/images/thumb/image_1703123456789_abc123.jpg",
            "url": "https://your-cdn-domain.com/products/123/images/thumb/image_1703123456789_abc123.jpg",
            "alt": "image1.jpg - thumb",
            "position": 0,
            "width": 200,
            "height": 200,
            "size_variant": "thumb",
            "file_size": 15680,
            "content_type": "image/jpeg",
            "image_hash": "b2c3d4e5f6a1...",
            "created_at": "2023-12-20T10:30:00.000Z"
          }
        }
      }
    ],
    "total": 8,
    "productId": 123
  }
}
```

### 4. Delete Product Image

**DELETE** `/api/admin/products/:id/images/:imageId`

Delete a specific image and all its size variants.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Parameters:**
- `id` (path): Product ID
- `imageId` (path): Image ID

**Example Request:**
```bash
curl -X DELETE \
  http://localhost:3001/api/admin/products/123/images/1 \
  -H 'Authorization: Bearer <admin_jwt_token>'
```

**Response:**
```
204 No Content
```

**Error Response:**
```json
{
  "error": {
    "code": "IMAGE_NOT_FOUND",
    "message": "Image not found",
    "requestId": "req_123"
  }
}
```

### 5. Reorder Product Images

**PUT** `/api/admin/products/:id/images/reorder`

Change the order of product images.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Parameters:**
- `id` (path): Product ID

**Body:**
```json
{
  "imageIds": [3, 1, 2, 4]
}
```

**Example Request:**
```bash
curl -X PUT \
  http://localhost:3001/api/admin/products/123/images/reorder \
  -H 'Authorization: Bearer <admin_jwt_token>' \
  -H 'Content-Type: application/json' \
  -d '{"imageIds": [3, 1, 2, 4]}'
```

**Response:**
```json
{
  "data": {
    "message": "Images reordered successfully",
    "productId": 123,
    "imageCount": 4
  }
}
```

### 6. Set Primary Image

**PUT** `/api/admin/products/:id/images/:imageId/primary`

Set a specific image as the primary (cover) image for the product.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Parameters:**
- `id` (path): Product ID
- `imageId` (path): Image ID to set as primary

**Example Request:**
```bash
curl -X PUT \
  http://localhost:3001/api/admin/products/123/images/2/primary \
  -H 'Authorization: Bearer <admin_jwt_token>'
```

**Response:**
```json
{
  "data": {
    "message": "Primary image set successfully",
    "imageId": 2,
    "productId": 123
  }
}
```

## Image Processing Details

### Size Variants

| Variant | Dimensions | Fit Strategy | Use Case |
|---------|------------|--------------|----------|
| `original` | Original size | None | Full resolution display |
| `thumb` | 200x200px | Cover (crop) | Thumbnails, previews |
| `medium` | 800x800px | Inside (scale) | Product listings |
| `large` | 1600x1600px | Inside (scale) | Product detail pages |

### Image Optimization

- **JPEG**: 85% quality, progressive encoding, mozjpeg optimization
- **PNG**: 90% quality, progressive encoding, maximum compression
- **WebP**: 80% quality, effort level 6

### EXIF Handling

- Automatic rotation based on EXIF orientation data
- EXIF data is stripped from processed images for privacy and file size optimization

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `FILE_TOO_LARGE` | 413 | File exceeds 5MB limit |
| `TOO_MANY_FILES` | 413 | Too many files in request |
| `INVALID_FILE_TYPE` | 415 | Unsupported file format |
| `NO_FILES_UPLOADED` | 400 | No files in request |
| `PRODUCT_NOT_FOUND` | 404 | Product doesn't exist |
| `IMAGE_NOT_FOUND` | 404 | Image doesn't exist |
| `S3_UPLOAD_ERROR` | 502 | S3 upload failed |
| `IMAGE_PROCESSING_ERROR` | 500 | Image processing failed |

### Rollback Strategy

If image processing or S3 upload fails:
1. Any successfully uploaded S3 objects are automatically cleaned up
2. Database records are not created if S3 upload fails
3. Partial uploads are handled gracefully with detailed error reporting

## Security Considerations

1. **Admin-only Access**: All endpoints require admin authentication
2. **File Validation**: Strict file type and size validation
3. **S3 Security**: Uses IAM roles with minimal required permissions
4. **Audit Logging**: All operations are logged for security auditing
5. **Content-Type Validation**: Validates both file extension and MIME type

## Performance Considerations

1. **Streaming Upload**: Uses memory storage to avoid disk I/O
2. **Parallel Processing**: Multiple size variants are generated in parallel
3. **CDN Integration**: Supports CDN for fast image delivery
4. **Caching**: S3 objects have 1-year cache headers
5. **Database Indexing**: Optimized indexes for fast queries

## Database Schema

### ProductImage Table

```sql
CREATE TABLE product_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  s3_key VARCHAR(512) NOT NULL,
  url VARCHAR(512) NOT NULL,
  alt VARCHAR(160),
  position INT NOT NULL DEFAULT 0,
  width INT,
  height INT,
  size_variant ENUM('original', 'thumb', 'medium', 'large') NOT NULL DEFAULT 'original',
  file_size INT,
  content_type VARCHAR(100),
  image_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_position (product_id, position),
  INDEX idx_product_size (product_id, size_variant),
  INDEX idx_image_hash (image_hash)
);
```

## Migration

Run the database migration to add the new fields:

```bash
npm run db:migrate
```

## Testing

### Manual Testing

1. **Upload Test**: Upload various image formats and sizes
2. **Size Variant Test**: Verify all size variants are generated correctly
3. **Error Handling Test**: Test with invalid files, oversized files
4. **S3 Integration Test**: Verify files are uploaded to S3 correctly
5. **Database Test**: Verify image records are created with correct metadata

### Example Test Script

```bash
# Test upload
curl -X POST \
  http://localhost:3001/api/admin/products/1/images \
  -H 'Authorization: Bearer <admin_jwt_token>' \
  -F 'images=@test-image.jpg'

# Test retrieval
curl -X GET \
  http://localhost:3001/api/admin/products/1/images \
  -H 'Authorization: Bearer <admin_jwt_token>'

# Test deletion
curl -X DELETE \
  http://localhost:3001/api/admin/products/1/images/1 \
  -H 'Authorization: Bearer <admin_jwt_token>'
```

## Troubleshooting

### Common Issues

1. **S3 Configuration**: Ensure all S3 environment variables are set correctly
2. **File Permissions**: Check S3 bucket permissions and IAM roles
3. **Memory Issues**: Large images may require increased Node.js memory limit
4. **Sharp Installation**: Ensure Sharp is properly installed for your platform

### Debug Logging

Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

This will provide detailed logs of the image processing and S3 upload process.
