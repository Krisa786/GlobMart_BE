# Checkout API Documentation

## Overview

The Checkout API provides endpoints for creating checkout sessions, managing stock reservations, calculating taxes and shipping costs, and handling the complete checkout flow for both guest and authenticated users.

## Base URL

```
/api/checkout
```

## Authentication

Most endpoints support both authenticated and guest access:
- **Authenticated users**: Include JWT token in Authorization header
- **Guest users**: No authentication required

## Endpoints

### 1. Create Checkout Session

Creates a new checkout session with address capture, pricing calculation, and stock reservation.

**Endpoint:** `POST /api/checkout/session`

**Request Body:**
```json
{
  "cart_id": 123,
  "shipping_address": {
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  },
  "billing_address": {
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  },
  "shipping_method": "standard"
}
```

**Response:**
```json
{
  "data": {
    "checkout_id": 456,
    "amount": 125.99,
    "currency": "USD",
    "payment_provider_hints": {
      "primary": "stripe",
      "secondary": "paypal",
      "methods": ["card", "paypal", "apple_pay", "google_pay"]
    },
    "expires_at": "2024-12-23T15:30:00.000Z",
    "time_remaining": 15,
    "breakdown": {
      "subtotal": 100.00,
      "tax_total": 8.00,
      "shipping_total": 7.99,
      "grand_total": 125.99
    },
    "shipping": {
      "method": "standard",
      "cost": 7.99,
      "estimated_delivery": "5-7 business days"
    },
    "addresses": {
      "shipping": {
        "id": 789,
        "type": "shipping",
        "name": "John Doe",
        "phone": "+1234567890",
        "email": "john@example.com",
        "address": "123 Main St, Apt 4B, New York, NY, 10001, US",
        "country": "US"
      },
      "billing": {
        "id": 790,
        "type": "billing",
        "name": "John Doe",
        "phone": "+1234567890",
        "email": "john@example.com",
        "address": "123 Main St, Apt 4B, New York, NY, 10001, US",
        "country": "US"
      }
    }
  }
}
```

**Error Responses:**
- `400` - Validation error, insufficient stock, shipping unavailable
- `404` - Cart not found
- `500` - Internal server error

### 2. Get Checkout Session

Retrieves details of an existing checkout session.

**Endpoint:** `GET /api/checkout/session/:id`

**Response:**
```json
{
  "data": {
    "checkout_id": 456,
    "amount": 125.99,
    "currency": "USD",
    "expires_at": "2024-12-23T15:30:00.000Z",
    "time_remaining": 12,
    "status": "active",
    "breakdown": {
      "subtotal": 100.00,
      "tax_total": 8.00,
      "shipping_total": 7.99,
      "grand_total": 125.99
    },
    "shipping": {
      "method": "standard",
      "cost": 7.99
    },
    "addresses": {
      "shipping": { /* address object */ },
      "billing": { /* address object */ }
    },
    "items": [
      {
        "id": 101,
        "sku": "PROD-001",
        "name": "Premium Product",
        "quantity": 2,
        "unit_price": 50.00,
        "line_total": 100.00
      }
    ]
  }
}
```

**Error Responses:**
- `404` - Checkout session not found
- `403` - Access denied
- `410` - Checkout session expired

### 3. Release Stock Reservations

Releases stock reservations for an expired checkout session.

**Endpoint:** `POST /api/checkout/session/:id/release`

**Response:**
```json
{
  "message": "Stock reservations released successfully"
}
```

### 4. Confirm Stock Reservations

Confirms stock reservations when an order is successfully placed.

**Endpoint:** `POST /api/checkout/session/:id/confirm`

**Authentication:** Required

**Response:**
```json
{
  "message": "Stock reservations confirmed successfully"
}
```

### 5. Get Available Shipping Methods

Returns available shipping methods for a given address and cart items.

**Endpoint:** `POST /api/checkout/shipping-methods`

**Request Body:**
```json
{
  "shipping_address": {
    "country": "US",
    "state": "NY",
    "postal_code": "10001"
  },
  "cart_items": [
    {
      "id": 101,
      "sku": "PROD-001",
      "qty": 2,
      "line_subtotal": 100.00,
      "product": {
        "id": 1,
        "name": "Premium Product",
        "weight": 0.5
      }
    }
  ]
}
```

**Response:**
```json
{
  "data": [
    {
      "code": "standard",
      "name": "Standard Shipping",
      "description": "5-7 business days"
    },
    {
      "code": "express",
      "name": "Express Shipping",
      "description": "2-3 business days"
    },
    {
      "code": "overnight",
      "name": "Overnight Shipping",
      "description": "Next business day"
    }
  ]
}
```

### 6. Calculate Shipping Cost

Calculates shipping cost for specific address, items, and method.

**Endpoint:** `POST /api/checkout/shipping-cost`

**Request Body:**
```json
{
  "shipping_address": {
    "country": "US",
    "state": "NY",
    "postal_code": "10001"
  },
  "cart_items": [
    {
      "id": 101,
      "sku": "PROD-001",
      "qty": 2,
      "line_subtotal": 100.00,
      "product": {
        "id": 1,
        "name": "Premium Product",
        "weight": 0.5
      }
    }
  ],
  "shipping_method": "express",
  "currency": "USD"
}
```

**Response:**
```json
{
  "data": {
    "shipping_cost": 12.99,
    "currency": "USD",
    "shipping_method": "express",
    "shipping_zone": "domestic",
    "weight": 1.0,
    "value": 100.00,
    "breakdown": {
      "base_rate": 12.99,
      "weight_rate": 2.5,
      "value_rate": 3.0,
      "final_cost": 12.99
    },
    "estimated_delivery": "2-3 business days",
    "is_available": true
  }
}
```

### 7. Calculate Tax

Calculates tax for specific address and items.

**Endpoint:** `POST /api/checkout/tax`

**Request Body:**
```json
{
  "shipping_address": {
    "country": "US",
    "state": "NY",
    "postal_code": "10001"
  },
  "cart_items": [
    {
      "id": 101,
      "sku": "PROD-001",
      "qty": 2,
      "line_subtotal": 100.00
    }
  ],
  "currency": "USD",
  "customer_info": {
    "type": "individual",
    "tax_id": null
  }
}
```

**Response:**
```json
{
  "data": {
    "total_tax": 8.00,
    "currency": "USD",
    "tax_breakdown": {
      "federal_tax_rate": 0.00,
      "state_tax_rate": 0.08,
      "total_tax_rate": 0.08
    },
    "item_taxes": [
      {
        "cart_item_id": 101,
        "sku": "PROD-001",
        "subtotal": 100.00,
        "tax_rate": 0.00,
        "state_tax_rate": 0.08,
        "tax_amount": 8.00
      }
    ]
  }
}
```

## Business Rules

### Stock Reservation
- Stock is reserved for 15 minutes when checkout session is created
- Reserved stock is released automatically when session expires
- Stock can be manually released or confirmed via API endpoints
- Only one active reservation per cart item per checkout session

### Address Validation
- Postal codes are validated based on country format
- International shipping requires postal codes
- Addresses are stored for logged-in users, created fresh for guests

### Tax Calculation
- Tax rates vary by country and state/province
- Business customers with tax ID may be tax exempt
- Tax is calculated on item subtotals

### Shipping Calculation
- Shipping costs based on weight, value, and destination zone
- Free shipping available for orders above threshold
- Some shipping methods not available for certain destinations

### Session Expiry
- Checkout sessions expire after 15 minutes
- Expired sessions cannot be used for payment
- Background job cleans up expired sessions every 5 minutes

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `CART_NOT_FOUND` | Cart not found or access denied |
| `EMPTY_CART` | Cart is empty |
| `INSUFFICIENT_STOCK` | Not enough stock available |
| `SHIPPING_UNAVAILABLE` | Shipping method not available |
| `INVALID_ADDRESS` | Address validation failed |
| `INVALID_POSTAL_CODE` | Postal code format invalid |
| `CHECKOUT_NOT_FOUND` | Checkout session not found |
| `ACCESS_DENIED` | Access denied to checkout session |
| `CHECKOUT_EXPIRED` | Checkout session has expired |
| `RESERVATION_RELEASE_ERROR` | Failed to release reservations |
| `RESERVATION_CONFIRM_ERROR` | Failed to confirm reservations |

## Rate Limiting

- Public endpoints: 100 requests per 15 minutes per IP
- Authenticated endpoints: 200 requests per 15 minutes per user
- Admin endpoints: 500 requests per 15 minutes per user

## Example Usage

### Complete Checkout Flow

1. **Create checkout session:**
```bash
curl -X POST /api/checkout/session \
  -H "Content-Type: application/json" \
  -d '{
    "cart_id": 123,
    "shipping_address": { /* address data */ },
    "billing_address": { /* address data */ },
    "shipping_method": "standard"
  }'
```

2. **Get session details:**
```bash
curl -X GET /api/checkout/session/456
```

3. **Process payment** (handled by payment service)

4. **Confirm reservations:**
```bash
curl -X POST /api/checkout/session/456/confirm \
  -H "Authorization: Bearer <jwt_token>"
```

### Guest Checkout

Guest users can create checkout sessions without authentication. The system will:
- Create temporary addresses
- Reserve stock for 15 minutes
- Return payment provider hints
- Allow payment processing

### Authenticated User Checkout

Authenticated users get additional benefits:
- Addresses are saved for future use
- Cart ownership is verified
- Access to order history
- Faster checkout process

## Integration Notes

- Checkout sessions are designed to work with payment providers (Stripe, Razorpay, PayPal)
- Stock reservations prevent overselling during checkout process
- Background cleanup ensures expired reservations don't block inventory
- All monetary values are returned as numbers with 2 decimal precision
- Currency codes follow ISO 4217 standard
