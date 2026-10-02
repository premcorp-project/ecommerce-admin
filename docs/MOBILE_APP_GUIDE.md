# OttimoDirect Mobile App — Complete Integration Guide

> **Purpose:** This document provides everything needed to build a mobile app (React Native, Flutter, etc.) for the OttimoDirect platform. It covers authentication, product browsing, cart, checkout, pricing, delivery, orders, and real-time notifications.

**Backend Base URL:** `http://localhost:3001/api/v1` (dev) | `https://chemibuild-ecommerce-api-production.up.railway.app/api/v1` (prod)

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Authentication](#2-authentication)
3. [User Types & Permissions](#3-user-types--permissions)
4. [Homepage Data](#4-homepage-data)
5. [Product Listing & Search](#5-product-listing--search)
6. [Product Detail](#6-product-detail)
7. [Pricing System](#7-pricing-system)
8. [Cart](#8-cart)
9. [Wishlist](#9-wishlist)
10. [Checkout Flow](#10-checkout-flow)
11. [Delivery System](#11-delivery-system)
12. [Orders](#12-orders)
13. [User Account](#13-user-account)
14. [Reviews](#14-reviews)
15. [Support Tickets](#15-support-tickets)
16. [Real-time Notifications (SSE)](#16-real-time-notifications-sse)
17. [Push Notifications](#17-push-notifications)
18. [Platform Config](#18-platform-config)
19. [Error Handling](#19-error-handling)
20. [TypeScript Types Reference](#20-typescript-types-reference)
21. [API Quick Reference Table](#21-api-quick-reference-table)

---

## 1. Platform Overview

OttimoDirect is a **B2B/B2C chemical products ecommerce platform** (adhesives, resins, coatings, solvents). Key business rules:

| Rule                           | Detail                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| All products are variant-based | No simple products. Every add-to-cart requires a `variantId` |
| Price lives on the variant     | Product has no `price` field. Use `variant.effectivePrice`   |
| Two user tiers                 | Normal customers + Bulk buyers (get tiered pricing)          |
| Two payment methods            | Stripe (card) + COD (cash on delivery)                       |
| Currency from config           | Never hardcode currency — read from `GET /config`            |
| Weight-based delivery          | Delivery fee calculated by cart weight + destination city    |
| Coupons                        | Normal/guest users only — bulk buyers cannot use coupons     |

### Response Envelope

All API responses follow this format:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "Human-readable error", "errors": [...] }
```

Access data as: `response.data.data` (when using axios).

---

## 2. Authentication

### 2.1 Register

```
POST /auth/register

Body: { "name": "Jane Doe", "email": "jane@example.com", "password": "SecurePass123!" }

Response 200:
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "customer" },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 2.2 Login

```
POST /auth/login

Body: { "email": "jane@example.com", "password": "SecurePass123!" }

Response 200:
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "customer" },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 2.3 Google OAuth

```
GET /auth/google
```

Redirect user to this URL. Backend handles OAuth flow and returns user + token via callback.

### 2.4 Token Refresh

```
POST /auth/refresh-token

Headers: Cookie (httpOnly refresh token sent automatically with withCredentials)

Response 200:
{ "success": true, "data": { "accessToken": "new-token..." } }
```

### 2.5 Logout

```
POST /auth/logout
```

Clears refresh token cookie server-side.

### 2.6 Token Storage (Mobile)

For mobile apps:

- Store `accessToken` securely (Keychain on iOS, EncryptedSharedPreferences on Android)
- Attach to every request: `Authorization: Bearer <accessToken>`
- On 401: call `/auth/refresh-token` → if fails, redirect to login
- Never store tokens in plain AsyncStorage/SharedPreferences

---

## 3. User Types & Permissions

| User Type  | `role`     | `isBulkBuyer` | Features                                                   |
| ---------- | ---------- | ------------- | ---------------------------------------------------------- |
| Guest      | —          | —             | Browse, cart (session-based), checkout (COD/Stripe)        |
| Customer   | `customer` | `false`       | Full access + wishlist + order history + reviews + support |
| Bulk Buyer | `customer` | `true`        | Everything above + tiered bulk pricing, NO coupons         |
| Admin      | `admin`    | —             | Not for mobile app — admin dashboard only                  |

### How to detect bulk buyer:

```json
// In login/register response or GET /users/profile
{
  "user": {
    "_id": "...",
    "role": "customer",
    "isBulkBuyer": true, // ← this flag
    "isCodEnabled": true // ← COD access
  }
}
```

---

## 4. Homepage Data

Fetch these 3 endpoints in parallel:

| Data              | Endpoint                                        | Cache Duration |
| ----------------- | ----------------------------------------------- | -------------- |
| Featured products | `GET /catalog/products?isFeatured=true&limit=8` | 60s            |
| Category tree     | `GET /catalog/categories`                       | 5min           |
| Banners           | `GET /banners`                                  | 60s            |

### Featured Products Response

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "64f1...",
        "name": "Industrial Epoxy Resin",
        "slug": "industrial-epoxy-resin",
        "description": "<p>High-strength two-part epoxy...</p>",
        "category": { "_id": "...", "name": "Adhesives", "slug": "adhesives" },
        "images": [{ "url": "https://cdn.../img1.jpg", "publicId": "img1" }],
        "isFeatured": true,
        "status": "active",
        "variantAttributes": [
          { "key": "Volume", "values": ["500ml", "1L", "5L"] }
        ],
        "averageRating": 4.7,
        "reviewCount": 23,
        "minPrice": 12.99,
        "minOriginalPrice": 15.99,
        "inventory": 150,
        "available": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 8,
      "totalPages": 1,
      "currentPage": 1,
      "perPage": 8,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### Categories Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Adhesives",
      "slug": "adhesives",
      "image": { "url": "https://cdn.../cat1.jpg", "publicId": "cat1" },
      "parent": null,
      "children": [
        { "_id": "...", "name": "Epoxy", "slug": "epoxy", "children": [] }
      ]
    }
  ]
}
```

### Banners Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Summer Sale",
      "imageUrl": "https://cdn.../banner1.jpg",
      "linkUrl": "/products?category=adhesives",
      "isActive": true,
      "order": 1
    }
  ]
}
```

---

## 5. Product Listing & Search

### Endpoint

```
GET /catalog/products
```

### Query Parameters

| Parameter         | Type    | Example                      | Description                                                   |
| ----------------- | ------- | ---------------------------- | ------------------------------------------------------------- |
| `page`            | number  | `1`                          | Page number (default: 1)                                      |
| `limit`           | number  | `20`                         | Items per page (default: 20)                                  |
| `category`        | string  | `adhesives`                  | Filter by category ID or slug                                 |
| `search`          | string  | `epoxy resin`                | Full-text search                                              |
| `sortBy`          | string  | `price_asc`                  | `newest`, `price_asc`, `price_desc`, `name_asc`, `popularity` |
| `minPrice`        | number  | `20`                         | Minimum price filter                                          |
| `maxPrice`        | number  | `150`                        | Maximum price filter                                          |
| `inStock`         | boolean | `true`                       | Only show available products                                  |
| `featured`        | boolean | `true`                       | Only featured products                                        |
| `tags`            | string  | `tag-slug`                   | Filter by tag slug                                            |
| `attributes[Key]` | string  | `attributes[Color]=Red,Blue` | Attribute filter (OR within key, AND across keys)             |

### Response

```json
{
  "success": true,
  "data": {
    "products": [
      /* same shape as homepage products */
    ],
    "pagination": {
      "totalCount": 85,
      "totalPages": 5,
      "currentPage": 1,
      "perPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "availableFilters": {
      "attributes": [
        { "key": "Volume", "values": ["500ml", "1L", "5L"] },
        { "key": "Color", "values": ["Black", "Blue", "Red"] }
      ],
      "priceRange": { "min": 5.99, "max": 299.99 }
    }
  }
}
```

### Important Notes

- **Never send `?includeAll=false`** — omit it entirely for storefront requests
- `minPrice` on the product is computed from variants — can be `null` if no active variants
- `variants[]` is NOT included in listing responses — only on product detail
- Products with `status: "active"` only are returned (no drafts/sold)

---

## 6. Product Detail

### Endpoint

```
GET /catalog/products/:idOrSlug
```

Pass either the product `_id` or `slug`. Returns full product with `variants[]` array.

### Response

```json
{
  "success": true,
  "data": {
    "_id": "64f1...",
    "name": "Industrial Epoxy Resin",
    "slug": "industrial-epoxy-resin",
    "description": "<p>High-strength two-part epoxy for industrial use.</p>",
    "category": { "_id": "...", "name": "Adhesives", "slug": "adhesives" },
    "images": [
      { "url": "https://cdn.../img1.jpg", "publicId": "img1" },
      { "url": "https://cdn.../img2.jpg", "publicId": "img2" }
    ],
    "variantAttributes": [{ "key": "Volume", "values": ["500ml", "1L", "5L"] }],
    "averageRating": 4.7,
    "reviewCount": 23,
    "frequentlyBoughtTogether": ["product-id-1", "product-id-2"],
    "minPrice": 12.99,
    "inventory": 150,
    "available": true,
    "variants": [
      {
        "_id": "variant-id-1",
        "sku": "EPX-500ML",
        "attributes": [{ "key": "Volume", "value": "500ml" }],
        "price": 15.99,
        "discountedPrice": 12.99,
        "effectivePrice": 12.99,
        "bulkPricingTiers": [
          { "minQty": 10, "maxQty": 49, "type": "percentage", "value": 10 },
          { "minQty": 50, "maxQty": null, "type": "fixed", "value": 9.5 }
        ],
        "retailDiscountTiers": [
          { "minQty": 3, "maxQty": 5, "type": "percentage", "value": 5 },
          { "minQty": 6, "maxQty": 10, "type": "percentage", "value": 10 }
        ],
        "weight": 0.5,
        "freeDelivery": false,
        "inventory": 80,
        "available": true,
        "image": "image-id",
        "imageUrl": "https://cdn.../epx-500ml.jpg"
      },
      {
        "_id": "variant-id-2",
        "sku": "EPX-1L",
        "attributes": [{ "key": "Volume", "value": "1L" }],
        "price": 22.99,
        "discountedPrice": null,
        "effectivePrice": 22.99,
        "bulkPricingTiers": null,
        "retailDiscountTiers": null,
        "weight": 1.0,
        "freeDelivery": false,
        "inventory": 0,
        "available": false,
        "image": null,
        "imageUrl": null
      }
    ]
  }
}
```

### Key Rules

- `description` is **HTML** — render with a WebView or rich text component, never as plain text
- `frequentlyBoughtTogether` is an array of product IDs — fetch each separately
- `variants[]` is only present on this endpoint, NOT on listing
- Use `variant.effectivePrice` for display (pre-calculated: `discountedPrice ?? price`)
- Show `variant.imageUrl` when a variant has its own image

---

## 7. Pricing System

### Price Layers (Applied in Order)

```
Layer 1: Base Price (variant.price)              → always set
Layer 2: Sale Price (variant.discountedPrice)    → optional
Layer 3: Tier Discount (applied on top of sale price)
         - Bulk buyers: variant.bulkPricingTiers
         - Normal/Guest: variant.retailDiscountTiers
Layer 4: Coupon (applied to order total, replaces Layer 3 for normal/guest)
```

### Effective Retail Price

```
effectiveRetailPrice = variant.discountedPrice ?? variant.price
```

This is always `variant.effectivePrice` in the API response.

### Bulk Pricing Tiers (for bulk buyers only)

```json
"bulkPricingTiers": [
  { "minQty": 10, "maxQty": 49, "type": "percentage", "value": 10 },
  { "minQty": 50, "maxQty": 199, "type": "percentage", "value": 20 },
  { "minQty": 200, "maxQty": null, "type": "fixed", "value": 45.00 }
]
```

**Calculation:**

- `percentage`: unitPrice = effectiveRetailPrice × (1 - value/100)
- `fixed`: unitPrice = tier.value (this IS the price)

### Retail Discount Tiers (for normal/guest users)

```json
"retailDiscountTiers": [
  { "minQty": 3, "maxQty": 5, "type": "percentage", "value": 5 },
  { "minQty": 6, "maxQty": 10, "type": "fixed", "value": 10.00 }
]
```

**Calculation:**

- `percentage`: unitPrice = effectiveRetailPrice × (1 - value/100)
- `fixed`: unitPrice = effectiveRetailPrice - tier.value (subtraction, NOT absolute)

### Pricing Decision Tree

```
Is user a bulk buyer (isBulkBuyer: true)?
├── YES → Use bulkPricingTiers (if variant has them)
│         Coupons are FORBIDDEN (403 error)
└── NO  → Is coupon active?
          ├── YES → Skip retailDiscountTiers, use effectivePrice
          │         (coupon applied to order total separately)
          └── NO  → Use retailDiscountTiers (if variant has them)
```

### Checkout Preview (Get Accurate Pricing)

```
POST /orders/checkout-preview

Body (authenticated): { "addressId": "..." }  // optional for delivery fee
Body (guest): { "city": "london", "items": [{ "productId": "...", "variantId": "...", "quantity": 50 }] }

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "product": { "_id": "...", "name": "..." },
        "variant": { "_id": "...", "sku": "...", "attributes": [...] },
        "quantity": 50,
        "basePrice": 69.99,
        "unitPrice": 55.99,
        "pricingType": "bulk_tier",
        "tierApplied": { "type": "percentage", "value": 20 },
        "lineTotal": 2799.50,
        "savings": 700.00
      }
    ],
    "subtotal": 2799.50,
    "discount": 0,
    "couponCode": null,
    "deliveryFee": 6.99,
    "total": 2806.49,
    "currency": "GBP",
    "isBulkBuyer": true
  }
}
```

### Price Display Rules

| Context                           | What to show                                       |
| --------------------------------- | -------------------------------------------------- |
| Product card (listing)            | "From £{minPrice}" — prefix with "From"            |
| Product detail (variant selected) | `variant.effectivePrice` as main price             |
| Variant has `discountedPrice`     | Show original `price` with strikethrough           |
| Bulk buyer viewing tiers          | Show tier table with quantity ranges               |
| Normal user viewing tiers         | Show retail discount tier table                    |
| Cart item                         | `effectivePrice` or tier price if quantity matches |

---

## 8. Cart

### 8.1 Get Cart

```
GET /orders/cart

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "cart-item-id",          ← USE THIS for update/delete
        "product": {
          "_id": "product-id",
          "name": "Industrial Epoxy Resin",
          "slug": "industrial-epoxy-resin",
          "images": [{ "url": "...", "publicId": "..." }]
        },
        "variant": {
          "_id": "variant-id",
          "sku": "EPX-500ML",
          "attributes": [{ "key": "Volume", "value": "500ml" }],
          "price": 15.99,
          "discountedPrice": 12.99,
          "bulkPricing": { "minQuantity": 10, "bulkPrice": 9.50 },
          "inventory": 80
        },
        "quantity": 2
      }
    ],
    "itemCount": 2
  }
}
```

### 8.2 Add to Cart

```
POST /orders/cart

Body: {
  "productId": "product-id",      ← required
  "variantId": "variant-id",      ← REQUIRED (400 without it)
  "quantity": 2
}

Response: Updated cart (same shape as GET)
```

### 8.3 Update Quantity

```
PUT /orders/cart/:itemId        ← Use cart item _id, NOT productId or variantId

Body: { "quantity": 5 }

Response: Updated cart
```

### 8.4 Remove Item

```
DELETE /orders/cart/:itemId      ← Use cart item _id

Response: Updated cart
```

### 8.5 Clear Cart

```
DELETE /orders/cart

Response: { "success": true, "data": { "items": [], "itemCount": 0 } }
```

### Critical Cart Rules

- ⚠️ **Always send `variantId`** when adding to cart — omitting it returns 400
- ⚠️ **Use cart item `_id`** for PUT/DELETE — never `productId` or `variantId`
- Cart is session-based for guests, persisted for authenticated users
- Always re-render cart from API response — never mutate local state directly
- If a variant was deleted, it's silently removed from cart response

---

## 9. Wishlist

Requires authentication. Tracks **products only** (not variants).

### 9.1 Get Wishlist

```
GET /wishlist

Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "wishlist-item-id",
        "product": {
          "_id": "product-id",
          "name": "Industrial Epoxy Resin",
          "slug": "industrial-epoxy-resin",
          "images": [{ "url": "..." }],
          "minPrice": 12.99,
          "available": true
        }
      }
    ]
  }
}
```

### 9.2 Add to Wishlist

```
POST /wishlist

Body: { "productId": "product-id" }

Response: Updated wishlist
```

### 9.3 Remove from Wishlist

```
DELETE /wishlist/:itemId        ← Use wishlist item _id

Response: Updated wishlist
```

### 9.4 Check if Wishlisted

```
GET /wishlist/check/:productId

Response:
{ "success": true, "data": { "isWishlisted": true, "itemId": "wishlist-item-id" } }
```

---

## 10. Checkout Flow

### Step-by-Step

```
1. View Cart
2. Apply Coupon (optional, preview only)
3. Select/Add Delivery Address
4. Calculate Delivery Fee
5. Select Payment Method (Stripe | COD)
6a. Stripe → Create Order → Confirm Payment with Stripe SDK
6b. COD → Create Order → Done
7. Order Confirmation
```

### 10.1 Validate Coupon (Preview)

```
POST /coupons/validate

Body: { "code": "SAVE20", "cartTotal": 89.97 }

Response 200:
{
  "success": true,
  "data": {
    "valid": true,
    "discountType": "percentage",
    "discountValue": 20,
    "discountAmount": 17.99,
    "finalTotal": 71.98,
    "message": "20% discount applied"
  }
}

Error 403 (guest + perUserLimit coupon):
{ "success": false, "message": "This coupon requires an account. Please log in to use it." }

Error 403 (bulk buyer):
{ "success": false, "message": "Coupons are not available for bulk accounts." }
```

### 10.2 Get Addresses

```
GET /users/addresses

Response:
{
  "success": true,
  "data": [
    {
      "_id": "address-id",
      "label": "Home",
      "fullName": "Jane Doe",
      "phone": "+1-555-0100",
      "addressLine1": "123 Main St",
      "addressLine2": "Apt 4B",
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62701",
      "country": "US",
      "isDefault": true
    }
  ]
}
```

### 10.3 Calculate Delivery Fee

```
POST /orders/delivery-fee

Body: { "addressId": "address-id", "cartTotal": 89.97 }

Response:
{
  "success": true,
  "data": {
    "deliveryFee": 5.99,
    "freeShippingThreshold": 100.00,
    "qualifiesForFreeShipping": false
  }
}
```

### 10.4 Create Order (Stripe)

```
POST /orders

Body: { "addressId": "address-id", "paymentMethod": "stripe", "couponCode": "SAVE20" }

Response 201:
{
  "success": true,
  "data": {
    "orderId": "order-id",
    "orderNumber": "ORD-2024-00123",
    "paymentIntent": {
      "clientSecret": "pi_3OxYZ_secret_abc123",
      "amount": 7598,
      "currency": "gbp"
    },
    "total": 75.98,
    "deliveryFee": 5.99,
    "discountAmount": 17.99
  }
}
```

Then use Stripe SDK to confirm payment with `clientSecret`.

### 10.5 Create Order (COD)

```
POST /orders

Body: { "addressId": "address-id", "paymentMethod": "cod", "couponCode": null }

Response 201:
{
  "success": true,
  "data": {
    "orderId": "order-id",
    "orderNumber": "ORD-2024-00124",
    "paymentIntent": null,
    "total": 95.96,
    "deliveryFee": 5.99,
    "discountAmount": 0
  }
}
```

No further payment steps. Redirect to confirmation.

### Checkout Rules

- ⚠️ **Rate limited: 5 req/min per IP.** On 429: "Too many checkout attempts. Please wait."
- After success: clear cart locally, navigate to confirmation
- Bulk buyers CANNOT use coupons (403 error)
- Guest users CANNOT use `perUserLimit` coupons (403 error)

---

## 11. Delivery System

### How It Works

1. Each variant has a `weight` (kg) and optional `freeDelivery` flag
2. Cart weight = sum of (variant.weight × quantity) for items where `freeDelivery` is false
3. Backend matches total weight against city's weight ranges
4. Returns the delivery fee for the matching range

### Delivery Fee Calculation (Server-Side)

- Call `POST /orders/delivery-fee` with `addressId`
- The backend calculates weight from the current cart
- Returns `deliveryFee`, `freeShippingThreshold`, and `qualifiesForFreeShipping`

### Free Delivery Flag

- Variants with `freeDelivery: true` have their weight excluded from calculation
- This is per-variant, not per-product
- Useful for lightweight/digital items

---

## 12. Orders

### 12.1 Order History (Authenticated)

```
GET /orders?page=1&limit=10

Response:
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "order-id",
        "orderNumber": "ORD-2024-00123",
        "status": "processing",
        "paymentMethod": "stripe",
        "paymentStatus": "paid",
        "total": 75.98,
        "itemCount": 2,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": { "totalCount": 12, "totalPages": 2, "currentPage": 1, "perPage": 10, "hasNextPage": true, "hasPrevPage": false }
  }
}
```

### 12.2 Order Detail

```
GET /orders/:orderId

Response:
{
  "success": true,
  "data": {
    "_id": "order-id",
    "orderNumber": "ORD-2024-00123",
    "status": "shipped",
    "paymentMethod": "stripe",
    "paymentStatus": "paid",
    "items": [
      {
        "product": { "_id": "...", "name": "Industrial Epoxy Resin", "slug": "..." },
        "variant": { "_id": "...", "sku": "EPX-500ML", "attributes": [{ "key": "Volume", "value": "500ml" }] },
        "quantity": 2,
        "unitPrice": 10.99,
        "totalPrice": 21.98,
        "isBulkPriceApplied": false,
        "pricingType": "retail"
      }
    ],
    "deliveryAddress": {
      "fullName": "Jane Doe",
      "addressLine1": "123 Main St",
      "city": "Springfield",
      "state": "IL",
      "postalCode": "62701",
      "country": "US"
    },
    "subtotal": 21.98,
    "deliveryFee": 5.99,
    "discountAmount": 0,
    "total": 27.97,
    "trackingNumber": "1Z999AA10123456784",
    "trackingUrl": "https://www.ups.com/track?tracknum=...",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 12.3 Guest Order Lookup

```
GET /orders/guest/:orderId?email=jane@example.com

Response: Same shape as order detail
```

### 12.4 Cancel Order

```
POST /orders/:orderId/cancel

Only works for: status = "pending" or "processing"

Response: { "success": true, "data": { "orderId": "...", "status": "cancelled" } }
```

### 12.5 Reorder

```
POST /orders/:orderId/reorder

Adds all items back to cart (skips unavailable variants)

Response: Updated cart
```

### Order Statuses

| Status       | Meaning                           |
| ------------ | --------------------------------- |
| `pending`    | Order placed, awaiting processing |
| `processing` | Being prepared                    |
| `shipped`    | In transit                        |
| `delivered`  | Delivered to customer             |
| `cancelled`  | Cancelled (by customer or admin)  |
| `refunded`   | Payment refunded                  |

### Payment Statuses

| Status     | Meaning                                  |
| ---------- | ---------------------------------------- |
| `pending`  | Awaiting payment (COD or Stripe pending) |
| `paid`     | Payment received                         |
| `failed`   | Payment failed                           |
| `refunded` | Payment refunded                         |

---

## 13. User Account

### 13.1 Get Profile

```
GET /users/profile

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0100",
    "role": "customer",
    "isBulkBuyer": false,
    "isCodEnabled": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 13.2 Update Profile

```
PUT /users/profile

Body: { "name": "Jane Smith", "phone": "+1-555-0200" }

Response: Updated user object
```

### 13.3 Change Password

```
PUT /users/change-password

Body: { "currentPassword": "OldPass123!", "newPassword": "NewPass456!" }

Response: { "success": true, "data": { "message": "Password updated successfully." } }
```

### 13.4 Addresses CRUD

| Action      | Method | Endpoint                       |
| ----------- | ------ | ------------------------------ |
| List        | GET    | `/users/addresses`             |
| Add         | POST   | `/users/addresses`             |
| Update      | PUT    | `/users/addresses/:id`         |
| Delete      | DELETE | `/users/addresses/:id`         |
| Set Default | PUT    | `/users/addresses/:id/default` |

**Address Body:**

```json
{
  "label": "Home",
  "fullName": "Jane Doe",
  "phone": "+1-555-0100",
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4B",
  "city": "Springfield",
  "state": "IL",
  "postalCode": "62701",
  "country": "US",
  "isDefault": true
}
```

---

## 14. Reviews

### Rules

- User must have a **delivered** order containing the product
- One review per product per user
- Rating: 1–5 (required)
- Comment: optional

### Get Reviews

```
GET /catalog/products/:productId/reviews?page=1&limit=10

Response:
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "...",
        "user": { "_id": "...", "name": "Jane Doe" },
        "rating": 5,
        "comment": "Excellent product, very strong bond.",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### Submit Review

```
POST /catalog/products/:productId/reviews

Body: { "rating": 5, "comment": "Excellent product." }

Response 201: Created review object

Error 403: "You must have a delivered order containing this product to leave a review."
Error 409: "You have already reviewed this product."
```

---

## 15. Support Tickets

Requires authentication.

### Create Ticket

```
POST /support/tickets

Body: { "subject": "Order not received", "message": "My order was marked delivered but...", "orderId": "order-id" }

Response 201: { "_id": "...", "ticketNumber": "TKT-2024-00045", "subject": "...", "status": "open" }
```

### List Tickets

```
GET /support/tickets?page=1&limit=10

Response: { "tickets": [...], "pagination": {...} }
```

### View Ticket (with messages)

```
GET /support/tickets/:ticketId

Response:
{
  "success": true,
  "data": {
    "_id": "...",
    "ticketNumber": "TKT-2024-00045",
    "subject": "Order not received",
    "status": "open",
    "messages": [
      { "_id": "...", "sender": "customer", "message": "...", "createdAt": "..." },
      { "_id": "...", "sender": "support", "message": "...", "createdAt": "..." }
    ]
  }
}
```

### Reply to Ticket

```
POST /support/tickets/:ticketId/messages

Body: { "message": "Any update on this?" }

Response: Updated ticket with all messages
```

---

## 16. Real-time Notifications (SSE)

Connect only when authenticated.

### Endpoint

```
GET /notifications/stream

Headers: Authorization: Bearer <token>
withCredentials: true
```

### Event Types

| Event                  | Payload                                             | When                     |
| ---------------------- | --------------------------------------------------- | ------------------------ |
| `order_status_updated` | `{ orderId, orderNumber, status, trackingNumber? }` | Order status changes     |
| `order_delivered`      | `{ orderId, orderNumber }`                          | Order delivered          |
| `order_cancelled`      | `{ orderId, orderNumber, reason? }`                 | Order cancelled          |
| `payment_confirmed`    | `{ orderId, orderNumber }`                          | Stripe payment confirmed |
| `ticket_reply`         | `{ ticketId, ticketNumber, message }`               | Support replied          |
| `notification`         | `{ title, body, url? }`                             | General notification     |

### Mobile Implementation Notes

- Use `EventSource` (React Native: `react-native-sse` package)
- Reconnect after 5 seconds on error
- Disconnect on logout
- Show local push notification for each event

---

## 17. Push Notifications

### Register Push Token

```
POST /users/push-token

Body: { "token": "ExponentPushToken[xxx]", "platform": "ios" }
// platform: "ios" | "android" | "web"

Response: { "success": true, "data": { "message": "Push token registered." } }
```

Call this after login and whenever the token refreshes.

---

## 18. Platform Config

### Get Config

```
GET /config

Response:
{
  "success": true,
  "data": {
    "currency": "GBP",
    "currencySymbol": "£",
    "businessName": "OttimoDirect",
    "businessPhone": "+44-20-1234-5678",
    "businessEmail": "info@chemibuild.com",
    "theme": "default",
    "socialLinks": {
      "facebook": "https://facebook.com/chemibuild",
      "instagram": "https://instagram.com/chemibuild"
    }
  }
}
```

### Key Rules

- **Never hardcode currency** — always read from this endpoint
- Cache this response for the session (rarely changes)
- Use `currencySymbol` for display, `currency` for Stripe

---

## 19. Error Handling

### HTTP Status Codes

| Code    | Meaning           | Action                                                           |
| ------- | ----------------- | ---------------------------------------------------------------- |
| 200/201 | Success           | Process response                                                 |
| 400     | Validation error  | Show `message` to user                                           |
| 401     | Unauthorized      | Try refresh token → if fails, redirect to login                  |
| 403     | Forbidden         | Show `message` (e.g., "Coupons not available for bulk accounts") |
| 404     | Not found         | Show "not found" screen                                          |
| 409     | Conflict          | Show `message` (e.g., "Already reviewed")                        |
| 422     | Validation errors | Map `errors[]` to form fields                                    |
| 429     | Rate limited      | Show "Too many attempts. Please wait."                           |
| 500     | Server error      | Show generic error + retry button                                |

### 422 Validation Error Shape

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email is already registered" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ]
}
```

### Token Refresh Flow

```
1. API call returns 401
2. Call POST /auth/refresh-token
3. If 200: save new accessToken, retry original request
4. If 401/403: clear auth state, redirect to login with ?session=expired
```

---

## 20. TypeScript Types Reference

```typescript
// ─── Product ─────────────────────────────────────────────

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string; // HTML string
  category: { _id: string; name: string; slug: string };
  images: { url: string; publicId: string }[];
  isFeatured: boolean;
  status: 'active' | 'sold' | 'draft';
  variantAttributes: { key: string; values: string[] }[];
  averageRating: number;
  reviewCount: number;
  frequentlyBoughtTogether: string[];
  minPrice: number | null;
  minOriginalPrice: number | null;
  inventory: number;
  available: boolean;
  variants?: Variant[]; // only on detail endpoint
  createdAt: string;
}

// ─── Variant ─────────────────────────────────────────────

interface PricingTier {
  minQty: number;
  maxQty: number | null;
  type: 'percentage' | 'fixed';
  value: number;
}

interface Variant {
  _id: string;
  sku: string;
  attributes: { key: string; value: string }[];
  price: number;
  discountedPrice: number | null;
  effectivePrice: number;
  bulkPricingTiers: PricingTier[] | null;
  retailDiscountTiers: PricingTier[] | null;
  weight: number;
  freeDelivery: boolean;
  inventory: number;
  available: boolean;
  image: string | null;
  imageUrl: string | null;
}

// ─── Cart ────────────────────────────────────────────────

interface CartItem {
  _id: string; // use for PUT/DELETE
  product: {
    _id: string;
    name: string;
    slug: string;
    images: { url: string }[];
  };
  variant: {
    _id: string;
    sku: string;
    attributes: { key: string; value: string }[];
    price: number;
    discountedPrice: number | null;
    inventory: number;
  };
  quantity: number;
}

interface Cart {
  items: CartItem[];
  itemCount: number;
}

// ─── Order ───────────────────────────────────────────────

type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

interface Order {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: 'stripe' | 'cod';
  paymentStatus: PaymentStatus;
  items: {
    product: { _id: string; name: string };
    variant: { sku: string; attributes: { key: string; value: string }[] };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    pricingType: string;
  }[];
  deliveryAddress: {
    fullName: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: string;
}

// ─── Address ─────────────────────────────────────────────

interface Address {
  _id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

// ─── User ────────────────────────────────────────────────

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer';
  isBulkBuyer: boolean;
  isCodEnabled: boolean;
  createdAt: string;
}

// ─── Pagination ──────────────────────────────────────────

interface Pagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

---

## 21. API Quick Reference Table

### Auth

| Method | Endpoint              | Auth   | Purpose               |
| ------ | --------------------- | ------ | --------------------- |
| POST   | `/auth/register`      | No     | Register              |
| POST   | `/auth/login`         | No     | Login                 |
| GET    | `/auth/google`        | No     | Google OAuth redirect |
| POST   | `/auth/refresh-token` | Cookie | Refresh access token  |
| POST   | `/auth/logout`        | Yes    | Logout                |

### Catalog

| Method | Endpoint                        | Auth | Purpose                               |
| ------ | ------------------------------- | ---- | ------------------------------------- |
| GET    | `/catalog/products`             | No   | Product listing (paginated, filtered) |
| GET    | `/catalog/products/:idOrSlug`   | No   | Product detail with variants          |
| GET    | `/catalog/products/:id/reviews` | No   | Product reviews                       |
| POST   | `/catalog/products/:id/reviews` | Yes  | Submit review                         |
| GET    | `/catalog/categories`           | No   | Category tree                         |
| GET    | `/banners`                      | No   | Active banners                        |

### Cart

| Method | Endpoint               | Auth | Purpose                       |
| ------ | ---------------------- | ---- | ----------------------------- |
| GET    | `/orders/cart`         | No\* | Get cart                      |
| POST   | `/orders/cart`         | No\* | Add item (requires variantId) |
| PUT    | `/orders/cart/:itemId` | No\* | Update quantity               |
| DELETE | `/orders/cart/:itemId` | No\* | Remove item                   |
| DELETE | `/orders/cart`         | No\* | Clear cart                    |

\*Session-based for guests, persisted for authenticated users

### Wishlist (Auth Required)

| Method | Endpoint                     | Auth | Purpose             |
| ------ | ---------------------------- | ---- | ------------------- |
| GET    | `/wishlist`                  | Yes  | Get wishlist        |
| POST   | `/wishlist`                  | Yes  | Add product         |
| DELETE | `/wishlist/:itemId`          | Yes  | Remove item         |
| GET    | `/wishlist/check/:productId` | Yes  | Check if wishlisted |

### Checkout

| Method | Endpoint                   | Auth | Purpose                            |
| ------ | -------------------------- | ---- | ---------------------------------- |
| POST   | `/coupons/validate`        | No   | Preview coupon discount            |
| GET    | `/users/addresses`         | Yes  | List saved addresses               |
| POST   | `/orders/delivery-fee`     | Yes  | Calculate delivery fee             |
| POST   | `/orders/checkout-preview` | No\* | Get full pricing breakdown         |
| POST   | `/orders`                  | No\* | Create order (rate limited: 5/min) |

### Orders

| Method | Endpoint                           | Auth | Purpose              |
| ------ | ---------------------------------- | ---- | -------------------- |
| GET    | `/orders`                          | Yes  | Order history        |
| GET    | `/orders/:orderId`                 | Yes  | Order detail         |
| GET    | `/orders/guest/:orderId?email=...` | No   | Guest order lookup   |
| POST   | `/orders/:orderId/cancel`          | Yes  | Cancel order         |
| POST   | `/orders/:orderId/reorder`         | Yes  | Re-add items to cart |

### User Account (Auth Required)

| Method | Endpoint                       | Auth | Purpose             |
| ------ | ------------------------------ | ---- | ------------------- |
| GET    | `/users/profile`               | Yes  | Get profile         |
| PUT    | `/users/profile`               | Yes  | Update name/phone   |
| PUT    | `/users/change-password`       | Yes  | Change password     |
| POST   | `/users/addresses`             | Yes  | Add address         |
| PUT    | `/users/addresses/:id`         | Yes  | Update address      |
| DELETE | `/users/addresses/:id`         | Yes  | Delete address      |
| PUT    | `/users/addresses/:id/default` | Yes  | Set default         |
| POST   | `/users/push-token`            | Yes  | Register push token |

### Support (Auth Required)

| Method | Endpoint                        | Auth | Purpose         |
| ------ | ------------------------------- | ---- | --------------- |
| POST   | `/support/tickets`              | Yes  | Create ticket   |
| GET    | `/support/tickets`              | Yes  | List tickets    |
| GET    | `/support/tickets/:id`          | Yes  | Ticket detail   |
| POST   | `/support/tickets/:id/messages` | Yes  | Reply to ticket |

### Real-time

| Method | Endpoint                | Auth | Purpose          |
| ------ | ----------------------- | ---- | ---------------- |
| GET    | `/notifications/stream` | Yes  | SSE event stream |

### Config

| Method | Endpoint  | Auth | Purpose                                   |
| ------ | --------- | ---- | ----------------------------------------- |
| GET    | `/config` | No   | Platform config (currency, business info) |

---

## Mobile-Specific Recommendations

### Token Storage

- iOS: Keychain
- Android: EncryptedSharedPreferences
- Never plain AsyncStorage/SharedPreferences

### Image Handling

- Use `product.images[0].url` directly — images are served from CDN (R2)
- Cache images aggressively (URLs are immutable)
- Show placeholder on 404/error (images may be deleted)

### Offline Support

- Cache product listings and categories locally
- Cart should sync on reconnect
- Show "offline" banner when no connectivity

### Deep Linking

- Product: `/products/{slug}`
- Order: `/orders/{orderId}`
- Category: `/products?category={slug}`

### Payment (Mobile)

- Stripe: Use `@stripe/stripe-react-native` for iOS/Android
- COD: No payment SDK needed — just create order with `paymentMethod: "cod"`

### Push Notifications

- Register token after login: `POST /users/push-token`
- Platform: `"ios"` or `"android"`
- Handle events: order updates, delivery, support replies

### Performance

- Paginate all lists (products, orders, reviews)
- Never load all products at once
- Cache `GET /config` for the session
- Use infinite scroll for product listing
