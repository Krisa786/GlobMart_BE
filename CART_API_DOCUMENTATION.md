# Cart Service API Documentation

## Overview

The Cart Service provides comprehensive cart management functionality for both guest and authenticated users. It supports cart creation, item management, price recalculation, and cart merging operations.

## Features

- **Guest Cart Support**: Anonymous users can create and manage carts using cart tokens
- **Authenticated Cart Support**: Logged-in users have persistent carts
- **Cart Merging**: Seamless merging of guest carts when users log in
- **Inventory Validation**: Real-time stock checking before adding items
- **Price Recalculation**: Automatic price updates based on current product prices
- **Cart Persistence**: Carts persist for 30-60 days (configurable)
- **Abandoned Cart Cleanup**: Automatic cleanup of old abandoned carts

## Database Schema

### Carts Table
```sql
CREATE TABLE carts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  cart_token CHAR(36) NULL UNIQUE,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  shipping_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('active','converted','abandoned') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_user (user_id)
);
```

### Cart Items Table
```sql
CREATE TABLE cart_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  cart_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  sku VARCHAR(64) NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  line_subtotal DECIMAL(12,2) NOT NULL,
  line_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uniq_cart_sku (cart_id, sku),
  INDEX idx_cart (cart_id)
);
```

## API Endpoints

### 1. Create or Retrieve Cart

**POST** `/api/cart`

Creates a new cart or retrieves an existing one.

#### Request Body
```json
{
  "cart_token": "uuid-string", // Optional: existing cart token
  "currency": "INR"            // Optional: currency code (default: INR)
}
```

#### Response
```json
{
  "data": {
    "id": 1,
    "user_id": null,
    "cart_token": "550e8400-e29b-41d4-a716-446655440000",
    "currency": "INR",
    "subtotal": 0.00,
    "discount_total": 0.00,
    "tax_total": 0.00,
    "shipping_total": 0.00,
    "grand_total": 0.00,
    "status": "active",
    "created_at": "2024-12-22T10:00:00.000Z",
    "updated_at": "2024-12-22T10:00:00.000Z"
  }
}
```

### 2. Get Current Cart

**GET** `/api/cart`

Retrieves the current cart with all items.

#### Query Parameters
- `cart_token` (string, optional): Cart token for guest users
- `include_items` (boolean, optional): Include cart items in response

#### Response
```json
{
  "data": {
    "id": 1,
    "user_id": 123,
    "cart_token": "550e8400-e29b-41d4-a716-446655440000",
    "currency": "INR",
    "subtotal": 1500.00,
    "discount_total": 0.00,
    "tax_total": 150.00,
    "shipping_total": 100.00,
    "grand_total": 1750.00,
    "status": "active",
    "created_at": "2024-12-22T10:00:00.000Z",
    "updated_at": "2024-12-22T10:30:00.000Z",
    "items": [
      {
        "id": 1,
        "cart_id": 1,
        "product_id": 5,
        "sku": "PROD-001",
        "qty": 2,
        "unit_price": 750.00,
        "line_subtotal": 1500.00,
        "line_discount": 0.00,
        "line_tax": 150.00,
        "line_total": 1650.00,
        "product": {
          "id": 5,
          "title": "Sample Product",
          "sku": "PROD-001",
          "price": 750.00,
          "inventory": {
            "quantity": 10
          }
        }
      }
    ]
  }
}
```

### 3. Add Item to Cart

**POST** `/api/cart/items`

Adds a product to the cart.

#### Request Body
```json
{
  "sku": "PROD-001",
  "qty": 2
}
```

#### Query Parameters
- `cart_token` (string, optional): Cart token for guest users

#### Response
```json
{
  "data": {
    "id": 1,
    "cart_id": 1,
    "product_id": 5,
    "sku": "PROD-001",
    "qty": 2,
    "unit_price": 750.00,
    "line_subtotal": 1500.00,
    "line_discount": 0.00,
    "line_tax": 0.00,
    "line_total": 1500.00,
    "created_at": "2024-12-22T10:30:00.000Z",
    "updated_at": "2024-12-22T10:30:00.000Z"
  }
}
```

### 4. Update Cart Item

**PATCH** `/api/cart/items/:id`

Updates the quantity of a cart item.

#### URL Parameters
- `id` (integer): Cart item ID

#### Request Body
```json
{
  "qty": 3
}
```

#### Query Parameters
- `cart_token` (string, optional): Cart token for guest users

#### Response
```json
{
  "data": {
    "id": 1,
    "cart_id": 1,
    "product_id": 5,
    "sku": "PROD-001",
    "qty": 3,
    "unit_price": 750.00,
    "line_subtotal": 2250.00,
    "line_discount": 0.00,
    "line_tax": 0.00,
    "line_total": 2250.00,
    "created_at": "2024-12-22T10:30:00.000Z",
    "updated_at": "2024-12-22T10:35:00.000Z"
  }
}
```

### 5. Remove Item from Cart

**DELETE** `/api/cart/items/:id`

Removes an item from the cart.

#### URL Parameters
- `id` (integer): Cart item ID

#### Query Parameters
- `cart_token` (string, optional): Cart token for guest users

#### Response
- **204 No Content** (successful deletion)

### 6. Merge Guest Cart

**POST** `/api/cart/merge`

Merges a guest cart with the authenticated user's cart.

#### Authentication
- **Required**: Bearer token

#### Request Body
```json
{
  "guest_cart_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response
```json
{
  "data": {
    "id": 2,
    "user_id": 123,
    "cart_token": "660f9511-f3ac-52e5-b827-557766551111",
    "currency": "INR",
    "subtotal": 3000.00,
    "discount_total": 0.00,
    "tax_total": 300.00,
    "shipping_total": 100.00,
    "grand_total": 3400.00,
    "status": "active",
    "items": [
      // Merged items from both carts
    ]
  }
}
```

### 7. Reprice Cart

**POST** `/api/cart/reprice`

Updates all cart items with current product prices.

#### Query Parameters
- `cart_token` (string, optional): Cart token for guest users

#### Response
```json
{
  "data": {
    "id": 1,
    "user_id": 123,
    "cart_token": "550e8400-e29b-41d4-a716-446655440000",
    "currency": "INR",
    "subtotal": 1600.00, // Updated prices
    "discount_total": 0.00,
    "tax_total": 160.00,
    "shipping_total": 100.00,
    "grand_total": 1860.00,
    "status": "active",
    "updated_at": "2024-12-22T11:00:00.000Z"
  }
}
```

### 8. Clear Cart

**DELETE** `/api/cart`

Removes all items from the cart.

#### Query Parameters
- `cart_token` (string, optional): Cart token for guest users

#### Response
- **204 No Content** (successful clearing)

### 9. Mark Cart as Converted

**POST** `/api/cart/convert`

Marks the cart as converted (order placed).

#### Query Parameters
- `cart_token` (string, optional): Cart token for guest users

#### Response
```json
{
  "message": "Cart marked as converted"
}
```

## Error Responses

### Validation Error (400)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "qty",
        "message": "\"qty\" must be a positive number",
        "value": -1
      }
    ]
  }
}
```

### Product Not Found (404)
```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found"
  }
}
```

### Insufficient Stock (400)
```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock. Available: 5"
  }
}
```

### Cart Not Found (404)
```json
{
  "error": {
    "code": "CART_NOT_FOUND",
    "message": "Cart not found"
  }
}
```

### Unauthorized (401)
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

## Business Rules

### Cart Management
1. **Guest Carts**: Created with unique cart tokens, persist for 60 days
2. **User Carts**: Associated with user accounts, persist indefinitely
3. **Cart Merging**: When a user logs in, their guest cart is merged with their user cart
4. **Duplicate Items**: Adding the same SKU updates the quantity instead of creating duplicates

### Inventory Validation
1. **Stock Checking**: All add/update operations validate against current inventory
2. **Real-time Prices**: Cart items are repriced with current product prices
3. **Product Availability**: Only published products can be added to cart

### Cart States
1. **Active**: Cart is being used for shopping
2. **Converted**: Cart has been converted to an order
3. **Abandoned**: Cart is older than 60 days and marked as abandoned

## Usage Examples

### Guest User Flow
```javascript
// 1. Create cart
const createResponse = await fetch('/api/cart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency: 'INR' })
});
const { data: cart } = await createResponse.json();

// 2. Add items
await fetch('/api/cart/items?cart_token=' + cart.cart_token, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sku: 'PROD-001', qty: 2 })
});

// 3. Get cart with items
const cartResponse = await fetch('/api/cart?cart_token=' + cart.cart_token);
const { data: fullCart } = await cartResponse.json();
```

### Authenticated User Flow
```javascript
// 1. Add items (cart is automatically created/retrieved)
await fetch('/api/cart/items', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ sku: 'PROD-001', qty: 2 })
});

// 2. Get cart
const cartResponse = await fetch('/api/cart', {
  headers: { 'Authorization': 'Bearer ' + token }
});
const { data: cart } = await cartResponse.json();
```

### Cart Merging Flow
```javascript
// 1. User logs in with existing guest cart
const mergeResponse = await fetch('/api/cart/merge', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ 
    guest_cart_token: 'guest-cart-token' 
  })
});
const { data: mergedCart } = await mergeResponse.json();
```

## Rate Limiting

All cart endpoints are rate-limited:
- **Public endpoints**: 100 requests per minute per IP
- **Authenticated endpoints**: 200 requests per minute per user

## Security Considerations

1. **Cart Token Validation**: Cart tokens are UUIDs and validated on each request
2. **User Authorization**: Users can only access their own carts
3. **Input Validation**: All inputs are validated using Joi schemas
4. **SQL Injection Protection**: Using Sequelize ORM with parameterized queries
5. **Rate Limiting**: Protection against abuse and DoS attacks

## Monitoring and Logging

All cart operations are logged with:
- Request ID for correlation
- User ID (if authenticated)
- Cart ID and operation type
- Error details for failed operations

## Cleanup and Maintenance

### Abandoned Cart Cleanup
- **Schedule**: Daily at 2 AM (configurable)
- **Criteria**: Carts older than 60 days with 'active' status
- **Action**: Mark as 'abandoned' status

### Performance Optimization
- **Database Indexes**: Optimized for cart lookups by user_id and cart_token
- **Caching**: Consider Redis caching for frequently accessed carts
- **Connection Pooling**: MySQL connection pooling for better performance
