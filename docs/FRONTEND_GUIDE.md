# Frontend Integration Guide — UK E-Commerce Platform

> **Audience:** Frontend developers building a Next.js app that combines the public website and admin dashboard in one codebase.
>
> **Backend Base URL:** `http://localhost:5000/api/v1`
>
> **API Docs (Swagger):** `http://localhost:5000/api-docs`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Navigation Logic](#2-authentication--navigation-logic)
3. [Admin/Staff Sidebar Navigation](#3-adminstaff-sidebar-navigation)
4. [Customer Website Pages & Endpoints](#4-customer-website-pages--endpoints)
5. [Complete API Reference](#5-complete-api-reference)
6. [Common Patterns](#6-common-patterns)
7. [Real-time Features](#7-real-time-features)
8. [Checkout Flow](#8-checkout-flow-step-by-step)
9. [Variant Selection Flow](#9-variant-selection-flow)
10. [Tiered Pricing — Admin UI Reference](#10-tiered-pricing--admin-ui-reference)
11. [Delivery Fee System — Admin & Frontend Reference](#11-delivery-fee-system--admin--frontend-reference)
12. [Per-Variant Max Order Quantity](#12-per-variant-max-order-quantity)
13. [Pickup & Cash on Pickup (COP)](#13-pickup--cash-on-pickup-cop)
14. [Business Info, Newsletter & Contact Form](#14-business-info-newsletter--contact-form)
15. [Testimonials](#15-testimonials)
16. [Banner Placements (Hero, Promo, Category, Popup)](#16-banner-placements)
17. [Product Tags](#17-product-tags)

---

## 1. Architecture Overview

### Single Next.js App Structure

```
app/
├── (public)/              # Public website (customer-facing)
│   ├── page.tsx           # Homepage
│   ├── products/          # Product listing & detail
│   ├── categories/        # Category pages
│   ├── cart/              # Shopping cart
│   ├── checkout/          # Checkout flow
│   └── account/           # Customer dashboard (auth required)
│       ├── profile/
│       ├── orders/
│       ├── addresses/
│       └── wishlist/
├── (auth)/                # Auth pages
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── reset-password/
├── admin/                 # Admin dashboard (admin/staff only)
│   ├── dashboard/
│   ├── orders/
│   ├── products/
│   ├── categories/
│   ├── customers/
│   ├── analytics/
│   ├── banners/
│   ├── coupons/
│   ├── support/
│   ├── notifications/
│   ├── settings/
│   ├── bulk-buyers/
│   └── cod/
├── api/                   # Next.js API routes (if needed for BFF)
└── layout.tsx
```

### Route Structure

| Path Pattern          | Audience        | Auth Required              |
| --------------------- | --------------- | -------------------------- |
| `/`                   | Public/Customer | No                         |
| `/products/*`         | Public/Customer | No                         |
| `/categories/*`       | Public/Customer | No                         |
| `/account/*`          | Customer        | Yes (customer role)        |
| `/admin/*`            | Admin/Staff     | Yes (admin or staff role)  |
| `/login`, `/register` | All             | No (redirect if logged in) |

### Key Principles

- **All API calls** go to `{BACKEND_URL}/api/v1/{module}/{endpoint}`
- **Authentication** uses JWT Bearer tokens
- **Role-based access** is enforced both server-side and client-side
- **Admin bypasses** all permission checks — full access to everything
- **Staff** has granular per-module permissions (read/write)
- **Customers** only access their own data

---

## 2. Authentication & Navigation Logic

### Login Flow

```
POST /api/v1/auth/login
```

**Request:**

```json
{
  "email": "admin@ecommerce.co.uk",
  "password": "Admin123@"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "admin@ecommerce.co.uk",
    "name": "Admin User",
    "role": "admin",
    "isEmailVerified": true,
    "isActive": true,
    "isBulkBuyer": false,
    "isCodEnabled": false,
    "addresses": [],
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### JWT Token Payload

Decode the JWT to get:

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "role": "admin",
  "isEmailVerified": true,
  "iat": 1700000000,
  "exp": 1700604800
}
```

For **staff** users, the token also includes:

```json
{
  "userId": "507f1f77bcf86cd799439012",
  "role": "staff",
  "isEmailVerified": true,
  "permissions": {
    "catalog": { "read": true, "write": true },
    "orders": { "read": true, "write": false },
    "users": { "read": false, "write": false },
    "support": { "read": true, "write": true },
    "notifications": { "read": true, "write": false },
    "config": { "read": false, "write": false }
  }
}
```

### Post-Login Redirect Logic

```typescript
function getRedirectPath(user: User): string {
  switch (user.role) {
    case 'admin':
      return '/admin/dashboard';
    case 'staff':
      return '/admin/dashboard';
    case 'customer':
    default:
      return '/';
  }
}
```

### Token Storage & Usage

**Option A: httpOnly Cookie (Recommended for SSR)**

- Set via response header or Next.js API route
- Automatically sent with requests
- Immune to XSS

**Option B: localStorage (SPA approach)**

- Store token in localStorage after login
- Attach to every request manually

**Attaching Token to Requests:**

```typescript
// lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = getToken(); // from cookie or localStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Token Refresh

```
POST /api/v1/auth/refresh
Authorization: Bearer <current-token>
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

Token expires in **7 days** by default. Implement a refresh strategy (e.g., refresh when token has < 1 day remaining).

---

## 3. Admin/Staff Sidebar Navigation

### Admin Role (Full Access — Show ALL Items)

```typescript
const adminSidebarItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: 'LayoutDashboard' },
  { label: 'Orders', path: '/admin/orders', icon: 'ShoppingCart' },
  { label: 'Products', path: '/admin/products', icon: 'Package' },
  { label: 'Categories', path: '/admin/categories', icon: 'FolderTree' },
  { label: 'Customers', path: '/admin/customers', icon: 'Users' },
  { label: 'Analytics', path: '/admin/analytics', icon: 'BarChart3' },
  { label: 'Banners', path: '/admin/banners', icon: 'Image' },
  { label: 'Coupons', path: '/admin/coupons', icon: 'Ticket' },
  { label: 'Support Tickets', path: '/admin/support', icon: 'MessageSquare' },
  { label: 'Notifications', path: '/admin/notifications', icon: 'Bell' },
  { label: 'Settings', path: '/admin/settings', icon: 'Settings' },
  { label: 'Bulk Buyers', path: '/admin/bulk-buyers', icon: 'Warehouse' },
  { label: 'COD Management', path: '/admin/cod', icon: 'Banknote' },
];
```

### Staff Role (Permission-Based)

```typescript
function getStaffSidebarItems(permissions: Permissions): SidebarItem[] {
  const items: SidebarItem[] = [];

  // Always show dashboard for staff
  items.push({
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: 'LayoutDashboard',
  });

  if (permissions.catalog?.read) {
    items.push({ label: 'Products', path: '/admin/products', icon: 'Package' });
    items.push({
      label: 'Categories',
      path: '/admin/categories',
      icon: 'FolderTree',
    });
    items.push({ label: 'Banners', path: '/admin/banners', icon: 'Image' });
    items.push({ label: 'Coupons', path: '/admin/coupons', icon: 'Ticket' });
  }

  if (permissions.orders?.read) {
    items.push({
      label: 'Orders',
      path: '/admin/orders',
      icon: 'ShoppingCart',
    });
  }

  if (permissions.users?.read) {
    items.push({ label: 'Customers', path: '/admin/customers', icon: 'Users' });
  }

  if (permissions.support?.read) {
    items.push({
      label: 'Support Tickets',
      path: '/admin/support',
      icon: 'MessageSquare',
    });
  }

  if (permissions.notifications?.read) {
    items.push({
      label: 'Notifications',
      path: '/admin/notifications',
      icon: 'Bell',
    });
  }

  if (permissions.config?.read) {
    items.push({
      label: 'Settings',
      path: '/admin/settings',
      icon: 'Settings',
    });
  }

  return items;
}
```

### Write Access Controls

Within each section, show/hide edit/create/delete buttons based on `write` permission:

```typescript
// Example: Products page
const canEditProducts =
  user.role === 'admin' || user.permissions?.catalog?.write;

// Show "Add Product" button only if canEditProducts
// Show "Edit" / "Delete" buttons on each row only if canEditProducts
```

### Permission Modules Reference

| Module          | Controls Access To                                          |
| --------------- | ----------------------------------------------------------- |
| `catalog`       | Products, Categories, Banners, Coupons, Variants, Reviews   |
| `orders`        | Order list, status updates, payment status updates, refunds |
| `users`         | Customer list, permissions management, activate/deactivate  |
| `support`       | Support tickets, status updates                             |
| `notifications` | Broadcast push notifications                                |
| `config`        | Platform settings, delivery rates                           |

---

## 4. Customer Website Pages & Endpoints

### Public Pages (No Authentication Required)

#### Homepage

```
GET /api/v1/banners?active=true          → Active banners for hero carousel
GET /api/v1/catalog/products?featured=true&limit=8  → Featured products
GET /api/v1/catalog/categories/tree      → Full category tree for navigation
```

#### Product Listing Page

```
GET /api/v1/catalog/products?search=headphones&category=507f...&minPrice=10&maxPrice=100&inStock=true&sortBy=price_asc&page=1&limit=20
GET /api/v1/catalog/products?category=clothing&attributes[Color]=Red,Blue&attributes[Size]=M
```

#### Product Detail Page

```
GET /api/v1/catalog/products/:idOrSlug   → Full product with variants & bulk pricing
GET /api/v1/catalog/products/:productId/reviews  → Product reviews
GET /api/v1/variants/products/:productId → All variants for the product
```

#### Categories Page

```
GET /api/v1/catalog/categories/tree      → Full nested category tree
GET /api/v1/catalog/categories           → Top-level categories (or ?parent=id for subcategories)
GET /api/v1/catalog/categories/:idOrSlug → Single category details
```

---

### Auth Pages

#### Register

```
POST /api/v1/auth/register
```

#### Login

```
POST /api/v1/auth/login
```

#### Google OAuth

```
GET /api/v1/auth/google                  → Redirects to Google consent screen
GET /api/v1/auth/google/callback         → Handles callback (returns token)
```

#### Verify Email

```
GET /api/v1/auth/verify-email?token=abc123
```

#### Forgot Password

```
POST /api/v1/auth/forgot-password
```

#### Reset Password

```
POST /api/v1/auth/reset-password
```

---

### Customer Dashboard (Authentication Required)

#### Profile

```
GET  /api/v1/users/profile               → Get profile
PUT  /api/v1/users/profile               → Update name/email
PUT  /api/v1/users/password              → Change password
```

#### Addresses

```
GET    /api/v1/users/addresses           → List addresses
POST   /api/v1/users/addresses           → Add address
PUT    /api/v1/users/addresses/:id       → Update address
DELETE /api/v1/users/addresses/:id       → Delete address
PUT    /api/v1/users/addresses/:id/default → Set as default
```

#### Orders

```
GET  /api/v1/orders?page=1&limit=20      → Order history
GET  /api/v1/orders/:orderId             → Order detail
POST /api/v1/orders/:orderId/cancel      → Cancel pending order
POST /api/v1/orders/:orderId/reorder     → Re-add items to cart
```

#### Wishlist

```
GET    /api/v1/wishlist                  → Get wishlist (paginated)
POST   /api/v1/wishlist                  → Add item (body: { productId })
DELETE /api/v1/wishlist/:itemId          → Remove item
GET    /api/v1/wishlist/check/:productId → Check if product is wishlisted
```

#### Cart

```
GET    /api/v1/orders/cart               → Get cart
POST   /api/v1/orders/cart               → Add item to cart (variantId required)
PUT    /api/v1/orders/cart/:itemId       → Update quantity (use cart item _id)
DELETE /api/v1/orders/cart/:itemId       → Remove item (use cart item _id)
DELETE /api/v1/orders/cart               → Clear cart
```

#### Checkout

```
POST /api/v1/orders/checkout             → Process checkout
```

#### Push Notifications

```
POST /api/v1/users/push-token            → Register/unregister push token
PUT  /api/v1/users/push-preferences      → Toggle push on/off
```

#### Support Tickets

```
GET  /api/v1/support/tickets             → List my tickets
POST /api/v1/support/tickets             → Create ticket
GET  /api/v1/support/tickets/:id         → Get ticket detail
POST /api/v1/support/tickets/:id/messages → Add message
```

---

## 5. Complete API Reference

> **Base URL:** `/api/v1`
>
> **Auth Header:** `Authorization: Bearer <token>`

---

### 5.1 Auth Module (`/auth`)

#### POST /auth/register

Create a new customer account.

| Field            | Details          |
| ---------------- | ---------------- |
| **Auth**         | None             |
| **Content-Type** | application/json |

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer",
    "isEmailVerified": false,
    "isActive": true,
    "isBulkBuyer": false,
    "isCodEnabled": false,
    "addresses": [],
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

- `400` — Validation error (missing fields, password too short)
- `409` — Email already exists

---

#### POST /auth/login

Authenticate with email and password.

| Field            | Details          |
| ---------------- | ---------------- |
| **Auth**         | None             |
| **Content-Type** | application/json |

**Request Body:**

```json
{
  "email": "admin@ecommerce.co.uk",
  "password": "Admin123@"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "admin@ecommerce.co.uk",
    "name": "Admin User",
    "role": "admin",
    "isEmailVerified": true,
    "isActive": true,
    "addresses": [],
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

- `401` — Invalid credentials (generic message, does not reveal which field is wrong)
- `401` — Account is deactivated

---

#### GET /auth/google

Initiates Google OAuth flow. Redirect the user's browser to this URL.

| Field        | Details                               |
| ------------ | ------------------------------------- |
| **Auth**     | None                                  |
| **Response** | 302 Redirect to Google consent screen |

**Frontend Implementation:**

```typescript
// Redirect user to Google OAuth
window.location.href = `${API_URL}/auth/google`;
```

The callback (`/auth/google/callback`) returns the user object and token. Configure `GOOGLE_CALLBACK_URL` to redirect back to your frontend with the token.

---

#### GET /auth/verify-email

Verify email address using token from verification email.

| Field            | Details                                            |
| ---------------- | -------------------------------------------------- |
| **Auth**         | None                                               |
| **Query Params** | `token` (required) — verification token from email |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully."
  }
}
```

**Error Responses:**

- `400` — Invalid or expired verification token

---

#### POST /auth/resend-verification

Resend the email verification link.

| Field    | Details                               |
| -------- | ------------------------------------- |
| **Auth** | Bearer token (any authenticated user) |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Verification email sent."
  }
}
```

**Error Responses:**

- `400` — Email already verified
- `401` — Unauthorized

---

#### POST /auth/forgot-password

Request a password reset email. Always returns 200 (prevents email enumeration).

| Field          | Details                    |
| -------------- | -------------------------- |
| **Auth**       | None                       |
| **Rate Limit** | 5 requests per IP per hour |

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a password reset link has been sent."
  }
}
```

**Error Responses:**

- `429` — Rate limit exceeded

---

#### POST /auth/reset-password

Reset password using token from reset email.

| Field            | Details          |
| ---------------- | ---------------- |
| **Auth**         | None             |
| **Content-Type** | application/json |

**Request Body:**

```json
{
  "token": "abc123def456...",
  "newPassword": "NewSecurePass1!"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Password reset successfully."
  }
}
```

**Error Responses:**

- `400` — Invalid or expired reset token

---

#### POST /auth/refresh

Issue a new JWT token.

| Field    | Details      |
| -------- | ------------ |
| **Auth** | Bearer token |

**Success Response (200):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### 5.2 Users Module (`/users`)

#### GET /users/profile

Get authenticated user's profile.

| Field    | Details                 |
| -------- | ----------------------- |
| **Auth** | Bearer token (any role) |

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "customer@example.com",
    "name": "Jane Doe",
    "role": "customer",
    "isEmailVerified": true,
    "isActive": true,
    "isBulkBuyer": false,
    "isCodEnabled": true,
    "isPushEnabled": true,
    "addresses": [
      {
        "_id": "addr001",
        "label": "Home",
        "line1": "123 High Street",
        "line2": "Flat 4",
        "city": "London",
        "county": "Greater London",
        "postcode": "SW1A 1AA",
        "country": "GB",
        "isDefault": true
      }
    ],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

#### PUT /users/profile

Update name and/or email.

| Field    | Details                 |
| -------- | ----------------------- |
| **Auth** | Bearer token (any role) |

**Request Body:**

```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    /* updated user object */
  }
}
```

---

#### PUT /users/password

Change password (requires current password verification).

| Field    | Details                 |
| -------- | ----------------------- |
| **Auth** | Bearer token (any role) |

**Request Body:**

```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password updated successfully."
}
```

**Error Responses:**

- `400` — Current password is incorrect

---

#### GET /users/addresses

List all delivery addresses.

| Field    | Details                 |
| -------- | ----------------------- |
| **Auth** | Bearer token (any role) |

**Success Response (200):**

```json
{
  "success": true,
  "addresses": [
    {
      "_id": "addr001",
      "label": "Home",
      "line1": "123 High Street",
      "line2": "Flat 4",
      "city": "London",
      "county": "Greater London",
      "postcode": "SW1A 1AA",
      "country": "GB",
      "isDefault": true
    }
  ]
}
```

---

#### POST /users/addresses

Add a new delivery address.

| Field    | Details                 |
| -------- | ----------------------- |
| **Auth** | Bearer token (any role) |

**Request Body:**

```json
{
  "label": "Work",
  "line1": "456 Business Park",
  "line2": "Suite 200",
  "city": "Manchester",
  "county": "Greater Manchester",
  "postcode": "M1 1AA",
  "country": "GB",
  "isDefault": false
}
```

**Success Response (201):**

```json
{
  "success": true,
  "addresses": [
    /* full updated addresses array */
  ]
}
```

> **Note:** First address is automatically set as default. If `isDefault: true`, all other addresses are unset.

---

#### PUT /users/addresses/:addressId

Update an existing address.

| Field      | Details                                  |
| ---------- | ---------------------------------------- |
| **Auth**   | Bearer token (any role)                  |
| **Params** | `addressId` — the address subdocument ID |

**Request Body:** (any subset of address fields)

```json
{
  "line1": "789 New Street",
  "isDefault": true
}
```

---

#### DELETE /users/addresses/:addressId

Delete an address. If deleted address was default, first remaining becomes default.

| Field      | Details                                  |
| ---------- | ---------------------------------------- |
| **Auth**   | Bearer token (any role)                  |
| **Params** | `addressId` — the address subdocument ID |

---

#### PUT /users/addresses/:addressId/default

Set a specific address as the default.

| Field      | Details                                  |
| ---------- | ---------------------------------------- |
| **Auth**   | Bearer token (any role)                  |
| **Params** | `addressId` — the address subdocument ID |

---

#### POST /users/push-token

Register or unregister an Expo push notification token.

| Field    | Details                 |
| -------- | ----------------------- |
| **Auth** | Bearer token (any role) |

**Request Body:**

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "action": "register",
  "platform": "ios",
  "appVersion": "1.2.0"
}
```

For unregister:

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "action": "unregister"
}
```

---

#### PUT /users/push-preferences

Toggle push notifications on/off.

| Field    | Details                 |
| -------- | ----------------------- |
| **Auth** | Bearer token (any role) |

**Request Body:**

```json
{
  "isPushEnabled": false
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "isPushEnabled": false
  }
}
```

---

#### GET /users/all

Admin/Staff — List all users with filters.

| Field            | Details                                       |
| ---------------- | --------------------------------------------- |
| **Auth**         | Bearer token + `users.read` permission        |
| **Query Params** | `role`, `search`, `isActive`, `page`, `limit` |

**Example:** `GET /users/all?role=customer&search=john&page=1&limit=20`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "users": [
      /* array of user objects */
    ],
    "pagination": {
      "totalCount": 45,
      "totalPages": 3,
      "currentPage": 1,
      "perPage": 20,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

#### PUT /users/:userId/active

Admin — Activate or deactivate a user account.

| Field      | Details                                 |
| ---------- | --------------------------------------- |
| **Auth**   | Bearer token + `users.write` permission |
| **Params** | `userId`                                |

**Request Body:**

```json
{
  "isActive": false
}
```

---

#### POST /users/staff

Admin — Create a new staff account with permissions.

| Field    | Details                   |
| -------- | ------------------------- |
| **Auth** | Bearer token (Admin only) |

**Request Body:**

```json
{
  "email": "newstaff@ecommerce.co.uk",
  "name": "New Staff Member",
  "password": "StaffPass123!",
  "permissions": {
    "catalog": { "read": true, "write": true },
    "orders": { "read": true, "write": false },
    "support": { "read": true, "write": true }
  }
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "newstaff@ecommerce.co.uk",
      "name": "New Staff Member",
      "role": "staff",
      "isEmailVerified": true,
      "isActive": true,
      "permissions": { "catalog": { "read": true, "write": true }, ... }
    }
  }
}
```

**Error Responses:**

- `409` — Email already exists
- `400` — Validation error

---

#### GET /users/permissions

Get the authenticated staff user's permissions.

| Field    | Details                                |
| -------- | -------------------------------------- |
| **Auth** | Bearer token + `users.read` permission |

**Success Response (200):**

```json
{
  "success": true,
  "permissions": {
    "catalog": { "read": true, "write": true },
    "orders": { "read": true, "write": false },
    "users": { "read": false, "write": false },
    "support": { "read": true, "write": true },
    "notifications": { "read": true, "write": false },
    "config": { "read": false, "write": false }
  }
}
```

---

#### PUT /users/:userId/permissions

Admin — Update a staff member's permissions.

| Field      | Details                                              |
| ---------- | ---------------------------------------------------- |
| **Auth**   | Bearer token + `users.write` permission (Admin only) |
| **Params** | `userId` — target staff user                         |

**Request Body:**

```json
{
  "permissions": {
    "catalog": { "read": true, "write": true },
    "orders": { "read": true, "write": true }
  }
}
```

---

#### PUT /users/:userId/bulk-buyer

Admin — Enable/disable bulk buyer status.

| Field      | Details                   |
| ---------- | ------------------------- |
| **Auth**   | Bearer token (Admin only) |
| **Params** | `userId`                  |

**Request Body:**

```json
{
  "isBulkBuyer": true
}
```

---

#### GET /users/bulk-buyers

Admin — List all bulk buyers.

| Field            | Details                   |
| ---------------- | ------------------------- |
| **Auth**         | Bearer token (Admin only) |
| **Query Params** | `page`, `limit`, `search` |

---

#### PUT /users/:userId/cod-eligibility

Admin — Enable/disable COD eligibility.

| Field      | Details                   |
| ---------- | ------------------------- |
| **Auth**   | Bearer token (Admin only) |
| **Params** | `userId`                  |

**Request Body:**

```json
{
  "isCodEnabled": true
}
```

---

#### GET /users/cod-eligible

Admin — List all COD-eligible users.

| Field            | Details                   |
| ---------------- | ------------------------- |
| **Auth**         | Bearer token (Admin only) |
| **Query Params** | `page`, `limit`, `search` |

---

### 5.3 Catalog Module (`/catalog`)

#### GET /catalog/products

List products with search, filter, sort, and pagination.

| Field            | Details       |
| ---------------- | ------------- |
| **Auth**         | None (public) |
| **Query Params** | See below     |

**Query Parameters:**

| Param             | Type    | Default  | Description                                                                                             |
| ----------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `search`          | string  | —        | Text search across name and description                                                                 |
| `category`        | string  | —        | Filter by category ID or slug                                                                           |
| `minPrice`        | number  | —        | Minimum effective price (uses discountedPrice if set)                                                   |
| `maxPrice`        | number  | —        | Maximum effective price (uses discountedPrice if set)                                                   |
| `featured`        | boolean | —        | Featured products only (`true` or `false`)                                                              |
| `inStock`         | boolean | —        | In-stock products only (`true` or `false`)                                                              |
| `attributes[Key]` | string  | —        | Attribute filter — OR within key, AND across keys. e.g. `attributes[Color]=Red,Blue&attributes[Size]=M` |
| `sortBy`          | string  | `newest` | `newest`, `price_asc`, `price_desc`, `name_asc`, `popularity`                                           |
| `status`          | string  | —        | Filter by status: `active`, `sold`, `draft` (admin use)                                                 |
| `includeAll`      | boolean | —        | Admin only: pass `true` to return all statuses. **Never pass `includeAll=false`** — just omit it.       |
| `page`            | integer | 1        | Page number                                                                                             |
| `limit`           | integer | 20       | Items per page (max 100)                                                                                |

> **Status Filtering Behaviour:**
>
> - No params → returns only `active` products (public storefront default)
> - `?status=draft` → draft products only
> - `?includeAll=true` → all statuses (admin overview)
> - `?includeAll=true&status=draft` → draft products only (admin filtered view)
> - **Never send `?includeAll=false`** — the string `"false"` was previously mishandled. Just omit the param entirely for storefront requests.

> **Price filter uses effective price** — `minPrice`/`maxPrice` filter on `discountedPrice` when set, otherwise `price`. The `availableFilters.priceRange` in the response also reflects effective prices, not base prices.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Wireless Headphones",
        "slug": "wireless-headphones",
        "description": "Premium noise-cancelling headphones",
        "minPrice": 59.99,
        "available": true,
        "status": "active",
        "category": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Electronics",
          "slug": "electronics"
        },
        "images": [
          {
            "url": "https://res.cloudinary.com/...",
            "publicId": "products/abc123"
          }
        ],
        "inventory": 50,
        "isFeatured": true,
        "averageRating": 4.5,
        "reviewCount": 12,
        "variantAttributes": [
          { "key": "Color", "values": ["Black", "White", "Blue"] }
        ],
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
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
        { "key": "Color", "values": ["Black", "Blue", "White"] },
        { "key": "Size", "values": ["L", "M", "S", "XL"] }
      ],
      "priceRange": { "min": 59.99, "max": 299.99 }
    }
  }
}
```

> **`availableFilters`** is `null` for admin requests (`includeAll=true`). For all storefront requests it is always populated. Use it to render the filter sidebar — attributes with only 1 distinct value are excluded automatically.
>
> **Price range uses effective price** — `priceRange.min/max` reflect `discountedPrice` when set, not base `price`.

---

#### GET /catalog/products/:idOrSlug

Get a single product by MongoDB ID or URL slug.

| Field      | Details                                |
| ---------- | -------------------------------------- |
| **Auth**   | None (public)                          |
| **Params** | `idOrSlug` — Product ID or slug string |

**Success Response (200):**

```json
{
  "success": true,
  "product": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Wireless Headphones",
    "slug": "wireless-headphones",
    "description": "Premium noise-cancelling headphones",
    "minPrice": 59.99,
    "available": true,
    "category": { "_id": "...", "name": "Electronics", "slug": "electronics" },
    "images": [{ "url": "...", "publicId": "..." }],
    "isFeatured": true,
    "averageRating": 4.5,
    "reviewCount": 12,
    "variantAttributes": [
      { "key": "Color", "values": ["Black", "White", "Blue"] },
      { "key": "Storage", "values": ["64GB", "128GB", "256GB"] }
    ],
    "variants": [
      {
        "_id": "var001",
        "sku": "WH-BLK-64",
        "attributes": [
          { "key": "Color", "value": "Black" },
          { "key": "Storage", "value": "64GB" }
        ],
        "price": 79.99,
        "effectivePrice": 79.99,
        "discountedPrice": null,
        "bulkPricing": { "minQuantity": 10, "bulkPrice": 69.99 },
        "image": "products/wh-blk-64-main",
        "imageUrl": "https://res.cloudinary.com/.../wh-blk-64-main",
        "inventory": 15,
        "available": true
      }
    ],
    "frequentlyBoughtTogether": ["productId1", "productId2"],
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

> **`frequentlyBoughtTogether`** — returns raw Product ObjectIds, **not populated**. The backend stores and returns the IDs only. To display a "Frequently Bought Together" or "You might also like" section, fetch each product separately:
>
> ```typescript
> // After loading the product detail
> const fbtProducts = await Promise.all(
>   product.frequentlyBoughtTogether.map((id) =>
>     api.get(`/catalog/products/${id}`).then((r) => r.data.data.product),
>   ),
> );
> ```
>
> Admin sets this list manually via `POST/PUT /catalog/products` with `"frequentlyBoughtTogether": ["id1", "id2"]`.

**Error Responses:**

- `404` — Product not found

---

#### POST /catalog/products

Create a new product. Products are created in `draft` status by default.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

**Request Body:**

```json
{
  "name": "Wireless Headphones",
  "slug": "wireless-headphones",
  "description": "Premium noise-cancelling headphones",
  "category": "507f1f77bcf86cd799439014",
  "isFeatured": true,
  "frequentlyBoughtTogether": ["productId1", "productId2"],
  "status": "draft"
}
```

**Validation Rules:**

- `slug` must be unique
- `status` must be one of: `active`, `sold`, `draft` (defaults to `draft` if omitted)
- Products no longer accept `price`, `discountedPrice`, `inventory`, or `bulkPricing` — all pricing and inventory is managed on variants

**Success Response (201):** Returns created product object.

---

#### PUT /catalog/products/:id

Update a product. Use this to change product status, bulk pricing, or any other field.

| Field      | Details                                   |
| ---------- | ----------------------------------------- |
| **Auth**   | Bearer token + `catalog.write` permission |
| **Params** | `id` — Product ID                         |

**Request Body:** Any subset of product fields.

**Status Transitions:**

```json
{ "status": "active" }   // Publish a draft → visible on storefront
{ "status": "sold" }     // Mark as sold → visible but not purchasable
{ "status": "draft" }    // Unpublish → hidden from public
```

> **Note:** `price`, `discountedPrice`, `inventory`, and `bulkPricing` are not accepted on the product — all pricing and inventory is managed on variants.y": 10, "bulkPrice": 64.99 } } // Set/update
> { "bulkPricing": null } // Remove

````

---

#### DELETE /catalog/products/:id

Soft-delete a product (sets `deletedAt` timestamp).

| Field | Details |
|---|---|
| **Auth** | Bearer token + `catalog.write` permission |
| **Params** | `id` — Product ID |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
````

---

#### POST /catalog/products/:id/images

Upload images to a product (max 5 files, max 5MB each).

| Field            | Details                                   |
| ---------------- | ----------------------------------------- |
| **Auth**         | Bearer token + `catalog.write` permission |
| **Content-Type** | multipart/form-data                       |
| **Field Name**   | `images` (array of files)                 |

**Success Response (200):** Returns updated product with new images array.

---

#### DELETE /catalog/products/:id/images/:publicId

Delete a specific image from a product and Cloudinary.

| Field      | Details                                              |
| ---------- | ---------------------------------------------------- |
| **Auth**   | Bearer token + `catalog.write` permission            |
| **Params** | `id` — Product ID, `publicId` — Cloudinary public ID |

---

#### GET /catalog/categories

List active categories. Without `parent` param, returns top-level categories. With `?parent=id`, returns subcategories of that parent.

| Field            | Details                                  |
| ---------------- | ---------------------------------------- |
| **Auth**         | None (public)                            |
| **Query Params** | `parent` (optional) — parent category ID |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Electronics",
        "slug": "electronics",
        "description": "Electronic devices and accessories",
        "parent": null,
        "image": { "url": "...", "publicId": "..." },
        "isActive": true,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### GET /catalog/categories/tree

Get all categories as a nested tree structure (top-level with children array).

| Field    | Details       |
| -------- | ------------- |
| **Auth** | None (public) |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Electronics",
        "slug": "electronics",
        "parent": null,
        "children": [
          {
            "_id": "...",
            "name": "Phones",
            "slug": "phones",
            "parent": "507f1f77bcf86cd799439014"
          },
          {
            "_id": "...",
            "name": "Laptops",
            "slug": "laptops",
            "parent": "507f1f77bcf86cd799439014"
          }
        ]
      }
    ]
  }
}
```

---

#### GET /catalog/categories/:idOrSlug

Get a single category by ID or slug.

| Field    | Details       |
| -------- | ------------- |
| **Auth** | None (public) |

---

#### POST /catalog/categories

Create a category.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

**Request Body:**

```json
{
  "name": "Phones",
  "slug": "phones",
  "description": "Smartphones and accessories",
  "parent": "507f1f77bcf86cd799439014"
}
```

> `parent` is optional. Set to a category ID for subcategories, or omit/null for top-level.
> `image` can be passed as `{ url, publicId }` if you manage Cloudinary uploads client-side. For server-side uploads use `POST /catalog/categories/:id/image` after creation.

---

#### PUT /catalog/categories/:id

Update a category.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

**Request Body:** Any subset of category fields (`name`, `slug`, `description`, `parent`, `isActive`).

---

#### DELETE /catalog/categories/:id

Permanently delete a category.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

---

#### POST /catalog/categories/:id/image

Upload or replace a category image via Cloudinary.

| Field            | Details                                           |
| ---------------- | ------------------------------------------------- |
| **Auth**         | Bearer token + `catalog.write` permission         |
| **Content-Type** | `multipart/form-data`                             |
| **Field name**   | `image` (single file, max 5MB, JPEG/PNG/WebP/GIF) |

If the category already has an image, the old one is deleted from Cloudinary automatically before the new one is uploaded.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "category": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Electronics",
      "slug": "electronics",
      "image": {
        "url": "https://res.cloudinary.com/.../categories/abc123.jpg",
        "publicId": "categories/abc123"
      }
    }
  }
}
```

```typescript
// Upload category image
const formData = new FormData();
formData.append('image', file); // single File object

await api.post(`/catalog/categories/${categoryId}/image`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

---

#### DELETE /catalog/categories/:id/image

Delete a category's image from Cloudinary and clear it from the document.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

**Error Responses:**

- `400` — Category has no image to delete
- `404` — Category not found

---

#### GET /catalog/products/:productId/reviews

List reviews for a product.

| Field      | Details       |
| ---------- | ------------- |
| **Auth**   | None (public) |
| **Params** | `productId`   |

**Success Response (200):**

```json
{
  "success": true,
  "reviews": [
    {
      "_id": "rev001",
      "user": { "_id": "...", "name": "John Doe" },
      "rating": 4,
      "comment": "Great product, highly recommend!",
      "createdAt": "2025-02-01T10:00:00.000Z"
    }
  ]
}
```

---

#### POST /catalog/products/:productId/reviews

Submit a product review.

| Field    | Details                                                  |
| -------- | -------------------------------------------------------- |
| **Auth** | Bearer token (customer, must have purchased the product) |

**Request Body:**

```json
{
  "rating": 4,
  "comment": "Great product, highly recommend!"
}
```

**Validation:**

- `rating`: integer 1-5 (required)
- `comment`: string (optional)
- User must have a delivered order containing this product
- One review per user per product

**Error Responses:**

- `400` — Duplicate review
- `403` — User has not purchased this product

---

#### POST /catalog/coupons/validate

Validate a coupon code against an order total. Use this for the live discount preview before the user submits checkout.

| Field    | Details                               |
| -------- | ------------------------------------- |
| **Auth** | Bearer token (any authenticated user) |

> This endpoint is **read-only** — it never increments usage count. It is safe to call on every keystroke or cart update for live preview.

**Request Body:**

```json
{
  "code": "SAVE20",
  "orderTotal": 100
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "discount": 20
  }
}
```

**Error Responses:**

- `400` — Coupon expired, over global usage limit, per-user limit reached, or below minimum order amount
- `403` — Coupon has `perUserLimit` set but user is not authenticated (must log in to use it)

---

#### GET /catalog/coupons

List all coupons (admin/staff).

| Field    | Details                                  |
| -------- | ---------------------------------------- |
| **Auth** | Bearer token + `catalog.read` permission |

**Success Response (200):**

```json
{
  "success": true,
  "coupons": [
    {
      "_id": "coupon001",
      "code": "SAVE20",
      "discountType": "percentage",
      "discountValue": 20,
      "minimumOrderAmount": 50,
      "expiryDate": "2025-12-31T23:59:59.000Z",
      "usageLimit": 100,
      "usageCount": 23,
      "perUserLimit": 1,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST /catalog/coupons

Create a coupon.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

**Request Body:**

```json
{
  "code": "SAVE20",
  "discountType": "percentage",
  "discountValue": 20,
  "minimumOrderAmount": 50,
  "expiryDate": "2025-12-31T23:59:59Z",
  "usageLimit": 100,
  "perUserLimit": 1
}
```

**`discountType` options:** `percentage` | `fixed`

**`perUserLimit` options:**
| Value | Behaviour |
|---|---|
| `null` (default) | Unlimited uses per customer |
| `1` | One-time use per customer |
| `N` | Up to N uses per customer |

> Per-user limit is enforced at both the preview endpoint (`POST /coupons/validate`) and at checkout. Coupons with `perUserLimit` set **require authentication** — guests receive `403` and must log in to use them. Coupons with `perUserLimit: null` (unlimited) work for both authenticated users and guests.

---

#### PUT /catalog/coupons/:id

Update a coupon.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

**Request Body:** Any subset of coupon fields including `perUserLimit`. Pass `null` to remove the per-user limit.

---

#### DELETE /catalog/coupons/:id

Permanently delete a coupon.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

---

### 5.4 Variants Module (`/variants`)

#### POST /variants/products/:productId/attributes

Define variant attributes for a product (e.g., Size, Color).

| Field      | Details                                   |
| ---------- | ----------------------------------------- |
| **Auth**   | Bearer token + `catalog.write` permission |
| **Params** | `productId`                               |

**Request Body:**

```json
{
  "attributes": [
    { "key": "Size", "values": ["S", "M", "L", "XL"] },
    { "key": "Color", "values": ["Red", "Blue", "Black"] }
  ]
}
```

---

#### PUT /variants/products/:productId/attributes

Replace variant attribute definitions.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

Same body format as POST.

---

#### DELETE /variants/products/:productId/attributes

Remove all variant attributes from a product.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

---

#### GET /variants/products/:productId

List all active variants for a product.

| Field      | Details                                                         |
| ---------- | --------------------------------------------------------------- |
| **Auth**   | None (public)                                                   |
| **Params** | `productId`                                                     |
| **Cache**  | 5 minutes (Redis). Invalidated on any variant/attribute change. |

> `imageUrl` is pre-resolved by the backend — use it directly. Falls back to the first product image if the variant has no specific image assigned.

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "variants": [
      {
        "_id": "var001",
        "product": "507f1f77bcf86cd799439013",
        "sku": "TSH-RED-M",
        "attributes": [
          { "key": "Color", "value": "Red" },
          { "key": "Size", "value": "M" }
        ],
        "price": 24.99,
        "discountedPrice": null,
        "bulkPricing": { "minQuantity": 10, "bulkPrice": 19.99 },
        "image": "products/tshirt-red-main",
        "imageUrl": "https://res.cloudinary.com/.../tshirt-red-main",
        "inventory": 25,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### POST /variants/products/:productId

Create a variant for a product.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

**Request Body:**

```json
{
  "sku": "TSH-RED-M",
  "attributes": [
    { "key": "Color", "value": "Red" },
    { "key": "Size", "value": "M" }
  ],
  "price": 24.99,
  "discountedPrice": null,
  "bulkPricing": { "minQuantity": 10, "bulkPrice": 19.99 },
  "image": "products/tshirt-red-main",
  "inventory": 25
}
```

**Notes:**

- `sku` is auto-generated if not provided
- `price` is **required** — the base selling price for this variant
- `inventory` is **required** — must be >= 0
- `discountedPrice` is optional — if set, must be less than `price`
- Attribute keys must match the product's defined `variantAttributes`
- `bulkPricing` is optional — if set, `bulkPrice` must be > 0 and less than the effective retail price (`discountedPrice` if set, otherwise `price`); `minQuantity` must be >= 2
- `image` is optional — pass a `publicId` from the product's existing images array. Pass `null` to clear.
- Returns `409` if duplicate attribute combination exists

---

#### PUT /variants/:variantId

Update a variant.

| Field      | Details                                   |
| ---------- | ----------------------------------------- |
| **Auth**   | Bearer token + `catalog.write` permission |
| **Params** | `variantId`                               |

**Request Body:** Any subset of variant fields (sku, attributes, price, discountedPrice, bulkPricing, image, inventory).

- `price` — if updated, must be > 0; `discountedPrice` (if set) must remain < `price`
- Pass `"bulkPricing": null` to remove variant-level bulk pricing
- Pass `"image": "publicId"` to assign a product image to this variant
- Pass `"image": null` to clear the variant image (falls back to first product image)

---

#### DELETE /variants/:variantId

Soft-delete a variant (sets `deletedAt` — never hard-deleted).

| Field      | Details                                   |
| ---------- | ----------------------------------------- |
| **Auth**   | Bearer token + `catalog.write` permission |
| **Params** | `variantId`                               |

**What happens after soft-delete:**

| Where                                  | Behaviour                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Product listing / detail               | Variant excluded from `variants` array immediately (cache invalidated)                                   |
| Add to cart                            | `400 Variant is no longer available`                                                                     |
| Update cart quantity                   | `404 Variant no longer available`                                                                        |
| `GET /orders/cart`                     | Item silently removed from cart response; cart saved clean in DB                                         |
| Checkout                               | `400 Variant not found or no longer available`                                                           |
| Pending Stripe orders (already placed) | Order still confirms on payment; inventory decrement skipped for deleted variant — no negative inventory |
| Confirmed/delivered orders             | Fully safe — price, SKU, and attributes were snapshotted at checkout time                                |

> **Admin note:** If a variant has pending Stripe orders against it (placed but not yet paid), soft-deleting it is safe — the order will still confirm when the customer pays, but inventory won't be decremented for that variant.

---

#### PATCH /variants/:variantId/inventory

Update variant inventory (absolute or relative).

| Field      | Details                                   |
| ---------- | ----------------------------------------- |
| **Auth**   | Bearer token + `catalog.write` permission |
| **Params** | `variantId`                               |

**Request Body (absolute):**

```json
{
  "quantity": 50
}
```

**Request Body (relative adjustment):**

```json
{
  "adjustment": -5
}
```

**Error Responses:**

- `400` — Adjustment would result in negative inventory

---

### 5.5 Orders Module (`/orders`)

#### GET /orders/cart

Get the authenticated user's cart.

| Field    | Details      |
| -------- | ------------ |
| **Auth** | Bearer token |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "cart": {
      "items": [
        {
          "_id": "cartitem001",
          "product": {
            "_id": "507f1f77bcf86cd799439013",
            "name": "Wireless Headphones",
            "slug": "wireless-headphones",
            "images": [{ "url": "..." }],
            "variantAttributes": [
              { "key": "Color", "values": ["Black", "White", "Blue"] }
            ]
          },
          "variant": {
            "_id": "var001",
            "sku": "WH-BLK",
            "attributes": [{ "key": "Color", "value": "Black" }],
            "price": 79.99,
            "discountedPrice": null,
            "bulkPricing": null,
            "inventory": 15,
            "image": "products/wh-blk-main"
          },
          "quantity": 2
        }
      ]
    }
  }
}
```

> **Cart item `_id` note:** The cart item `_id` is returned in every cart response. Use `items[n]._id` as the `itemId` for update/remove operations — NOT the productId.

````

---

#### POST /orders/cart

Add item to cart.

| Field | Details |
|---|---|
| **Auth** | Bearer token |

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439013",
  "quantity": 2,
  "variantId": "var001"
}
````

**Notes:**

- `variantId` is **required** — all products are sold through variants
- If the same product+variant combination is already in cart, quantity is incremented

---

#### PUT /orders/cart/:itemId

Update cart item quantity.

| Field      | Details                                                                     |
| ---------- | --------------------------------------------------------------------------- |
| **Auth**   | Bearer token                                                                |
| **Params** | `itemId` — the cart item's `_id` (from `items[n]._id` in the cart response) |

**Request Body:**

```json
{
  "quantity": 3
}
```

**Notes:**

- Setting quantity to `0` removes the item from cart

---

#### DELETE /orders/cart/:itemId

Remove a specific item from cart.

| Field      | Details                                                                     |
| ---------- | --------------------------------------------------------------------------- |
| **Auth**   | Bearer token                                                                |
| **Params** | `itemId` — the cart item's `_id` (from `items[n]._id` in the cart response) |

---

#### DELETE /orders/cart

Clear all items from cart.

| Field    | Details      |
| -------- | ------------ |
| **Auth** | Bearer token |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Cart cleared"
  }
}
```

---

#### POST /orders/checkout

Process checkout.

| Field          | Details                                           |
| -------------- | ------------------------------------------------- |
| **Auth**       | Bearer token (optional — supports guest checkout) |
| **Rate Limit** | 5 requests per IP per minute                      |

**Coupon security notes:**

- Coupon usage is claimed **atomically** at checkout — the global limit check and increment happen in a single DB operation, preventing two simultaneous checkouts from both slipping through a nearly-exhausted coupon
- Coupons with `perUserLimit` set require authentication — guests receive `403`
- The coupon is applied **once per checkout submission** — submitting the same order twice is blocked by the rate limiter and by the fact that each submission creates a new order

**Request Body (Authenticated User — uses cart):**

```json
{
  "deliveryAddress": {
    "fullName": "Jane Smith",
    "phone": "+447700900000",
    "line1": "123 High Street",
    "line2": "Flat 4",
    "city": "London",
    "county": "Greater London",
    "postcode": "SW1A 1AA",
    "country": "GB"
  },
  "billingAddress": {
    "fullName": "Jane Smith",
    "line1": "123 High Street",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "GB"
  },
  "deliveryNotes": "Leave with neighbour if not home",
  "paymentMethod": "stripe",
  "couponCode": "SAVE20"
}
```

**Request Body (Guest Checkout — items in body):**

```json
{
  "items": [{ "productId": "507f...", "quantity": 2, "variantId": "var001" }],
  "deliveryAddress": {
    /* ... */
  },
  "paymentMethod": "stripe",
  "guestEmail": "guest@example.com"
}
```

> **Note:** `variantId` is **required** on every item for both authenticated cart checkout and guest checkout.

````

**Success Response (201) — Stripe:**
```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "ord001",
      "orderId": "ORD-A1B2C3",
      "status": "pending",
      "paymentStatus": "unpaid",
      "items": [ /* ... */ ],
      "subtotal": 119.98,
      "tax": 24.00,
      "deliveryFee": 5.99,
      "discount": 20.00,
      "total": 129.97,
      "paymentMethod": "stripe",
      "deliveryAddress": { /* ... */ },
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    "clientSecret": "pi_1234_secret_5678"
  }
}
````

**Success Response (201) — COD:**

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "ord001",
      "orderId": "ORD-A1B2C3",
      "status": "confirmed",
      "paymentStatus": "cod_pending",
      "items": [
        /* ... */
      ],
      "total": 129.97,
      "paymentMethod": "cod"
    }
  }
}
```

**Error Responses:**

- `400` — Insufficient stock, invalid coupon, COD not eligible

---

#### GET /orders

Get authenticated user's order history (paginated).

| Field            | Details         |
| ---------------- | --------------- |
| **Auth**         | Bearer token    |
| **Query Params** | `page`, `limit` |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "ord001",
        "orderId": "ORD-A1B2C3",
        "status": "delivered",
        "items": [
          {
            "product": { "_id": "...", "name": "Wireless Headphones", "images": [...] },
            "variant": { "_id": "...", "attributes": [...] },
            "quantity": 2,
            "price": 59.99
          }
        ],
        "subtotal": 119.98,
        "tax": 24.00,
        "deliveryFee": 5.99,
        "discount": 0,
        "total": 149.97,
        "paymentMethod": "stripe",
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 12,
      "totalPages": 1,
      "currentPage": 1,
      "perPage": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

#### GET /orders/:orderId

Get a single order by its human-readable ID.

| Field      | Details                        |
| ---------- | ------------------------------ |
| **Auth**   | Bearer token (owner only)      |
| **Params** | `orderId` — e.g., "ORD-A1B2C3" |

---

#### GET /orders/guest/:orderId?email=guest@example.com

Guest order lookup (no auth required).

| Field      | Details                                                          |
| ---------- | ---------------------------------------------------------------- |
| **Auth**   | None                                                             |
| **Params** | `orderId`                                                        |
| **Query**  | `email` (required) — must match the guest email used at checkout |

---

#### POST /orders/:orderId/cancel

Cancel a pending order (customer only).

| Field      | Details                    |
| ---------- | -------------------------- |
| **Auth**   | Bearer token (order owner) |
| **Params** | `orderId`                  |

**Cancellable statuses:** `pending`, `confirmed`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "order": {
      /* order with status: "cancelled" */
    }
  }
}
```

**Error Responses:**

- `400` — Order cannot be cancelled in its current status

---

#### POST /orders/:orderId/reorder

Re-add items from a past order to cart.

| Field      | Details                    |
| ---------- | -------------------------- |
| **Auth**   | Bearer token (order owner) |
| **Params** | `orderId`                  |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "addedItems": 3,
    "skippedItems": 1,
    "message": "3 item(s) added to cart. 1 item(s) skipped."
  }
}
```

---

#### GET /orders/admin

Admin — List all orders with filters.

| Field            | Details                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------- |
| **Auth**         | Bearer token + `orders.read` permission                                                       |
| **Query Params** | `status`, `paymentStatus`, `paymentMethod`, `search`, `startDate`, `endDate`, `page`, `limit` |

**Query Parameters:**

| Param           | Type    | Description                                                                                                         |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `status`        | string  | Filter by fulfilment status: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `picked_up`, `cancelled` |
| `paymentStatus` | string  | Filter by payment status: `unpaid`, `paid`, `failed`, `refunded`, `cod_pending`                                     |
| `paymentMethod` | string  | Filter by payment method: `stripe`, `cod`                                                                           |
| `search`        | string  | Search by `orderId` or `guestEmail` (case-insensitive)                                                              |
| `startDate`     | string  | ISO date — return orders created on or after this date                                                              |
| `endDate`       | string  | ISO date — return orders created on or before this date                                                             |
| `page`          | integer | Page number (default: 1)                                                                                            |
| `limit`         | integer | Items per page (default: 20)                                                                                        |

**Examples:**

```
GET /orders/admin?status=confirmed&paymentMethod=stripe&page=1
GET /orders/admin?paymentStatus=cod_pending
GET /orders/admin?paymentStatus=unpaid&paymentMethod=stripe
GET /orders/admin?paymentStatus=paid&status=delivered&page=1&limit=50
```

---

#### GET /orders/admin/:orderId

Admin/Staff — Get full detail for any single order by its human-readable ID. No user scope — returns any order regardless of owner.

| Field      | Details                                 |
| ---------- | --------------------------------------- |
| **Auth**   | Bearer token + `orders.read` permission |
| **Params** | `orderId` — e.g. `ORD-A1B2C3`           |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "...",
      "orderId": "ORD-A1B2C3",
      "user": {
        "_id": "...",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "guestEmail": null,
      "items": [
        {
          "product": {
            "_id": "...",
            "name": "Wireless Headphones",
            "slug": "wireless-headphones",
            "images": [{ "url": "...", "publicId": "..." }]
          },
          "variant": {
            "_id": "...",
            "sku": "WH-BLK-64",
            "attributes": [{ "key": "Color", "value": "Black" }],
            "price": 79.99,
            "discountedPrice": null
          },
          "variantAttributes": [{ "key": "Color", "value": "Black" }],
          "variantSku": "WH-BLK-64",
          "name": "Wireless Headphones",
          "price": 59.99,
          "quantity": 2,
          "isBulkPriceApplied": false
        }
      ],
      "subtotal": 119.98,
      "discount": 20.0,
      "couponCode": "SAVE20",
      "taxRate": 20,
      "taxAmount": 20.0,
      "deliveryFee": 5.99,
      "total": 125.97,
      "currency": "GBP",
      "deliveryAddress": {
        "fullName": "Jane Smith",
        "phone": "+447700900000",
        "line1": "123 High Street",
        "line2": "Flat 4",
        "city": "London",
        "county": "Greater London",
        "postcode": "SW1A 1AA",
        "country": "GB"
      },
      "billingAddress": {
        "fullName": "Jane Smith",
        "line1": "123 High Street",
        "line2": "Flat 4",
        "city": "London",
        "county": "Greater London",
        "postcode": "SW1A 1AA",
        "country": "GB"
      },
      "deliveryNotes": "Leave with neighbour if not home",
      "estimatedDelivery": null,
      "paymentMethod": "stripe",
      "stripePaymentIntentId": "pi_1234",
      "status": "delivered",
      "paymentStatus": "paid",
      "statusHistory": [
        {
          "status": "pending",
          "paymentStatus": "unpaid",
          "changedAt": "2025-01-15T10:30:00.000Z",
          "changedBy": null
        },
        {
          "status": "confirmed",
          "paymentStatus": "paid",
          "changedAt": "2025-01-15T10:31:00.000Z",
          "changedBy": null
        },
        {
          "status": "shipped",
          "paymentStatus": "paid",
          "changedAt": "2025-01-16T09:00:00.000Z",
          "changedBy": { "_id": "...", "name": "Staff User" }
        },
        {
          "status": "delivered",
          "paymentStatus": "paid",
          "changedAt": "2025-01-18T14:00:00.000Z",
          "changedBy": { "_id": "...", "name": "Staff User" }
        }
      ],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-18T14:00:00.000Z"
    }
  }
}
```

**Populated fields:**

- `user` — `name`, `email` (null for guest orders — use `guestEmail` instead)
- `items[].product` — `name`, `images`, `slug`
- `items[].variant` — `sku`, `attributes`, `price`, `discountedPrice`
- `statusHistory[].changedBy` — `name` (null for system-generated entries e.g. Stripe webhook)

**All order fields returned** — `deliveryAddress`, `billingAddress`, `deliveryNotes`, `estimatedDelivery`, `subtotal`, `discount`, `couponCode`, `taxRate`, `taxAmount`, `deliveryFee`, `total`, `currency`, `stripePaymentIntentId`, `statusHistory` — nothing is omitted.

**Error Responses:**

- `404` — No order with that ID exists

---

#### PUT /orders/:orderId/status

Admin/Staff — Update order status.

| Field      | Details                                  |
| ---------- | ---------------------------------------- |
| **Auth**   | Bearer token + `orders.write` permission |
| **Params** | `orderId`                                |

**Request Body:**

```json
{
  "status": "shipped",
  "estimatedDelivery": "2025-06-20T00:00:00.000Z"
}
```

**Fields:**

- `status` — required. One of: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `picked_up`, `cancelled`
- `estimatedDelivery` — optional ISO 8601 date string. Set when marking as `shipped` to show the customer an expected delivery date in the shipped email. Automatically cleared when status is set to `delivered`.

**When to set `estimatedDelivery`:**

```typescript
// When marking as shipped, include the estimated delivery date
await api.put(`/orders/${orderId}/status`, {
  status: 'shipped',
  estimatedDelivery: new Date(
    Date.now() + 5 * 24 * 60 * 60 * 1000,
  ).toISOString(), // 5 days from now
});

// For other status changes, omit it
await api.put(`/orders/${orderId}/status`, { status: 'confirmed' });
```

The `estimatedDelivery` date is included in the "order shipped" email sent to the customer automatically.

**Payment statuses** (separate endpoint `PUT /:orderId/payment-status`): `unpaid`, `paid`, `failed`, `refunded`, `cod_pending`

---

#### PUT /orders/bulk-status

Admin/Staff — Update the status of multiple orders in a single request. Use this instead of looping `PUT /:orderId/status` for batch fulfilment workflows (e.g., marking a courier collection as shipped).

| Field            | Details                                  |
| ---------------- | ---------------------------------------- |
| **Auth**         | Bearer token + `orders.write` permission |
| **Content-Type** | application/json                         |

**Request Body:**

```json
{
  "orderIds": ["ORD-ABC123", "ORD-DEF456", "ORD-GHI789"],
  "status": "shipped",
  "estimatedDelivery": "2025-06-20T00:00:00.000Z"
}
```

- `estimatedDelivery` — optional ISO 8601 date. Applied to **all** orders in the batch. Most useful when `status` is `shipped`. Automatically cleared on all orders when `status` is `delivered`.

**Validation rules:**

- `orderIds`: required, non-empty array of strings, max 100 items
- `status`: required, one of `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `picked_up`, `cancelled`
- Duplicate `orderIds` in the same request are deduplicated — extras are reported as `failed` with `reason: "duplicate"`

**Success Response (200) — all updated:**

```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0
  }
}
```

> When `failed` is `0`, the `failedIds` key is **absent** from the response (not `null` or `[]`). Check for `data.failed === 0` rather than `!data.failedIds`.

**Success Response (200) — partial failure:**

```json
{
  "success": true,
  "data": {
    "updated": 2,
    "failed": 1,
    "failedIds": [{ "orderId": "ORD-GHI789", "reason": "not_found" }]
  }
}
```

**Success Response (200) — all failed:**

```json
{
  "success": true,
  "data": {
    "updated": 0,
    "failed": 3,
    "failedIds": [
      { "orderId": "ORD-ABC123", "reason": "already_in_status" },
      { "orderId": "ORD-DEF456", "reason": "already_in_status" },
      { "orderId": "ORD-GHI789", "reason": "not_found" }
    ]
  }
}
```

> The endpoint always returns HTTP **200** — even when all orders fail. Check `data.failed` and `data.failedIds` to determine partial or full failure.

**`failedIds[].reason` values:**

| Reason              | Meaning                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `not_found`         | No order with that ID exists in the database                                                  |
| `already_in_status` | Order is already in the requested target status (idempotent — safe to retry)                  |
| `duplicate`         | Same `orderId` appeared more than once in the request; only the first occurrence is processed |
| `write_error`       | Transient DB write failure for this specific order; others in the batch were unaffected       |

**Invariant:** `data.updated + data.failed` always equals `orderIds.length`.

**Email notifications:** When `status` is `shipped` or `delivered`, the backend automatically queues one notification email per successfully updated order (same behaviour as the single-order endpoint). No frontend action required.

**Error Responses:**

- `400` — Validation error (missing `orderIds`, empty array, >100 items, invalid `status` value)
- `401` — Missing or invalid Bearer token
- `403` — Authenticated user lacks `orders.write` permission

**TypeScript usage example:**

```typescript
interface BulkStatusFailure {
  orderId: string;
  reason: 'not_found' | 'already_in_status' | 'duplicate' | 'write_error';
}

interface BulkStatusResult {
  updated: number;
  failed: number;
  failedIds?: BulkStatusFailure[];
}

async function bulkUpdateOrderStatus(
  orderIds: string[],
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'picked_up'
    | 'cancelled',
  estimatedDelivery?: string | null,
): Promise<BulkStatusResult> {
  const { data } = await api.put('/orders/bulk-status', {
    orderIds,
    status,
    estimatedDelivery,
  });
  return data.data as BulkStatusResult;
}

// Usage in admin orders table
const result = await bulkUpdateOrderStatus(selectedOrderIds, 'shipped');

if (result.failed > 0) {
  const failedIds = result.failedIds!.map((f) => f.orderId).join(', ');
  toast.warning(
    `${result.updated} updated, ${result.failed} failed: ${failedIds}`,
  );
} else {
  toast.success(`${result.updated} orders marked as shipped`);
}
```

**Admin UI implementation notes:**

- Add a checkbox column to the orders table (`/admin/orders`) to enable multi-select
- Show a "Bulk Actions" action bar when ≥1 order is selected with two separate dropdowns:
  - **"Update Status"** — lists all 6 fulfilment statuses → calls `PUT /orders/bulk-status`. When `shipped` is selected, show a date picker for `estimatedDelivery` (optional, applied to all orders in the batch)
  - **"Update Payment Status"** — lists all 5 payment statuses → calls `PUT /orders/bulk-payment-status`
- After a successful call, refresh the orders list and deselect all rows
- Display a summary toast: `"N updated, M failed"` — link to a modal showing `failedIds` details if `failed > 0`
- Disable the action bar submit button while the request is in-flight to prevent double-submission
- The endpoint accepts up to 100 IDs per request — if the user selects more than 100, chunk the array and call the endpoint in sequential batches

---

#### PUT /orders/bulk-payment-status

Admin/Staff — Update the payment status of multiple orders in a single request. Use this for batch payment reconciliation workflows (e.g., marking a batch of COD orders as `paid` after cash collection, or bulk-marking failed Stripe orders as `failed`).

| Field            | Details                                  |
| ---------------- | ---------------------------------------- |
| **Auth**         | Bearer token + `orders.write` permission |
| **Content-Type** | application/json                         |

**Request Body:**

```json
{
  "orderIds": ["ORD-ABC123", "ORD-DEF456", "ORD-GHI789"],
  "paymentStatus": "paid"
}
```

**Validation rules:**

- `orderIds`: required, non-empty array of strings, max 100 items (evaluated before deduplication)
- `paymentStatus`: required, one of `unpaid`, `paid`, `failed`, `refunded`, `cod_pending` — exact case-sensitive match, no whitespace trimming
- Duplicate `orderIds` in the same request are deduplicated — extras are reported as `failed` with `reason: "duplicate"`

**Success Response (200) — all updated:**

```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0
  }
}
```

> When `failed` is `0`, the `failedIds` key is **absent** from the response (not `null` or `[]`). Check `data.failed === 0` rather than `!data.failedIds`.

**Success Response (200) — partial failure:**

```json
{
  "success": true,
  "data": {
    "updated": 2,
    "failed": 1,
    "failedIds": [{ "orderId": "ORD-GHI789", "reason": "not_found" }]
  }
}
```

> The endpoint always returns HTTP **200** — even when all orders fail. Check `data.failed` and `data.failedIds` to determine partial or full failure.

**`failedIds[].reason` values:**

| Reason              | Meaning                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `not_found`         | No order with that ID exists in the database                                                  |
| `already_in_status` | Order is already in the requested target payment status (idempotent — safe to retry)          |
| `duplicate`         | Same `orderId` appeared more than once in the request; only the first occurrence is processed |
| `write_error`       | Transient DB write failure for this specific order; others in the batch were unaffected       |

**Invariant:** `data.updated + data.failed` always equals `orderIds.length`.

**No email notifications** — this endpoint does not send any emails, consistent with the single-order `PUT /:orderId/payment-status` behaviour.

**Error Responses:**

- `400` — Validation error (missing `orderIds`, empty array, >100 items, invalid `paymentStatus` value, whitespace-padded value)
- `401` — Missing or invalid Bearer token
- `403` — Authenticated user lacks `orders.write` permission

**TypeScript usage example:**

```typescript
type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded' | 'cod_pending';

type BulkFailReason =
  | 'not_found'
  | 'already_in_status'
  | 'duplicate'
  | 'write_error';

interface BulkPaymentStatusResult {
  updated: number;
  failed: number;
  failedIds?: Array<{ orderId: string; reason: BulkFailReason }>;
}

async function bulkUpdatePaymentStatus(
  orderIds: string[],
  paymentStatus: PaymentStatus,
): Promise<BulkPaymentStatusResult> {
  const { data } = await api.put('/orders/bulk-payment-status', {
    orderIds,
    paymentStatus,
  });
  return data.data as BulkPaymentStatusResult;
}

// Usage — e.g., marking COD orders as paid after cash collection
const result = await bulkUpdatePaymentStatus(selectedOrderIds, 'paid');

if (result.failed > 0) {
  const failedIds = result.failedIds!.map((f) => f.orderId).join(', ');
  toast.warning(
    `${result.updated} updated, ${result.failed} failed: ${failedIds}`,
  );
} else {
  toast.success(`${result.updated} orders marked as paid`);
}
```

**Admin UI implementation notes:**

- Add a "Bulk Update Payment Status" action to the orders table multi-select action bar (alongside the existing "Bulk Update Status" action)
- The payment status dropdown should list all 5 valid values: `unpaid`, `paid`, `failed`, `refunded`, `cod_pending`
- After a successful call, refresh the orders list and deselect all rows
- Display a summary toast: `"N updated, M failed"` — link to a modal showing `failedIds` details if `failed > 0`
- The endpoint accepts up to 100 IDs per request — chunk larger selections into sequential batches of 100

---

#### POST /orders/:orderId/refund

Admin/Staff — Process Stripe refund.

| Field      | Details                                  |
| ---------- | ---------------------------------------- |
| **Auth**   | Bearer token + `orders.write` permission |
| **Params** | `orderId`                                |

**Prerequisites:**

- Order must have been paid via Stripe
- Platform config `isRefundsEnabled` must be `true`

---

#### POST /orders/webhook/stripe

Stripe webhook endpoint (do not call from frontend).

| Field              | Details                                                     |
| ------------------ | ----------------------------------------------------------- |
| **Auth**           | Stripe signature verification (not Bearer token)            |
| **Events Handled** | `payment_intent.succeeded`, `payment_intent.payment_failed` |

---

### 5.6 Analytics Module (`/analytics`)

> All analytics endpoints require **Admin** role.

#### GET /analytics/dashboard

Quick stats for the admin dashboard.

| Field    | Details                   |
| -------- | ------------------------- |
| **Auth** | Bearer token (Admin only) |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "totalOrders": 350,
    "totalRevenue": 45230.5,
    "totalCustomers": 120,
    "totalProducts": 85,
    "pendingOrders": 12,
    "todaysOrders": 8,
    "todaysRevenue": 1250.0
  }
}
```

---

#### GET /analytics/sales

Revenue and order metrics for a date range.

| Field            | Details                                                        |
| ---------------- | -------------------------------------------------------------- |
| **Auth**         | Bearer token (Admin only)                                      |
| **Query Params** | `period` (today, 7d, 30d, 90d, custom), `startDate`, `endDate` |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "totalRevenue": 15420.5,
    "totalOrders": 142,
    "averageOrderValue": 108.59,
    "dailyBreakdown": [
      { "date": "2025-05-01", "revenue": 520.0, "orders": 5 },
      { "date": "2025-05-02", "revenue": 890.5, "orders": 8 }
    ]
  }
}
```

---

#### GET /analytics/top-products

Best-selling products ranked by quantity sold.

| Field            | Details                                                         |
| ---------------- | --------------------------------------------------------------- |
| **Auth**         | Bearer token (Admin only)                                       |
| **Query Params** | `period`, `startDate`, `endDate`, `limit` (default 10, max 100) |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "productId": "507f...",
        "name": "Wireless Headphones",
        "quantitySold": 89,
        "revenue": 5340.11,
        "currentInventory": 15
      }
    ]
  }
}
```

---

#### GET /analytics/categories

Category performance metrics.

| Field            | Details                          |
| ---------------- | -------------------------------- |
| **Auth**         | Bearer token (Admin only)        |
| **Query Params** | `period`, `startDate`, `endDate` |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "categoryId": "507f...",
        "name": "Electronics",
        "revenue": 12500.0,
        "orders": 85,
        "percentage": 45.2
      }
    ]
  }
}
```

---

#### GET /analytics/customers

Customer metrics and distributions.

| Field            | Details                          |
| ---------------- | -------------------------------- |
| **Auth**         | Bearer token (Admin only)        |
| **Query Params** | `period`, `startDate`, `endDate` |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "totalCustomers": 120,
    "newCustomers": 15,
    "activeCustomers": 45,
    "orderStatusDistribution": [
      { "status": "delivered", "count": 250 },
      { "status": "confirmed", "count": 30 },
      { "status": "cancelled", "count": 12 }
    ],
    "paymentMethodDistribution": [
      { "method": "stripe", "count": 280, "total": 38500.0 },
      { "method": "cod", "count": 70, "total": 6730.5 }
    ]
  }
}
```

---

### 5.7 Wishlist Module (`/wishlist`)

#### GET /wishlist

Get user's wishlist (paginated).

| Field            | Details                   |
| ---------------- | ------------------------- |
| **Auth**         | Bearer token              |
| **Query Params** | `page`, `limit` (max 100) |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "wish001",
        "product": {
          "_id": "507f...",
          "name": "Wireless Headphones",
          "slug": "wireless-headphones",
          "images": [{ "url": "..." }],
          "variantAttributes": [
            { "key": "Color", "values": ["Black", "White", "Blue"] }
          ]
        },
        "minPrice": 59.99,
        "effectivePrice": 59.99,
        "available": true,
        "addedAt": "2025-01-10T08:00:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 5,
      "totalPages": 1,
      "currentPage": 1,
      "perPage": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

#### POST /wishlist

Add item to wishlist.

| Field    | Details      |
| -------- | ------------ |
| **Auth** | Bearer token |

**Request Body:**

```json
{
  "productId": "507f1f77bcf86cd799439013"
}
```

**Notes:**

- Wishlist is product-based — one entry per product, no variant tracking
- Variant selection happens at add-to-cart time, not wishlist time
- Returns `409` if product is already wishlisted

---

#### DELETE /wishlist/:itemId

Remove item from wishlist.

| Field      | Details                     |
| ---------- | --------------------------- |
| **Auth**   | Bearer token                |
| **Params** | `itemId` — wishlist item ID |

---

#### GET /wishlist/check/:productId

Check if a product is in the user's wishlist.

| Field      | Details      |
| ---------- | ------------ |
| **Auth**   | Bearer token |
| **Params** | `productId`  |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "isWishlisted": true,
    "itemId": "wish001"
  }
}
```

---

### 5.8 Banners Module (`/banners`)

#### GET /banners

List banners (public).

| Field            | Details                                                             |
| ---------------- | ------------------------------------------------------------------- |
| **Auth**         | None (public)                                                       |
| **Query Params** | `active` (boolean) — if true, returns only currently active banners |

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "banners": [
      {
        "_id": "ban001",
        "title": "Summer Sale",
        "subtitle": "Up to 50% off electronics",
        "link": "/sale/electronics",
        "image": {
          "url": "https://res.cloudinary.com/...",
          "publicId": "banners/summer"
        },
        "position": 0,
        "isActive": true,
        "startDate": "2025-06-01T00:00:00.000Z",
        "endDate": "2025-08-31T23:59:59.000Z",
        "createdAt": "2025-05-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

#### GET /banners/:id

Get a single banner by ID.

| Field    | Details       |
| -------- | ------------- |
| **Auth** | None (public) |

---

#### POST /banners

Create a banner.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

**Request Body:**

```json
{
  "title": "Summer Sale",
  "subtitle": "Up to 50% off electronics",
  "link": "/sale/electronics",
  "position": 0,
  "isActive": true,
  "startDate": "2025-06-01T00:00:00Z",
  "endDate": "2025-08-31T23:59:59Z"
}
```

---

#### PUT /banners/:id

Update a banner.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

---

#### DELETE /banners/:id

Delete a banner and its Cloudinary image.

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `catalog.write` permission |

---

#### POST /banners/:id/image

Upload or replace banner image.

| Field            | Details                                   |
| ---------------- | ----------------------------------------- |
| **Auth**         | Bearer token + `catalog.write` permission |
| **Content-Type** | multipart/form-data                       |
| **Field Name**   | `image` (single file)                     |

---

### 5.9 Notifications Module (`/notifications`)

#### GET /notifications/stream

SSE (Server-Sent Events) stream for real-time notifications.

| Field             | Details             |
| ----------------- | ------------------- |
| **Auth**          | Bearer token        |
| **Response Type** | `text/event-stream` |

See [Section 7: Real-time Features](#7-real-time-features) for implementation details.

---

#### POST /notifications/broadcast

Send broadcast push notification to a user segment.

| Field    | Details                   |
| -------- | ------------------------- |
| **Auth** | Bearer token (Admin only) |

**Request Body:**

```json
{
  "title": "Flash Sale! 🔥",
  "body": "30% off all electronics for the next 24 hours",
  "image": "https://example.com/sale-banner.jpg",
  "target": "customers",
  "belowVersion": "2.1.0",
  "data": {
    "url": "/sale/electronics"
  }
}
```

**Target options:** `all`, `customers`, `bulk_buyers`, `cod_enabled`, `verified`, `staff`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "sent": 142,
    "segment": "customers"
  }
}
```

---

### 5.10 Support Module (`/support`)

#### POST /support/tickets

Create a support ticket.

| Field    | Details                               |
| -------- | ------------------------------------- |
| **Auth** | Bearer token (any authenticated user) |

**Request Body:**

```json
{
  "subject": "Order not received",
  "message": "I placed an order 5 days ago and it hasn't arrived yet."
}
```

**Success Response (201):**

```json
{
  "success": true,
  "ticket": {
    "_id": "tkt001",
    "user": "507f...",
    "subject": "Order not received",
    "status": "open",
    "messages": [
      {
        "sender": "507f...",
        "body": "I placed an order 5 days ago and it hasn't arrived yet.",
        "createdAt": "2025-01-15T10:30:00.000Z"
      }
    ],
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

#### GET /support/tickets

List tickets.

| Field            | Details                                                         |
| ---------------- | --------------------------------------------------------------- |
| **Auth**         | Bearer token                                                    |
| **Query Params** | `status` (open, in_progress, resolved, closed), `page`, `limit` |

**Behavior:**

- **Customers** see only their own tickets
- **Staff/Admin** see all tickets

---

#### GET /support/tickets/:id

Get ticket details with full message thread.

| Field    | Details                             |
| -------- | ----------------------------------- |
| **Auth** | Bearer token (owner or staff/admin) |

---

#### POST /support/tickets/:id/messages

Add a message to a ticket thread.

| Field    | Details                                    |
| -------- | ------------------------------------------ |
| **Auth** | Bearer token (ticket owner or staff/admin) |

**Request Body:**

```json
{
  "body": "Thank you for reaching out. We are looking into this."
}
```

---

#### PUT /support/tickets/:id/status

Update ticket status (staff/admin only).

| Field    | Details                                   |
| -------- | ----------------------------------------- |
| **Auth** | Bearer token + `support.write` permission |

**Request Body:**

```json
{
  "status": "resolved"
}
```

**Valid statuses:** `open`, `in_progress`, `resolved`, `closed`

---

### 5.11 Config Module (`/config`)

#### GET /config

Get platform configuration (public).

| Field    | Details       |
| -------- | ------------- |
| **Auth** | None (public) |

**Success Response (200):**

```json
{
  "success": true,
  "config": {
    "taxRate": 20,
    "currency": "GBP",
    "isEmailEnabled": true,
    "isSmsEnabled": false,
    "isRefundsEnabled": true
  }
}
```

---

#### PUT /config

Update platform configuration.

| Field    | Details                                  |
| -------- | ---------------------------------------- |
| **Auth** | Bearer token + `config.write` permission |

**Request Body:**

```json
{
  "taxRate": 20,
  "currency": "GBP",
  "isEmailEnabled": true,
  "isSmsEnabled": false,
  "isRefundsEnabled": true
}
```

---

#### GET /config/delivery-rates

List all delivery rates (public).

| Field    | Details       |
| -------- | ------------- |
| **Auth** | None (public) |

**Success Response (200):**

```json
{
  "success": true,
  "rates": [
    {
      "_id": "rate001",
      "city": null,
      "rate": 5.99,
      "estimatedDays": 5,
      "isActive": true
    },
    {
      "_id": "rate002",
      "city": "london",
      "rate": 3.99,
      "estimatedDays": 2,
      "isActive": true
    }
  ]
}
```

> **Note:** `city: null` is the unified default rate. City-specific rates override the default.

---

#### POST /config/delivery-rates

Create a delivery rate.

| Field    | Details                                  |
| -------- | ---------------------------------------- |
| **Auth** | Bearer token + `config.write` permission |

**Request Body:**

```json
{
  "city": "manchester",
  "rate": 4.99,
  "estimatedDays": 3,
  "isActive": true
}
```

---

#### PUT /config/delivery-rates/:id

Update a delivery rate.

| Field    | Details                                  |
| -------- | ---------------------------------------- |
| **Auth** | Bearer token + `config.write` permission |

---

#### DELETE /config/delivery-rates/:id

Delete a delivery rate.

| Field    | Details                                  |
| -------- | ---------------------------------------- |
| **Auth** | Bearer token + `config.write` permission |

---

## 6. Common Patterns

### Rate Limits

The API uses a tiered rate limiter. Limits are per IP per 15-minute window:

| User type               | Limit             | How determined                           |
| ----------------------- | ----------------- | ---------------------------------------- |
| Admin / Staff           | 2000 req / 15 min | JWT `role` claim decoded without DB call |
| Authenticated customer  | 500 req / 15 min  | JWT `role` claim                         |
| Guest / unauthenticated | 100 req / 15 min  | No valid JWT present                     |

Additional per-endpoint limits:

| Endpoint                                  | Limit                  |
| ----------------------------------------- | ---------------------- |
| `POST /auth/login`, `POST /auth/register` | 10 req / 15 min per IP |
| `POST /orders/checkout`                   | 5 req / 1 min per IP   |
| `POST /orders/webhook/stripe`             | 500 req / 1 min per IP |

All 429 responses include a descriptive `message` field — use it directly in your UI.

---

### Response Envelope

All API responses follow a consistent envelope format:

**Success:**

```json
{
  "success": true,
  "data": {
    /* response payload */
  }
}
```

Or for some endpoints (legacy pattern):

```json
{
  "success": true,
  "products": [...],
  "pagination": {...}
}
```

**Error:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Pagination

All list endpoints support pagination and return a consistent pagination object:

**Query Parameters:**

```
?page=1&limit=20
```

**Pagination Response:**

```json
{
  "pagination": {
    "totalCount": 85,
    "totalPages": 5,
    "currentPage": 1,
    "perPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Limits:**

- Default page: `1`
- Default limit: `20`
- Maximum limit: `100`

### File Uploads

**Product Images:**

```typescript
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);

await api.post(`/catalog/products/${productId}/images`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

- Field name: `images` (array)
- Max files: 5
- Max size per file: 5MB
- Accepted types: JPEG, PNG, WebP

**Banner Image:**

```typescript
const formData = new FormData();
formData.append('image', file);

await api.post(`/banners/${bannerId}/image`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

- Field name: `image` (single)
- Max size: 5MB

### Error Handling

```typescript
// lib/api.ts — global error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, data } = error.response || {};

    switch (status) {
      case 401:
        // Token expired or invalid — redirect to login
        clearToken();
        window.location.href = '/login';
        break;
      case 403:
        // Insufficient permissions — show access denied
        toast.error('You do not have permission to perform this action.');
        break;
      case 404:
        // Resource not found
        break;
      case 429:
        // Rate limited — message varies by which limiter triggered
        // Global limiter: "Too many requests. Please try again later."
        // Checkout limiter: "Too many checkout attempts. Please wait a moment and try again."
        // Auth limiter: "Too many authentication attempts. Please try again in 15 minutes."
        toast.error(
          data?.message || 'Too many requests. Please try again later.',
        );
        break;
      default:
        // Show server error message
        toast.error(data?.message || 'Something went wrong.');
    }

    return Promise.reject(error);
  },
);
```

### Authentication Middleware Pattern

```typescript
// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Admin routes require admin/staff role
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const decoded = jwtDecode(token);
    if (decoded.role !== 'admin' && decoded.role !== 'staff') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Customer account routes require authentication
  if (pathname.startsWith('/account')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === '/login' || pathname === '/register') && token) {
    const decoded = jwtDecode(token);
    const redirect = decoded.role === 'customer' ? '/' : '/admin/dashboard';
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/login', '/register'],
};
```

---

## 7. Real-time Features

### SSE (Server-Sent Events)

The backend provides a real-time notification stream via SSE.

**Endpoint:** `GET /api/v1/notifications/stream`

**Frontend Implementation:**

```typescript
// hooks/useNotificationStream.ts
import { useEffect, useRef } from 'react';

export function useNotificationStream(
  token: string,
  onEvent: (event: any) => void,
) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    // EventSource doesn't support custom headers natively.
    // Use EventSourcePolyfill or pass token as query param if backend supports it.
    // Alternative: use fetch-based SSE with ReadableStream.

    const url = `${process.env.NEXT_PUBLIC_API_URL}/notifications/stream`;

    // Using eventsource polyfill that supports headers
    const eventSource = new EventSourcePolyfill(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = () => {
      // Auto-reconnect is handled by EventSource spec
      console.warn('SSE connection error, will auto-reconnect...');
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
    };
  }, [token]);
}
```

**Event Types Received:**

| Event Type           | Description                      | Relevant Role |
| -------------------- | -------------------------------- | ------------- |
| `order_confirmed`    | New order placed                 | Admin/Staff   |
| `order_shipped`      | Order shipped                    | Customer      |
| `order_delivered`    | Order delivered                  | Customer      |
| `back_in_stock`      | Wishlisted product back in stock | Customer      |
| `price_drop`         | Wishlisted product price dropped | Customer      |
| `bulk_buyer_enabled` | Bulk buyer access granted        | Customer      |
| `cod_enabled`        | COD access granted               | Customer      |

**Event Data Format:**

```json
{
  "type": "order_confirmed",
  "orderId": "ORD-A1B2C3",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Push Notifications

**Registration Flow (Mobile/PWA):**

```typescript
// On app load or after login
import * as Notifications from 'expo-notifications';

async function registerForPush() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await api.post('/users/push-token', {
    token,
    action: 'register',
    platform: Platform.OS, // 'ios' or 'android'
    appVersion: Constants.expoConfig.version,
  });
}

// On logout
async function unregisterPush(token: string) {
  await api.post('/users/push-token', {
    token,
    action: 'unregister',
  });
}
```

---

## 8. Checkout Flow (Step by Step)

### Complete Checkout Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. BROWSE & ADD TO CART                                         │
│    POST /orders/cart  { productId, quantity, variantId }         │
│    (variantId is required — all products are variant-based)     │
├─────────────────────────────────────────────────────────────────┤
│ 2. VIEW CART                                                    │
│    GET /orders/cart                                              │
│    → Display items, calculate subtotal on frontend               │
├─────────────────────────────────────────────────────────────────┤
│ 3. APPLY COUPON (optional)                                      │
│    POST /catalog/coupons/validate  { code, orderTotal }         │
│    → Read-only preview — never increments usage count           │
│    → 403 if coupon has perUserLimit and user is not logged in   │
├─────────────────────────────────────────────────────────────────┤
│ 4. SELECT DELIVERY ADDRESS                                      │
│    GET /users/addresses  → let user pick or add new             │
│    GET /config/delivery-rates  → calculate delivery fee by city │
├─────────────────────────────────────────────────────────────────┤
│ 5. CHOOSE PAYMENT METHOD                                        │
│    - Stripe (all users)                                         │
│    - COD (only if user.isCodEnabled === true)                   │
├─────────────────────────────────────────────────────────────────┤
│ 6. SUBMIT CHECKOUT  (rate limited: 5 per IP per minute)         │
│    POST /orders/checkout {                                      │
│      deliveryAddress, billingAddress?,                           │
│      paymentMethod, couponCode?, deliveryNotes?                 │
│    }                                                            │
├─────────────────────────────────────────────────────────────────┤
│ 7a. STRIPE FLOW                                                 │
│    Response includes clientSecret                               │
│    → Use Stripe.js to confirm payment:                          │
│      stripe.confirmPayment({ clientSecret, ... })               │
│    → On success: redirect to order confirmation page            │
│    → On failure: show error, order stays pending (paymentStatus: failed) │
├─────────────────────────────────────────────────────────────────┤
│ 7b. COD FLOW                                                    │
│    Order created immediately with status: confirmed, paymentStatus: cod_pending │
│    → Redirect to order confirmation page                        │
└─────────────────────────────────────────────────────────────────┘
```

### Stripe Payment Confirmation (Frontend)

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation`,
      },
    });

    if (error) {
      // Show error to customer (e.g., card declined)
      setErrorMessage(error.message);
    }
    // If successful, Stripe redirects to return_url
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe}>Pay Now</button>
    </form>
  );
}

// Wrap in Elements provider
function CheckoutPage({ clientSecret }: { clientSecret: string }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm clientSecret={clientSecret} />
    </Elements>
  );
}
```

### COD Eligibility Check

```typescript
// Before showing COD option in payment method selector
const showCodOption = user?.isCodEnabled === true;
```

### Order Total Calculation (Frontend Preview)

```typescript
function calculateOrderPreview(cart, couponDiscount, deliveryRate, taxRate) {
  const subtotal = cart.items.reduce((sum, item) => {
    // Use variant's effective price (discountedPrice takes priority over price)
    const price = item.variant.discountedPrice ?? item.variant.price;
    return sum + price * item.quantity;
  }, 0);

  const discount = couponDiscount || 0;
  const deliveryFee = deliveryRate || 5.99;
  const taxableAmount = subtotal - discount;
  const tax = taxableAmount * (taxRate / 100);
  const total = taxableAmount + tax + deliveryFee;

  return { subtotal, discount, tax, deliveryFee, total };
}
```

> **Important:** The backend recalculates all totals during checkout (including bulk pricing). The frontend calculation is for preview only.

---

## 9. Variant Selection Flow

### Architecture Overview

The catalog uses a variant-only selling model:

```
┌─────────────────────────────────────────────────────────────┐
│  PRODUCT (parent — identity and options only)               │
│  - name, slug, description, category                        │
│  - images: [{ url, publicId }]                              │
│  - status: "active" | "sold" | "draft"                      │
│  - variantAttributes: defines WHAT options exist            │
│    e.g., [{ key: "Size", values: ["S","M","L"] },           │
│           { key: "Color", values: ["Red","Blue"] }]         │
│  - minPrice: lowest variant price (computed)                │
│  - available: true if any variant has stock > 0 (computed)  │
│  - NO price, NO inventory, NO bulkPricing at product level  │
└─────────────────────────────────────────────────────────────┘
         │ has many
         ▼
┌─────────────────────────────────────────────────────────────┐
│  PRODUCT VARIANT (child — holds all commerce data)          │
│  - sku: "WIRELESS-A1B2C3D4" (auto-generated or manual)     │
│  - attributes: specific combo selected                      │
│    e.g., [{ key: "Size", value: "M" },                      │
│           { key: "Color", value: "Red" }]                   │
│  - price: £89.99 (REQUIRED — base selling price)            │
│  - discountedPrice: £69.99 (optional, must be < price)      │
│  - bulkPricing: { minQuantity: 10, bulkPrice: 69.99 }      │
│    (optional — bulkPrice must be < effectiveRetailPrice)    │
│  - image: "products/tshirt-red-main" (publicId, optional)   │
│    → imageUrl resolved by API from product.images           │
│  - inventory: 25 (REQUIRED — each variant tracks own stock) │
└─────────────────────────────────────────────────────────────┘
```

### Pricing Precedence

The backend pre-calculates the effective price for each variant and returns it as `effectivePrice`. The precedence logic (for reference) is:

```
variant.discountedPrice → variant.price
```

> **Frontend shortcut:** You do NOT need to compute this yourself. Just use `variant.effectivePrice` directly from the product detail response.

### Frontend Price Display

**Product list page (no variant selected):**

```typescript
// Show the minimum variant price
const display = `From £${product.minPrice.toFixed(2)}`;
```

**Product detail page (variant selected):**

```typescript
// Price display
const effectivePrice = selectedVariant.discountedPrice ?? selectedVariant.price;
const showStrikethrough = selectedVariant.discountedPrice !== null;
const originalPrice = selectedVariant.price; // shown crossed out when discounted
```

**Strikethrough (original vs sale):**

```typescript
// Show crossed-out original price when there's a discount
const showStrikethrough = selectedVariant.discountedPrice !== null;
const originalPrice = selectedVariant.price;
const effectivePrice = selectedVariant.discountedPrice ?? selectedVariant.price;
```

### Inventory Logic

| Scenario              | What determines stock                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Product WITH variants | Each variant has its own `inventory`. Show `product.available = true` if ANY variant has stock > 0 |

> **Important:** In the product list response (`GET /catalog/products`), the `inventory` field is automatically computed as the **sum of all active variant inventories**.
>
> On the product detail page, individual variant inventories are available in the `variants` array.

### Admin Workflow (Step by Step)

1. **Create product shell** → `POST /catalog/products` (name, category, description — no price/inventory)
2. **Upload images** → `POST /catalog/products/:id/images` (upload product images first)
3. **Define attributes** → `POST /variants/products/:productId/attributes` (sets the "menu" of options)
4. **Create variants** → `POST /variants/products/:productId` (each requires `price` + `inventory`; optionally assign an `image` publicId)
5. **Set status to active** → `PUT /catalog/products/:id` with `{ "status": "active" }`
6. **Manage stock** → `PATCH /variants/:variantId/inventory` (per-variant stock updates)

### Key Rules

- Variant attribute keys MUST match the product's defined `variantAttributes` keys exactly
- No duplicate attribute combinations allowed (can't have two "Size: M, Color: Red" variants)
- Can't remove attribute definitions if active variants exist
- SKU is auto-generated if not provided
- `price` is required on every variant — all pricing lives at the variant level
- `bulkPricing` is optional per variant — if set, `bulkPrice` must be < effective retail price
- Variant `image` stores a `publicId` from the product's images. The API resolves it to `imageUrl` automatically.
- If variant `image` is `null` or the referenced image is deleted, `imageUrl` falls back to the first product image
- A product with `status: "sold"` should show "Sold Out" and disable Add to Cart
- A product with `status: "draft"` should not appear on the public storefront at all
- If a variant is soft-deleted while it's in a user's cart, the item is automatically removed from the cart response on the next `GET /orders/cart` call — no frontend action needed. The cart saves itself clean.

---

### How Variant Products Work

Products with variants have:

1. `variantAttributes` — defines available options (e.g., Size: [S, M, L], Color: [Red, Blue])
2. `variants` — array of specific combinations with their own price, inventory, and SKU

### Product Detail Page Implementation

```typescript
// types
interface VariantAttribute {
  key: string;    // e.g., "Size"
  values: string[]; // e.g., ["S", "M", "L", "XL"]
}

interface Variant {
  _id: string;
  sku: string;
  attributes: { key: string; value: string }[];
  price: number;
  discountedPrice: number | null;
  effectivePrice: number;
  inventory: number;
}

// Component logic
function ProductDetailPage({ product }) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  // Step 1: Render option selectors from variantAttributes
  const renderOptionSelectors = () => {
    return product.variantAttributes.map((attr) => (
      <div key={attr.key}>
        <label>{attr.key}</label>
        <select
          value={selectedOptions[attr.key] || ''}
          onChange={(e) => handleOptionChange(attr.key, e.target.value)}
        >
          <option value="">Select {attr.key}</option>
          {attr.values.map((val) => (
            <option key={val} value={val}>{val}</option>
          ))}
        </select>
      </div>
    ));
  };

  // Step 2: Find matching variant when all options are selected
  const handleOptionChange = (key: string, value: string) => {
    const newOptions = { ...selectedOptions, [key]: value };
    setSelectedOptions(newOptions);

    // Check if all attributes are selected
    const allSelected = product.variantAttributes.every(
      (attr) => newOptions[attr.key]
    );

    if (allSelected) {
      // Find the variant that matches all selected options
      const match = product.variants.find((variant) =>
        variant.attributes.every(
          (attr) => newOptions[attr.key] === attr.value
        )
      );
      setSelectedVariant(match || null);
    } else {
      setSelectedVariant(null);
    }
  };

  // Step 3: Display variant-specific price, stock and image
  // effectivePrice is pre-calculated by the backend — just use it directly
  const getEffectivePrice = () => {
    if (selectedVariant) {
      return selectedVariant.discountedPrice ?? selectedVariant.price;
    }
    return product.minPrice;
  };

  const getStock = () => {
    if (selectedVariant) return selectedVariant.inventory;
    return 0;
  };

  const isInStock = () => getStock() > 0;

  // imageUrl is pre-resolved by the backend — use it directly
  // Falls back to first product image if variant has no specific image
  const getDisplayImage = () => {
    return selectedVariant?.imageUrl ?? product.images[0]?.url ?? null;
  };

  // Step 4: Add to cart with variantId (required)
  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error('Please select all options');
      return;
    }

    await api.post('/orders/cart', {
      productId: product._id,
      quantity: 1,
      variantId: selectedVariant._id,
    });

    toast.success('Added to cart!');
  };

  return (
    <div>
      <h1>{product.name}</h1>
      <p className="price">£{(selectedVariant?.discountedPrice ?? selectedVariant?.price ?? product.minPrice).toFixed(2)}</p>
      <p className="stock">{isInStock() ? `${getStock()} in stock` : 'Out of stock'}</p>

      {product.variantAttributes?.length > 0 && renderOptionSelectors()}

      {/* Show bulk pricing if user is bulk buyer — variant-level only */}
      {user?.isBulkBuyer && selectedVariant?.bulkPricing?.minQuantity && (
        <p className="bulk-price">
          Buy {selectedVariant.bulkPricing.minQuantity}+ for £{selectedVariant.bulkPricing.bulkPrice} each
        </p>
      )}

      <button
        onClick={handleAddToCart}
        disabled={!isInStock() || !selectedVariant}
      >
        Add to Cart
      </button>
    </div>
  );
}
```

### Variant Selection State Machine

```
┌──────────────────────────────────────────────────────────┐
│ Initial State: No options selected                       │
│ → Show product minPrice                                  │
│ → "Add to Cart" disabled                                 │
├──────────────────────────────────────────────────────────┤
│ Partial Selection: Some options selected                  │
│ → Still show minPrice                                    │
│ → "Add to Cart" still disabled                           │
├──────────────────────────────────────────────────────────┤
│ Full Selection: All options selected                      │
│ → Find matching variant from variants array              │
│ → If found:                                              │
│   - Show variant price (discountedPrice ?? price)        │
│   - Show variant inventory                               │
│   - Enable "Add to Cart" (if in stock)                   │
│ → If NOT found:                                          │
│   - Show "Combination unavailable"                       │
│   - Disable "Add to Cart"                                │
└──────────────────────────────────────────────────────────┘
```

### Cart Display with Variants

```typescript
// In cart, display variant attributes alongside product name
function CartItem({ item }) {
  const { product, variant, quantity } = item;
  const effectivePrice = variant.discountedPrice ?? variant.price;

  return (
    <div className="cart-item">
      <img src={product.images[0]?.url} alt={product.name} />
      <div>
        <h3>{product.name}</h3>
        {variant && (
          <p className="variant-info">
            {variant.attributes.map(a => `${a.key}: ${a.value}`).join(' / ')}
          </p>
        )}
        <p className="price">£{effectivePrice.toFixed(2)}</p>
        <p className="sku">{variant?.sku}</p>
      </div>
      <QuantitySelector value={quantity} max={variant?.inventory} />
    </div>
  );
}
```

---

## 10. Tiered Pricing — Admin UI Reference

### Overview

The platform supports two types of quantity-based pricing tiers on each variant:

| Tier Type                                         | Who Gets It          | When Applied                      |
| ------------------------------------------------- | -------------------- | --------------------------------- |
| **Bulk Pricing Tiers** (`bulkPricingTiers`)       | Bulk buyers only     | Always (coupons blocked for bulk) |
| **Retail Discount Tiers** (`retailDiscountTiers`) | Normal & guest users | Only when NO coupon is applied    |

### ⚠️ "Fixed" Type — Consistent for Both Tier Types

**"Fixed" means the same thing everywhere: the value IS the final unit price.**

| Tier Category             | `type: "fixed"` Meaning       | Calculation         | Admin UI Label    |
| ------------------------- | ----------------------------- | ------------------- | ----------------- |
| **Bulk Pricing Tiers**    | Value IS the final unit price | `unitPrice = value` | **"Fixed Price"** |
| **Retail Discount Tiers** | Value IS the final unit price | `unitPrice = value` | **"Fixed Price"** |

### Admin UI Dropdown Options

**Same for both Retail Discount Tiers and Bulk Pricing Tiers:**

| Dropdown Value | Label to Display    | Hint Text                                                                    | Example                   |
| -------------- | ------------------- | ---------------------------------------------------------------------------- | ------------------------- |
| `percentage`   | Percentage Discount | "% off the effective price"                                                  | value 10 → 10% off        |
| `fixed`        | Fixed Price         | "The final unit price the customer pays (must be less than effective price)" | value 10.66 → pays £10.66 |

### Calculation Examples

**Retail Discount — Percentage:**

```
Effective price: £80.00
Tier: { type: "percentage", value: 10, minQty: 3, maxQty: 10 }
Unit price: £80.00 × (1 - 10/100) = £72.00
Savings per unit: £8.00
```

**Retail Discount — Fixed:**

```
Effective price: £13.16
Tier: { type: "fixed", value: 10.66, minQty: 2, maxQty: 10 }
Unit price: £10.66 (value IS the price)
Savings per unit: £13.16 - £10.66 = £2.50
```

**Bulk Pricing — Percentage:**

```
Effective price: £80.00
Tier: { type: "percentage", value: 25, minQty: 50, maxQty: 199 }
Unit price: £80.00 × (1 - 25/100) = £60.00
Savings per unit: £20.00
```

**Bulk Pricing — Fixed:**

```
Effective price: £80.00
Tier: { type: "fixed", value: 45.00, minQty: 200, maxQty: null }
Unit price: £45.00 (value IS the price)
Savings per unit: £35.00
```

### Variant API — Tier Fields

```json
POST /api/v1/variants/products/:productId
{
  "price": 100.00,
  "discountedPrice": 80.00,
  "inventory": 500,
  "attributes": [{ "key": "Volume", "value": "5L" }],
  "bulkPricingTiers": [
    { "minQty": 10, "maxQty": 49, "type": "percentage", "value": 10 },
    { "minQty": 50, "maxQty": 199, "type": "percentage", "value": 25 },
    { "minQty": 200, "maxQty": null, "type": "fixed", "value": 45.00 }
  ],
  "retailDiscountTiers": [
    { "minQty": 2, "maxQty": 5, "type": "percentage", "value": 5 },
    { "minQty": 6, "maxQty": 10, "type": "fixed", "value": 8.00 }
  ]
}
```

### Validation Rules (Backend Enforced)

| Rule                                                        | Error |
| ----------------------------------------------------------- | ----- |
| Tiers must be ordered ascending by `minQty`                 | 400   |
| Tiers must not overlap (`minQty > previous maxQty`)         | 400   |
| Only the LAST bulk tier may have `maxQty: null` (unbounded) | 400   |
| All retail tiers MUST have a defined `maxQty` (no null)     | 400   |
| Percentage value must be 1–99                               | 400   |
| Fixed value must be less than effective price               | 400   |
| Maximum 10 tiers per type                                   | 400   |

### Cart/Checkout Response — `tierApplied` Field

When a tier matches, the cart preview and checkout response include:

```json
{
  "unitPrice": 0.66,
  "pricingType": "retail_discount",
  "tierApplied": { "type": "fixed", "value": 12.5 },
  "lineTotal": 1.98,
  "savings": 37.5
}
```

**How to display savings on frontend:**

- `savings` = total savings for the line (already calculated by backend)
- `basePrice` = effective retail price before tier discount
- `unitPrice` = final price per unit after tier applied

### Coupon Interaction

- When a coupon is applied, `retailDiscountTiers` are **completely skipped**
- Items get `pricingType: "coupon_override"` and `unitPrice = effectivePrice`
- The coupon discount is applied to the order total separately
- Bulk buyers **cannot use coupons** (403 error)

---

## 12. Per-Variant Max Order Quantity

### Overview

Each variant can have a maximum quantity limit per order, configured separately for normal/guest users and bulk buyers. When exceeded, checkout is blocked with a message to contact for large orders.

### Variant Fields

| Field             | Type           | Default           | Applies To           |
| ----------------- | -------------- | ----------------- | -------------------- |
| `maxOrderQty`     | number \| null | `null` (no limit) | Normal & guest users |
| `maxOrderQtyBulk` | number \| null | `null` (no limit) | Bulk buyers          |

### Admin API — Set Limits

**Create variant with limits:**

```bash
POST /api/v1/variants/products/:productId
{
  "attributes": [{ "key": "Volume", "value": "5L" }],
  "price": 13.16,
  "inventory": 10000,
  "maxOrderQty": 100,
  "maxOrderQtyBulk": 5000
}
```

**Update existing variant:**

```bash
PUT /api/v1/variants/:variantId
{ "maxOrderQty": 50, "maxOrderQtyBulk": 2000 }
```

**Remove limit (set to null):**

```bash
PUT /api/v1/variants/:variantId
{ "maxOrderQty": null }
```

### Error Response (When Exceeded)

Checkout and checkout-preview both return **400**:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Maximum 100 units allowed per order for \"Pine Disinfectant\" (Volume: 5L). Please contact us for larger quantity orders."
}
```

### Product Detail Response

The limits are included in the variant data from `GET /catalog/products/:idOrSlug`:

```json
{
  "variants": [{
    "_id": "var001",
    "sku": "OS053",
    "attributes": [{ "key": "Volume", "value": "5L" }],
    "price": 13.16,
    "inventory": 10000,
    "maxOrderQty": 100,
    "maxOrderQtyBulk": 5000,
    ...
  }]
}
```

### Frontend Implementation

#### Quantity Selector — Enforce Limit Client-Side

```typescript
// Determine the applicable limit for the current user
const getMaxQty = (variant, user) => {
  const limit = user?.isBulkBuyer ? variant.maxOrderQtyBulk : variant.maxOrderQty;
  // Cap at inventory if limit is higher than stock
  if (limit && variant.inventory) {
    return Math.min(limit, variant.inventory);
  }
  return limit || variant.inventory;
};

// In quantity selector component
function QuantitySelector({ variant, user, quantity, onChange }) {
  const maxQty = getMaxQty(variant, user);

  const increment = () => {
    if (quantity >= maxQty) return;
    onChange(quantity + 1);
  };

  return (
    <div>
      <button onClick={() => onChange(Math.max(1, quantity - 1))}>-</button>
      <span>{quantity}</span>
      <button onClick={increment} disabled={quantity >= maxQty}>+</button>
      {variant.maxOrderQty && (
        <p className="text-sm text-gray-500">Max {maxQty} per order</p>
      )}
    </div>
  );
}
```

#### Cart — Show Warning When at Limit

```typescript
function CartItem({ item, user }) {
  const { variant, quantity } = item;
  const limit = user?.isBulkBuyer ? variant.maxOrderQtyBulk : variant.maxOrderQty;
  const atLimit = limit && quantity >= limit;

  return (
    <div>
      {/* ... product info ... */}
      <QuantitySelector
        value={quantity}
        max={limit || variant.inventory}
        onChange={handleUpdate}
      />
      {atLimit && (
        <p className="text-amber-600 text-sm">
          Maximum {limit} per order. Contact us for larger quantities.
        </p>
      )}
    </div>
  );
}
```

#### Add to Cart — Validate Before Adding

```typescript
const handleAddToCart = async (variantId, quantity) => {
  const limit = user?.isBulkBuyer
    ? selectedVariant.maxOrderQtyBulk
    : selectedVariant.maxOrderQty;

  if (limit && quantity > limit) {
    toast.error(
      `Maximum ${limit} per order. Contact us for larger quantities.`,
    );
    return;
  }

  await api.post('/orders/cart', { productId, variantId, quantity });
};
```

### Admin UI — Variant Form Fields

Add to the variant create/edit form:

| Field             | Label                      | Input Type        | Hint Text                                                                |
| ----------------- | -------------------------- | ----------------- | ------------------------------------------------------------------------ |
| `maxOrderQty`     | Max Qty per Order (Normal) | Number (nullable) | "Maximum units a normal/guest user can order. Leave empty for no limit." |
| `maxOrderQtyBulk` | Max Qty per Order (Bulk)   | Number (nullable) | "Maximum units a bulk buyer can order. Leave empty for no limit."        |

**Placement:** Below the inventory field, before the weight/delivery section.

### Logic Summary

| User Type                 | Limit Field Used          | Exceeded →        |
| ------------------------- | ------------------------- | ----------------- |
| Normal user               | `variant.maxOrderQty`     | 400 error         |
| Guest                     | `variant.maxOrderQty`     | 400 error         |
| Bulk buyer                | `variant.maxOrderQtyBulk` | 400 error         |
| Any user, field is `null` | No limit enforced         | Checkout proceeds |

### Enforcement Points

- `POST /orders/checkout` — blocks order creation
- `POST /orders/checkout-preview` — blocks preview (frontend shows error early)
- Frontend quantity selector — prevents exceeding (optional, backend enforces anyway)

---

## 11. Delivery Fee System — Admin & Frontend Reference

### How Delivery Fee is Calculated

The delivery fee is based on **total cart weight** matched against **weight ranges** configured per city.

```
Total cart weight → Find matching weight range → Charge that range's flat fee
```

### Delivery Rate Lookup Order

1. Find active rate where `city` matches the delivery address city (case-insensitive)
2. If no city-specific rate found → fall back to `city: 'default'` rate
3. If rate found → match cart weight against its weight ranges
4. If cart weight exceeds all ranges → use the **highest range's fee** (overflow)
5. If NO delivery rate exists at all (no city match AND no default) → use `defaultDeliveryFee` from platform config (flat fee, default £10)

### Delivery Fee Decision Flowchart

```
Cart weight = 500 kg
Ranges: [0-5: £5.99], [5-15: £8.99], [15-30: £12.99], [30-100: £19.99]

→ 500 kg exceeds all ranges
→ Uses highest range: £19.99 (NOT defaultDeliveryFee)
```

```
No delivery rates configured at all (empty collection)

→ No city match, no default rate
→ Falls back to platform config: defaultDeliveryFee = £10 flat
```

| Scenario                                                | Fee Used                                         |
| ------------------------------------------------------- | ------------------------------------------------ |
| City rate found, weight within a range                  | That range's price                               |
| City rate found, weight exceeds all ranges              | Highest range's price                            |
| No city rate, default rate found, weight within range   | Default rate's range price                       |
| No city rate, default rate found, weight exceeds ranges | Default rate's highest range price               |
| No rates exist at all                                   | `defaultDeliveryFee` from platform config (flat) |
| Pickup order                                            | £0 (always, regardless of rates)                 |

### Weight Calculation Rules

| User Type          | `freeDelivery: true` items | `freeDelivery: false` items |
| ------------------ | -------------------------- | --------------------------- |
| **Normal / Guest** | ❌ Excluded from weight    | ✅ Counted                  |
| **Bulk Buyer**     | ✅ Counted (flag ignored)  | ✅ Counted                  |

**Formula:**

```
totalWeight = sum of (variant.weight × quantity) for applicable items
```

- `variant.weight = null` or `0` → contributes 0 kg
- `variant.freeDelivery = true` + normal user → item excluded entirely (0 kg)
- `variant.freeDelivery = true` + bulk buyer → item weight still counted

### Weight Range Matching

| Total Weight       | Matching Logic                 |
| ------------------ | ------------------------------ |
| 0 kg               | Lowest range (e.g., 0-5 kg)    |
| Within a range     | That range's fee               |
| Exceeds all ranges | Highest range's fee (overflow) |

**Boundary rule:** min is inclusive, max is exclusive — except the highest range where both are inclusive.

Example with ranges `[0-5: £4.49], [5-15: £7.49], [15-30: £10.99], [30-100: £16.99]`:

```
4.99 kg → £4.49 (first range)
5.0 kg  → £7.49 (second range)
100 kg  → £16.99 (highest range, inclusive)
500 kg  → £16.99 (overflow → highest range)
0 kg    → £4.49 (all items free delivery → lowest range)
```

### Admin UI — Delivery Rates

#### API Endpoints

```
GET    /api/v1/config/delivery-rates          → List all rates
POST   /api/v1/config/delivery-rates          → Create rate
PUT    /api/v1/config/delivery-rates/:id      → Update rate
DELETE /api/v1/config/delivery-rates/:id      → Delete rate
```

#### Create/Update Payload

```json
{
  "city": "birmingham",
  "estimatedDays": 3,
  "isActive": true,
  "weightRanges": [
    { "minWeight": 0, "maxWeight": 5, "price": 4.49 },
    { "minWeight": 5, "maxWeight": 15, "price": 7.49 },
    { "minWeight": 15, "maxWeight": 30, "price": 10.99 },
    { "minWeight": 30, "maxWeight": 100, "price": 16.99 }
  ]
}
```

#### Default Rate

Use `"city": "default"` for the fallback rate when no city-specific rate matches:

```json
{
  "city": "default",
  "estimatedDays": 5,
  "weightRanges": [
    { "minWeight": 0, "maxWeight": 5, "price": 5.99 },
    { "minWeight": 5, "maxWeight": 15, "price": 8.99 },
    { "minWeight": 15, "maxWeight": 30, "price": 12.99 },
    { "minWeight": 30, "maxWeight": 100, "price": 19.99 }
  ]
}
```

#### Validation Rules

| Rule                                    | Error |
| --------------------------------------- | ----- |
| At least 1 weight range required        | 400   |
| Max 20 weight ranges                    | 400   |
| Ranges must not overlap                 | 400   |
| Each range: `minWeight < maxWeight`     | 400   |
| `price >= 0`                            | 400   |
| City must be unique (one rate per city) | 409   |

### Admin UI — Variant Weight & Free Delivery

On the variant create/edit form:

| Field          | Type        | Description                                                                                                                          |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `weight`       | number (kg) | Weight per unit. Used for delivery calculation. `null` or `0` = no weight.                                                           |
| `freeDelivery` | boolean     | When ON, this item's weight is excluded from delivery fee for normal/guest users. Bulk buyers always pay based on weight regardless. |

**Admin UI hint for Free Delivery toggle:**

> "Weight excluded from delivery fee for normal users. Bulk buyers always pay based on weight."

### Checkout/Preview Response — Delivery Fields

```json
{
  "deliveryFee": 7.49,
  "deliveryWeight": 12.5,
  "total": 125.97
}
```

| Field            | Description                                                    |
| ---------------- | -------------------------------------------------------------- |
| `deliveryFee`    | Final delivery charge (included in `total`)                    |
| `deliveryWeight` | Total calculated weight in kg (after free delivery exclusions) |

### Frontend — Delivery Fee Estimate

Before checkout, you can get a delivery fee estimate:

```
POST /api/v1/orders/delivery-fee
```

**Auth user:**

```json
{ "addressId": "saved-address-id" }
```

**Guest:**

```json
{ "city": "birmingham" }
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deliveryFee": 7.49,
    "currency": "GBP",
    "estimatedDays": 3
  }
}
```

### Common Issues

| Symptom                                    | Cause                                             | Fix                                                          |
| ------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------ |
| `deliveryWeight: 0` but variant has weight | `freeDelivery` is ON for the variant              | Turn off Free Delivery toggle in admin                       |
| Getting default rate instead of city rate  | City name doesn't match (check spelling)          | City matching is case-insensitive but must be exact spelling |
| `deliveryFee: 19.99` for 2500 kg order     | Weight exceeds all ranges → highest range fee     | Add higher weight ranges or increase max range               |
| 400: "No delivery rate configured"         | No rate for the city AND no `default` rate exists | Create a rate with `city: "default"`                         |

---

## 13. Pickup & Cash on Pickup (COP)

### Overview

Customers can choose to collect their order in person instead of having it delivered. When pickup is selected:

- No delivery address required
- Delivery fee = £0
- Payment options: Stripe (pay online) or COP (cash on pickup)

### Feature Toggle (Admin)

Pickup must be enabled via platform config before it's available:

```bash
PUT /api/v1/config
Authorization: Bearer <admin-token>

{
  "isPickupEnabled": true,
  "pickupAddress": "123 Warehouse Road, Bradford, BD1 1AA",
  "pickupInstructions": "Open Mon-Fri 9am-5pm. Ring bell at Gate 2."
}
```

| Config Field         | Type           | Default | Description                                 |
| -------------------- | -------------- | ------- | ------------------------------------------- |
| `isPickupEnabled`    | boolean        | `false` | Master toggle for pickup availability       |
| `pickupAddress`      | string \| null | `null`  | Physical address shown to customers         |
| `pickupInstructions` | string \| null | `null`  | Collection instructions (hours, gate, etc.) |

### Delivery Methods

| Value      | Description                | Delivery Fee | Address Required |
| ---------- | -------------------------- | ------------ | ---------------- |
| `delivery` | Ship to customer (default) | Weight-based | ✅ Yes           |
| `pickup`   | Customer collects          | £0           | ❌ No            |

### Payment Methods — Full Matrix

| Delivery Method | Payment Method | Allowed                      | Initial Status | Payment Status |
| --------------- | -------------- | ---------------------------- | -------------- | -------------- |
| `delivery`      | `stripe`       | ✅                           | `pending`      | `unpaid`       |
| `delivery`      | `cod`          | ✅ (requires `isCodEnabled`) | `confirmed`    | `cod_pending`  |
| `delivery`      | `cop`          | ❌ 400 error                 | —              | —              |
| `pickup`        | `stripe`       | ✅                           | `pending`      | `unpaid`       |
| `pickup`        | `cop`          | ✅ (any auth user)           | `confirmed`    | `cop_pending`  |
| `pickup`        | `cod`          | ❌ 400 error                 | —              | —              |

### Order Status Flow — Pickup vs Delivery

**Delivery orders:**

```
pending → confirmed → processing → shipped → delivered
```

**Pickup orders:**

```
pending → confirmed → processing → picked_up
```

Admin marks pickup orders as `picked_up` (not `delivered`) when the customer collects. This triggers a "Order Collected" email.

| Status      | Use For              | Email Sent        |
| ----------- | -------------------- | ----------------- |
| `shipped`   | Delivery orders only | "Order Shipped"   |
| `delivered` | Delivery orders only | "Order Delivered" |
| `picked_up` | Pickup orders only   | "Order Collected" |

### Checkout Request — Pickup + Stripe

```json
POST /api/v1/orders/checkout
Authorization: Bearer <token>

{
  "deliveryMethod": "pickup",
  "paymentMethod": "stripe"
}
```

No `addressId` or `deliveryAddress` needed.

**Response:** Same as regular Stripe checkout — returns `clientSecret` for payment.

### Checkout Request — Pickup + Cash on Pickup

```json
POST /api/v1/orders/checkout
Authorization: Bearer <token>

{
  "deliveryMethod": "pickup",
  "paymentMethod": "cop"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "order": {
      "orderId": "ORD-A1B2C3",
      "deliveryMethod": "pickup",
      "deliveryAddress": null,
      "deliveryFee": 0,
      "paymentMethod": "cop",
      "status": "confirmed",
      "paymentStatus": "cop_pending",
      ...
    }
  }
}
```

### Checkout Request — Delivery (Unchanged)

```json
POST /api/v1/orders/checkout
{
  "deliveryMethod": "delivery",
  "paymentMethod": "stripe",
  "addressId": "saved-address-id"
}
```

Or omit `deliveryMethod` entirely — defaults to `"delivery"`.

### Checkout Preview — Pickup

```json
POST /api/v1/orders/checkout-preview
Authorization: Bearer <token>

{
  "deliveryMethod": "pickup"
}
```

**Response:** `deliveryFee: 0`, `deliveryWeight: 0`

### COP vs COD — Key Differences

|                         | COD (Cash on Delivery) | COP (Cash on Pickup)        |
| ----------------------- | ---------------------- | --------------------------- |
| Delivery method         | `delivery` only        | `pickup` only               |
| Requires `isCodEnabled` | ✅ Yes                 | ❌ No                       |
| Guest allowed           | ❌ No                  | ✅ Yes (needs `guestEmail`) |
| Delivery fee            | Weight-based           | £0                          |
| Order status            | `confirmed`            | `confirmed`                 |
| Payment status          | `cod_pending`          | `cop_pending`               |

### Frontend Implementation

#### 1. Check if Pickup is Enabled

```typescript
const { data } = await api.get('/config');
const { isPickupEnabled, pickupAddress, pickupInstructions } = data;
```

Only show the pickup option if `isPickupEnabled === true`.

#### 2. Checkout Page — Delivery Method Toggle

```typescript
// Before the address step
<RadioGroup value={deliveryMethod} onChange={setDeliveryMethod}>
  <Radio value="delivery">Deliver to my address</Radio>
  {config.isPickupEnabled && (
    <Radio value="pickup">Collect from store</Radio>
  )}
</RadioGroup>

{deliveryMethod === 'pickup' && (
  <div className="pickup-info">
    <p><strong>Pickup Address:</strong> {config.pickupAddress}</p>
    <p><strong>Instructions:</strong> {config.pickupInstructions}</p>
  </div>
)}

{deliveryMethod === 'delivery' && (
  <AddressSelector />
)}
```

#### 3. Payment Options — Conditional

```typescript
const paymentOptions =
  deliveryMethod === 'pickup'
    ? [
        { value: 'stripe', label: 'Pay Online (Card)' },
        { value: 'cop', label: 'Cash on Pickup' },
      ]
    : [
        { value: 'stripe', label: 'Pay Online (Card)' },
        ...(user?.isCodEnabled
          ? [{ value: 'cod', label: 'Cash on Delivery' }]
          : []),
      ];
```

#### 4. Order Detail — Show Pickup Badge

```typescript
{order.deliveryMethod === 'pickup' ? (
  <Badge>Pickup</Badge>
  <p>Collect from: {config.pickupAddress}</p>
) : (
  <Badge>Delivery</Badge>
  <AddressDisplay address={order.deliveryAddress} />
)}
```

#### 5. Admin — Order List Filter

The `deliveryMethod` field is on the order. Admin can filter/display:

- Show "Pickup" or "Delivery" badge on each order row
- Filter orders by delivery method if needed

### Validation Errors

| Scenario                                                | Error                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `deliveryMethod: "pickup"` but `isPickupEnabled: false` | 400: "Pickup is not currently available."                                      |
| `paymentMethod: "cod"` + `deliveryMethod: "pickup"`     | 400: "Cash on Delivery is not available for pickup orders. Use 'cop' instead." |
| `paymentMethod: "cop"` + `deliveryMethod: "delivery"`   | 400: "Cash on Pickup is only available for pickup orders."                     |
| `deliveryMethod: "delivery"` without address            | 400: "Provide either addressId or deliveryAddress for delivery orders"         |

### Guest Pickup + COP Example

```json
POST /api/v1/orders/checkout

{
  "deliveryMethod": "pickup",
  "paymentMethod": "cop",
  "guestEmail": "guest@example.com",
  "guestPhone": "+447700900000",
  "items": [
    { "productId": "...", "variantId": "...", "quantity": 2 }
  ]
}
```

`guestPhone` is optional but recommended for pickup orders — helps identify the customer at collection.

### Admin UI — Settings Page

Add to the platform settings page (`/admin/settings`):

| Field               | Input Type | Description                         |
| ------------------- | ---------- | ----------------------------------- |
| Pickup Enabled      | Toggle     | Master on/off for pickup            |
| Pickup Address      | Text input | Physical address shown to customers |
| Pickup Instructions | Textarea   | Hours, gate info, etc.              |

---

## 14. Business Info, Newsletter & Contact Form

### Overview

The platform config now includes business information, social links, legal pages, newsletter subscription, and a contact form — all the essentials for a public-facing website.

---

### 14.1 Business Information

All business info is stored in platform config and returned by `GET /api/v1/config`.

#### Reading Business Info (Public)

```typescript
const { data } = await api.get('/config');
const config = data.data.config;

// Use in footer, about page, contact page
const {
  businessName, // "ChemTech"
  businessDescription, // "UK's leading chemical supplier"
  businessPhone, // "+44 1234 567890"
  businessEmail, // "info@chemibuild.co.uk"
  businessAddress, // "123 Industrial Estate"
  businessCity, // "Bradford"
  businessPostcode, // "BD1 1AA"
  businessCountry, // "GB"
  businessHours, // "Mon-Fri 9am-5pm, Sat 10am-2pm"
  socialLinks, // { facebook, instagram, twitter, linkedin, youtube, tiktok }
  termsAndConditions, // HTML/text content for T&C page
  privacyPolicy, // HTML/text content for privacy page
  returnPolicy, // HTML/text content for returns page
} = config;
```

#### Updating Business Info (Admin)

```
PUT /api/v1/config
Authorization: Bearer <admin-token>
```

```json
{
  "businessName": "ChemTech",
  "businessDescription": "UK's leading chemical and cleaning supplies distributor",
  "businessPhone": "+44 1234 567890",
  "businessEmail": "info@chemibuild.co.uk",
  "businessAddress": "123 Industrial Estate, Thornbury Road",
  "businessCity": "Bradford",
  "businessPostcode": "BD1 1AA",
  "businessCountry": "GB",
  "businessHours": "Mon-Fri 9am-5pm, Sat 10am-2pm",
  "socialLinks": {
    "facebook": "https://facebook.com/chemibuild",
    "instagram": "https://instagram.com/chemibuild",
    "twitter": null,
    "linkedin": "https://linkedin.com/company/chemibuild",
    "youtube": null,
    "tiktok": null
  },
  "termsAndConditions": "<h1>Terms & Conditions</h1><p>...</p>",
  "privacyPolicy": "<h1>Privacy Policy</h1><p>...</p>",
  "returnPolicy": "<h1>Returns & Refunds</h1><p>...</p>"
}
```

Set any field to `null` to clear it.

#### Admin UI — Settings Page Sections

| Section              | Fields                                                               |
| -------------------- | -------------------------------------------------------------------- |
| **Business Details** | businessName, businessDescription, businessPhone, businessEmail      |
| **Business Address** | businessAddress, businessCity, businessPostcode, businessCountry     |
| **Opening Hours**    | businessHours (textarea)                                             |
| **Social Links**     | facebook, instagram, twitter, linkedin, youtube, tiktok (URL inputs) |
| **Legal Pages**      | termsAndConditions, privacyPolicy, returnPolicy (rich text editors)  |
| **Delivery**         | defaultDeliveryFee (number input)                                    |

#### Frontend Pages Using Business Info

| Page                   | Fields Used                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| **Footer** (all pages) | businessName, businessPhone, businessEmail, businessAddress, socialLinks                     |
| **Contact Page**       | businessPhone, businessEmail, businessAddress, businessCity, businessPostcode, businessHours |
| **About Page**         | businessName, businessDescription, businessHours                                             |
| **Terms & Conditions** | termsAndConditions (render as HTML)                                                          |
| **Privacy Policy**     | privacyPolicy (render as HTML)                                                               |
| **Return Policy**      | returnPolicy (render as HTML)                                                                |

---

### 14.2 Newsletter Subscription

#### Subscribe (Public — Footer/Popup)

```
POST /api/v1/config/newsletter/subscribe
```

```json
{
  "email": "customer@example.com",
  "name": "John"
}
```

`name` is optional.

**Responses:**

| Scenario                | Response                                   |
| ----------------------- | ------------------------------------------ |
| New subscriber          | `{ message: "Subscribed successfully." }`  |
| Already subscribed      | `{ message: "Already subscribed." }`       |
| Previously unsubscribed | `{ message: "Subscription reactivated." }` |

#### Unsubscribe (Public — Email Link)

```
POST /api/v1/config/newsletter/unsubscribe
```

```json
{
  "email": "customer@example.com"
}
```

**Response:** `{ message: "Unsubscribed successfully." }`

**Error:** 404 if email not found or already unsubscribed.

#### Admin — List Subscribers

```
GET /api/v1/config/newsletter/subscribers?active=true&page=1&limit=50
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "subscribers": [
      {
        "_id": "...",
        "email": "customer@example.com",
        "name": "John",
        "isActive": true,
        "subscribedAt": "2026-05-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 150,
      "totalPages": 3,
      "currentPage": 1,
      "perPage": 50,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

Query params: `active=true` (active only), `active=false` (unsubscribed only), omit for all.

#### Frontend Implementation — Newsletter Form

```typescript
// Footer or popup component
function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/config/newsletter/subscribe', { email });
      setStatus(data.data.message);
      setEmail('');
    } catch (err) {
      setStatus(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit">Subscribe</button>
      {status && <p>{status}</p>}
    </form>
  );
}
```

---

### 14.3 Contact Form

#### Submit Message (Public — Contact Page)

```
POST /api/v1/config/contact
```

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+447700900000",
  "subject": "Bulk order inquiry",
  "message": "I'd like to place a large order for cleaning supplies. Can you provide a quote?"
}
```

`phone` is optional. All other fields are required.

**Response (201):**

```json
{
  "success": true,
  "data": {
    "message": {
      "_id": "...",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+447700900000",
      "subject": "Bulk order inquiry",
      "message": "I'd like to place a large order...",
      "status": "unread",
      "createdAt": "2026-05-20T10:00:00.000Z"
    }
  }
}
```

#### Admin — List Messages

```
GET /api/v1/config/contact/messages?status=unread&page=1&limit=20
Authorization: Bearer <admin-token>
```

Filter by `status`: `unread`, `read`, `resolved`. Omit for all.

**Response:**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "_id": "...",
        "name": "John Smith",
        "email": "john@example.com",
        "phone": "+447700900000",
        "subject": "Bulk order inquiry",
        "message": "I'd like to place a large order...",
        "status": "unread",
        "createdAt": "2026-05-20T10:00:00.000Z"
      }
    ],
    "pagination": { ... }
  }
}
```

#### Admin — Update Message Status

```
PUT /api/v1/config/contact/messages/:id
Authorization: Bearer <admin-token>

{ "status": "read" }
```

Valid statuses: `unread`, `read`, `resolved`

#### Admin — Delete Message

```
DELETE /api/v1/config/contact/messages/:id
Authorization: Bearer <admin-token>
```

#### Frontend — Contact Page

```typescript
function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/config/contact', form);
    setSubmitted(true);
  };

  if (submitted) {
    return <p>Thank you! We'll get back to you soon.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required placeholder="Your Name" onChange={...} />
      <input name="email" type="email" required placeholder="Email" onChange={...} />
      <input name="phone" placeholder="Phone (optional)" onChange={...} />
      <input name="subject" required placeholder="Subject" onChange={...} />
      <textarea name="message" required placeholder="Your message..." onChange={...} />
      <button type="submit">Send Message</button>
    </form>
  );
}
```

#### Admin — Messages Inbox Page (`/admin/contact`)

```typescript
// List with status badges and actions
function ContactMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState(''); // '', 'unread', 'read', 'resolved'

  useEffect(() => {
    fetchMessages();
  }, [filter]);

  const fetchMessages = async () => {
    const params = new URLSearchParams({ page: '1', limit: '20' });
    if (filter) params.set('status', filter);
    const { data } = await api.get(`/config/contact/messages?${params}`);
    setMessages(data.data.messages);
  };

  const markAsRead = async (id) => {
    await api.put(`/config/contact/messages/${id}`, { status: 'read' });
    fetchMessages();
  };

  // Render table with name, email, subject, status badge, date, actions
}
```

---

### 14.4 Default Delivery Fee

When no delivery rate is configured for a city and no `default` rate exists, the system uses `defaultDeliveryFee` from platform config (default: £10).

#### Update via Admin

```json
PUT /api/v1/config
{ "defaultDeliveryFee": 5.99 }
```

#### Admin UI

Add a number input in the Settings → Delivery section:

- **Label:** "Fallback Delivery Fee"
- **Hint:** "Charged when no city-specific or default delivery rate is configured"
- **Default:** 10

---

### 14.5 Complete Config API Reference

```
GET  /api/v1/config                              → Public: read all config
PUT  /api/v1/config                              → Admin: update config fields

POST /api/v1/config/newsletter/subscribe         → Public: subscribe email
POST /api/v1/config/newsletter/unsubscribe       → Public: unsubscribe email
GET  /api/v1/config/newsletter/subscribers       → Admin: list subscribers

POST /api/v1/config/contact                      → Public: submit contact message
GET  /api/v1/config/contact/messages             → Admin: list messages
PUT  /api/v1/config/contact/messages/:id         → Admin: update message status
DELETE /api/v1/config/contact/messages/:id        → Admin: delete message

GET  /api/v1/config/testimonials                 → Public: list active testimonials
GET  /api/v1/config/testimonials/all             → Admin: list all (including inactive)
POST /api/v1/config/testimonials                 → Admin: create testimonial
PUT  /api/v1/config/testimonials/:id             → Admin: update testimonial
DELETE /api/v1/config/testimonials/:id            → Admin: delete testimonial

GET  /api/v1/config/delivery-rates               → Public: list delivery rates
POST /api/v1/config/delivery-rates               → Admin: create delivery rate
PUT  /api/v1/config/delivery-rates/:id           → Admin: update delivery rate
DELETE /api/v1/config/delivery-rates/:id          → Admin: delete delivery rate
```

---

## 15. Testimonials

### Overview

Admin-managed testimonials displayed on the homepage. Supports customer name, role, company, industry tag, avatar, rating, and sort order.

### API Endpoints

| Method | Endpoint                   | Auth                 | Description                                   |
| ------ | -------------------------- | -------------------- | --------------------------------------------- |
| GET    | `/config/testimonials`     | Public               | List active testimonials (sorted by position) |
| GET    | `/config/testimonials/all` | Admin (config.read)  | List all including inactive                   |
| POST   | `/config/testimonials`     | Admin (config.write) | Create testimonial                            |
| PUT    | `/config/testimonials/:id` | Admin (config.write) | Update testimonial                            |
| DELETE | `/config/testimonials/:id` | Admin (config.write) | Delete testimonial                            |

### Testimonial Object

```json
{
  "_id": "...",
  "name": "James Thornton",
  "role": "Production Manager",
  "company": "Thornton Engineering",
  "avatar": "https://res.cloudinary.com/.../avatar.jpg",
  "industry": "Manufacturing",
  "quote": "ChemTech's epoxy resins have transformed our manufacturing process. Consistent quality, fast delivery, and the bulk pricing saved us over £12,000 last year.",
  "rating": 5,
  "isActive": true,
  "position": 0,
  "createdAt": "2026-05-20T10:00:00.000Z"
}
```

### Create Testimonial (Admin)

```
POST /api/v1/config/testimonials
Authorization: Bearer <admin-token>
```

```json
{
  "name": "James Thornton",
  "role": "Production Manager",
  "company": "Thornton Engineering",
  "avatar": "https://example.com/avatar.jpg",
  "industry": "Manufacturing",
  "quote": "ChemTech's epoxy resins have transformed our manufacturing process. Consistent quality, fast delivery.",
  "rating": 5,
  "isActive": true,
  "position": 0
}
```

Required: `name`, `quote`, `rating`. All other fields optional.

### Update Testimonial (Admin)

```
PUT /api/v1/config/testimonials/:id
Authorization: Bearer <admin-token>

{ "position": 2, "isActive": false }
```

### Frontend — Homepage Section

```typescript
// Fetch testimonials (public)
const { data } = await api.get('/config/testimonials');
const testimonials = data.data.testimonials;
```

```tsx
<section className="py-16 bg-gray-50">
  <div className="container mx-auto px-4">
    {/* Header */}
    <div className="flex justify-between items-end mb-10">
      <div>
        <span className="text-orange-500 font-semibold text-sm uppercase tracking-wide">
          Trusted by 500+ businesses
        </span>
        <h2 className="text-3xl font-bold mt-2">What Our Customers Say</h2>
      </div>
      <div className="flex gap-2">
        <button
          onClick={prev}
          className="p-2 border rounded-full hover:bg-orange-500 hover:text-white transition"
        >
          ←
        </button>
        <button
          onClick={next}
          className="p-2 border rounded-full hover:bg-orange-500 hover:text-white transition"
        >
          →
        </button>
      </div>
    </div>

    {/* Cards Grid / Carousel */}
    <div className="grid md:grid-cols-3 gap-6">
      {testimonials.map((t) => (
        <div
          key={t._id}
          className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition"
        >
          {/* Stars */}
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <StarIcon
                key={i}
                className={i < t.rating ? 'text-orange-400' : 'text-gray-200'}
              />
            ))}
          </div>

          {/* Quote */}
          <p className="text-gray-700 mb-6 leading-relaxed italic">
            "{t.quote}"
          </p>

          {/* Author */}
          <div className="flex items-center gap-3 pt-4 border-t">
            {t.avatar ? (
              <img
                src={t.avatar}
                alt={t.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 font-bold">{t.name[0]}</span>
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">{t.name}</p>
              <p className="text-xs text-gray-500">
                {t.role}
                {t.company ? `, ${t.company}` : ''}
              </p>
            </div>
            {t.industry && (
              <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full">
                {t.industry}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

### Admin UI — Testimonials Page (`/admin/testimonials`)

**List view:**

- Table with: Name, Company, Industry, Rating, Position, Active toggle, Actions
- Drag-to-reorder (update `position` field) or manual position number
- Toggle `isActive` inline

**Create/Edit form:**

| Field    | Input Type                | Required | Notes                                        |
| -------- | ------------------------- | -------- | -------------------------------------------- |
| Name     | Text                      | ✅       | Customer name                                |
| Role     | Text                      | ❌       | Job title                                    |
| Company  | Text                      | ❌       | Company name                                 |
| Avatar   | URL input or image upload | ❌       | Photo URL                                    |
| Industry | Text or dropdown          | ❌       | e.g., Manufacturing, Healthcare, Hospitality |
| Quote    | Textarea                  | ✅       | Min 10 chars, max 1000                       |
| Rating   | Star selector (1-5)       | ✅       |                                              |
| Position | Number                    | ❌       | Sort order (0 = first)                       |
| Active   | Toggle                    | ❌       | Default: true                                |

**Suggested industry options (dropdown):**

```typescript
const industryOptions = [
  'Manufacturing',
  'Healthcare',
  'Hospitality',
  'Construction',
  'Automotive',
  'Education',
  'Retail',
  'Cleaning Services',
  'Food & Beverage',
  'Other',
];
```

### UX/UI Recommendations

1. **Carousel on mobile** — swipe between cards, show 1 at a time
2. **Grid on desktop** — show 3 cards, arrows paginate to next set
3. **Auto-rotate** — every 5 seconds, pause on hover
4. **Avatar fallback** — show first letter of name in a colored circle if no avatar
5. **Industry badge** — small colored pill in the corner of each card
6. **Minimum 3 testimonials** — don't show the section if fewer than 3 active testimonials
7. **Star rating** — filled orange stars, empty gray stars

---

## 16. Banner Placements

### Overview

Banners now support 4 placement types, each with specific use cases and optional fields.

### Placement Types

| Placement  | Use Case                 | Where Shown                                         |
| ---------- | ------------------------ | --------------------------------------------------- |
| `hero`     | Homepage carousel        | Full-width hero slider                              |
| `promo`    | Promotional cards        | 2-column grid below hero                            |
| `category` | Category-specific banner | Top of product listing when filtered by category    |
| `popup`    | Modal overlay            | Flash sales, first-visit offers, newsletter prompts |

### API Endpoints

```bash
# Hero banners (homepage carousel)
GET /api/v1/banners?placement=hero&active=true

# Promo banners (promotional cards)
GET /api/v1/banners?placement=promo&active=true

# Category-specific banner (on product listing page)
GET /api/v1/banners?placement=category&categorySlug=adhesives&active=true

# Popup banners
GET /api/v1/banners?placement=popup&active=true

# All active banners (any placement)
GET /api/v1/banners?active=true
```

### Banner Object — Full Shape

```json
{
  "_id": "...",
  "title": "Industrial Adhesives Sale",
  "subtitle": "20% off all epoxy products this month",
  "image": { "url": "https://...", "publicId": "banners/..." },
  "link": "/products?category=adhesives",
  "placement": "category",
  "ctaText": "Shop Sale",
  "position": 0,
  "isActive": true,
  "startDate": null,
  "endDate": null,
  "categorySlug": "adhesives",
  "popupDelay": 5,
  "popupFrequency": "once",
  "createdAt": "2026-05-21T10:00:00.000Z"
}
```

### Fields by Placement

| Field          | hero | promo | category    | popup |
| -------------- | ---- | ----- | ----------- | ----- |
| title          | ✅   | ✅    | ✅          | ✅    |
| subtitle       | ✅   | ✅    | ✅          | ✅    |
| image          | ✅   | ✅    | ✅          | ✅    |
| link           | ✅   | ✅    | ✅          | ✅    |
| ctaText        | ✅   | ✅    | ✅          | ✅    |
| categorySlug   | —    | —     | ✅ Required | —     |
| popupDelay     | —    | —     | —           | ✅    |
| popupFrequency | —    | —     | —           | ✅    |

### Frontend Implementation

#### Hero Banners (Homepage)

```typescript
// Already implemented — just add ?placement=hero
const { data } = await api.get('/banners?placement=hero&active=true');
```

#### Promo Banners (Homepage)

```typescript
const { data } = await api.get('/banners?placement=promo&active=true');
// Render as 2-column card grid with image, title, subtitle, CTA button
```

#### Category Banners (Product Listing Page)

```typescript
// On /products?category=adhesives page
const categorySlug = searchParams.get('category');

const { data } = await api.get(`/banners?placement=category&categorySlug=${categorySlug}&active=true`);
const categoryBanner = data.data.banners[0]; // Show first matching banner

{categoryBanner && (
  <div className="relative rounded-lg overflow-hidden mb-6">
    <img src={categoryBanner.image?.url} className="w-full h-48 object-cover" />
    <div className="absolute inset-0 bg-black/40 flex items-center p-8">
      <div>
        <h2 className="text-white text-2xl font-bold">{categoryBanner.title}</h2>
        {categoryBanner.subtitle && <p className="text-white/80 mt-1">{categoryBanner.subtitle}</p>}
        {categoryBanner.ctaText && (
          <Link href={categoryBanner.link} className="mt-3 inline-block bg-orange-500 text-white px-4 py-2 rounded">
            {categoryBanner.ctaText}
          </Link>
        )}
      </div>
    </div>
  </div>
)}
```

#### Popup Banners

```typescript
'use client';
import { useState, useEffect } from 'react';

function PopupBanner() {
  const [banner, setBanner] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    api.get('/banners?placement=popup&active=true').then(({ data }) => {
      const popup = data.data.banners[0];
      if (!popup) return;

      // Check frequency
      const storageKey = `popup_seen_${popup._id}`;
      if (popup.popupFrequency === 'once' && localStorage.getItem(storageKey)) return;
      if (popup.popupFrequency === 'session' && sessionStorage.getItem(storageKey)) return;

      setBanner(popup);

      // Show after delay
      setTimeout(() => setShow(true), (popup.popupDelay || 5) * 1000);
    });
  }, []);

  const handleClose = () => {
    setShow(false);
    if (banner.popupFrequency === 'once') localStorage.setItem(`popup_seen_${banner._id}`, '1');
    if (banner.popupFrequency === 'session') sessionStorage.setItem(`popup_seen_${banner._id}`, '1');
  };

  if (!show || !banner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl max-w-md w-full mx-4 overflow-hidden relative">
        <button onClick={handleClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 z-10">✕</button>
        {banner.image?.url && <img src={banner.image.url} className="w-full h-48 object-cover" />}
        <div className="p-6">
          <h2 className="text-xl font-bold">{banner.title}</h2>
          {banner.subtitle && <p className="text-gray-600 mt-2">{banner.subtitle}</p>}
          {banner.link && (
            <Link href={banner.link} onClick={handleClose} className="mt-4 inline-block bg-orange-500 text-white px-6 py-2 rounded">
              {banner.ctaText || 'Shop Now'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Add to layout.tsx (renders on all pages)
<PopupBanner />
```

### Admin UI — Banner Form Updates

**Placement dropdown (always visible):**

```typescript
const placementOptions = [
  { value: 'hero', label: 'Hero (Homepage Carousel)' },
  { value: 'promo', label: 'Promo (Homepage Cards)' },
  { value: 'category', label: 'Category (Product Listing)' },
  { value: 'popup', label: 'Popup (Modal Overlay)' },
];
```

**Conditional fields based on placement:**

```typescript
{placement === 'category' && (
  <Input label="Category Slug" field="categorySlug" placeholder="adhesives" hint="Must match a category slug exactly" />
)}

{placement === 'popup' && (
  <>
    <NumberInput label="Delay (seconds)" field="popupDelay" min={0} defaultValue={5} hint="Seconds before popup appears" />
    <Select label="Frequency" field="popupFrequency" options={[
      { value: 'once', label: 'Once per user' },
      { value: 'session', label: 'Once per session' },
      { value: 'always', label: 'Every page load' },
    ]} />
  </>
)}
```

### Popup Frequency Explained

| Value     | Storage        | Behaviour                                                |
| --------- | -------------- | -------------------------------------------------------- |
| `once`    | localStorage   | User sees it once ever (until they clear browser data)   |
| `session` | sessionStorage | User sees it once per browser session (tab close resets) |
| `always`  | None           | Shows every page load after delay                        |

---

## 17. Product Tags

### Overview

Tags are lightweight labels that can be assigned to products across categories. Unlike categories (hierarchical, one per product), tags are flat and a product can have multiple tags.

**Use cases:**

- "Eco-Friendly", "Best Seller", "New Arrival", "Industrial Grade"
- "On Sale", "Bulk Available", "Free Delivery"
- Seasonal: "Summer Collection", "Winter Essentials"

---

### API Endpoints

| Method | Endpoint                  | Auth                  | Description                            |
| ------ | ------------------------- | --------------------- | -------------------------------------- |
| GET    | `/catalog/tags`           | Public                | List active tags                       |
| GET    | `/catalog/tags/all`       | Admin (catalog.read)  | List all tags (including inactive)     |
| POST   | `/catalog/tags`           | Admin (catalog.write) | Create tag                             |
| PUT    | `/catalog/tags/:id`       | Admin (catalog.write) | Update tag                             |
| DELETE | `/catalog/tags/:id`       | Admin (catalog.write) | Delete tag (removes from all products) |
| POST   | `/catalog/tags/:id/image` | Admin (catalog.write) | Upload/replace tag image               |
| DELETE | `/catalog/tags/:id/image` | Admin (catalog.write) | Delete tag image                       |

---

### Tag Object

```json
{
  "_id": "6a12f001...",
  "name": "Eco-Friendly",
  "slug": "eco-friendly",
  "description": "Environmentally friendly products",
  "image": {
    "url": "https://pub-xxx.r2.dev/images/tags/abc123.webp",
    "publicId": "images/tags/abc123.webp"
  },
  "isActive": true,
  "createdAt": "2026-05-31T..."
}
```

`image` is optional — will be `undefined` if not uploaded.

---

### Admin — Tag Management

#### Create Tag

```bash
POST /api/v1/catalog/tags
Authorization: Bearer <admin-token>

{
  "name": "Eco-Friendly",
  "slug": "eco-friendly",
  "description": "Environmentally friendly products"
}
```

#### Update Tag

```bash
PUT /api/v1/catalog/tags/:id
Authorization: Bearer <admin-token>

{ "name": "Eco Friendly", "isActive": false }
```

#### Upload Tag Image

```bash
POST /api/v1/catalog/tags/:id/image
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
Field: "image"
```

#### Delete Tag

```bash
DELETE /api/v1/catalog/tags/:id
Authorization: Bearer <admin-token>
```

When a tag is deleted, it's automatically removed from all products that have it.

---

### Admin — Assign Tags to Products

Tags are assigned when creating or updating a product:

```bash
# Create product with tags
POST /api/v1/catalog/products
{
  "name": "Pine Disinfectant",
  "slug": "pine-disinfectant",
  "description": "...",
  "category": "categoryId",
  "tags": ["tagId1", "tagId2", "tagId3"]
}

# Update product tags
PUT /api/v1/catalog/products/:id
{
  "tags": ["tagId1", "tagId2"]
}
```

Pass the full array of tag IDs — it replaces the existing tags. Pass `[]` to remove all tags.

---

### Public — Filter Products by Tags

```bash
# Single tag
GET /api/v1/catalog/products?tags=tagId1

# Multiple tags (product must have ALL specified tags)
GET /api/v1/catalog/products?tags=tagId1,tagId2

# Combine with other filters
GET /api/v1/catalog/products?tags=tagId1&category=disinfectants&inStock=true&sortBy=price_asc
```

---

### All Product Filters (Complete Reference)

| Param             | Type    | Example                       | Description                                                         |
| ----------------- | ------- | ----------------------------- | ------------------------------------------------------------------- |
| `search`          | string  | `?search=pine`                | Text search (name + description), sorted by relevance               |
| `category`        | string  | `?category=disinfectants`     | Category ID or slug (includes subcategories)                        |
| `tags`            | string  | `?tags=id1,id2`               | Comma-separated tag IDs (must have ALL)                             |
| `featured`        | boolean | `?featured=true`              | Featured products only                                              |
| `inStock`         | boolean | `?inStock=true`               | In-stock products only                                              |
| `minPrice`        | number  | `?minPrice=5`                 | Minimum effective price                                             |
| `maxPrice`        | number  | `?maxPrice=50`                | Maximum effective price                                             |
| `attributes[Key]` | string  | `?attributes[Color]=Red,Blue` | Variant attribute filter (OR within key, AND across keys)           |
| `sortBy`          | enum    | `?sortBy=price_asc`           | Sort: `newest`, `price_asc`, `price_desc`, `name_asc`, `popularity` |
| `page`            | number  | `?page=2`                     | Page number (default: 1)                                            |
| `limit`           | number  | `?limit=12`                   | Items per page (default: 20)                                        |
| `status`          | enum    | `?status=draft`               | Admin: filter by status                                             |
| `includeAll`      | boolean | `?includeAll=true`            | Admin: show all statuses                                            |

All filters are AND-combined — product must match ALL specified filters.

---

### Frontend — Admin Tags Page (`/admin/tags`)

#### List View

```typescript
// Fetch all tags (including inactive)
const { data } = await api.get('/catalog/tags/all');
const tags = data.data.tags;

// Table columns: Image | Name | Slug | Active | Products Count | Actions
```

#### Create/Edit Form

| Field       | Input Type                     | Required | Notes                   |
| ----------- | ------------------------------ | -------- | ----------------------- |
| Name        | Text                           | ✅       | Max 50 chars            |
| Slug        | Text (auto-generate from name) | ✅       | Lowercase, max 50 chars |
| Description | Textarea                       | ❌       | Optional                |
| Image       | File upload                    | ❌       | Optional icon/badge     |
| Active      | Toggle                         | ❌       | Default: true           |

#### Admin Form Component

```typescript
function TagForm({ tag, onSave }) {
  const [form, setForm] = useState({
    name: tag?.name || '',
    slug: tag?.slug || '',
    description: tag?.description || '',
    isActive: tag?.isActive ?? true,
  });

  const handleSubmit = async () => {
    if (tag) {
      await api.put(`/catalog/tags/${tag._id}`, form);
    } else {
      await api.post('/catalog/tags', form);
    }
    onSave();
  };

  // Auto-generate slug from name
  const handleNameChange = (name) => {
    setForm({
      ...form,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
    });
  };
}
```

---

### Frontend — Admin Product Form (Tag Assignment)

Add a multi-select tag picker to the product create/edit form:

```typescript
// Fetch available tags for the picker
const { data } = await api.get('/catalog/tags');
const availableTags = data.data.tags;

// Multi-select component
<MultiSelect
  label="Tags"
  options={availableTags.map(t => ({ value: t._id, label: t.name }))}
  value={selectedTagIds}
  onChange={setSelectedTagIds}
  placeholder="Select tags..."
/>

// On save, include tags in the product payload
await api.put(`/catalog/products/${productId}`, {
  ...productData,
  tags: selectedTagIds,
});
```

---

### Frontend — Public Website (Tag Filters)

#### Product Listing Page — Tag Filter Chips

```typescript
// Fetch active tags
const { data } = await api.get('/catalog/tags');
const tags = data.data.tags;

// Render as clickable chips/pills
function TagFilter({ tags, selectedTags, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag._id}
          onClick={() => onToggle(tag._id)}
          className={`px-3 py-1 rounded-full text-sm border transition ${
            selectedTags.includes(tag._id)
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-orange-300'
          }`}
        >
          {tag.image?.url && <img src={tag.image.url} className="w-4 h-4 inline mr-1" />}
          {tag.name}
        </button>
      ))}
    </div>
  );
}
```

#### Update URL When Tags Selected

```typescript
const handleTagToggle = (tagId) => {
  const current = selectedTags.includes(tagId)
    ? selectedTags.filter((id) => id !== tagId)
    : [...selectedTags, tagId];

  setSelectedTags(current);

  // Update URL
  const params = new URLSearchParams(searchParams.toString());
  if (current.length > 0) {
    params.set('tags', current.join(','));
  } else {
    params.delete('tags');
  }
  params.set('page', '1');
  router.push(`/products?${params.toString()}`);
};
```

#### Product Card — Show Tag Badges

```typescript
// In product listing response, tags are ObjectIds
// Fetch tags once, build a lookup map
const tagMap = new Map(allTags.map(t => [t._id, t]));

// On product card
<div className="flex gap-1 mt-2">
  {product.tags?.slice(0, 3).map(tagId => {
    const tag = tagMap.get(tagId);
    if (!tag) return null;
    return (
      <span key={tagId} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
        {tag.name}
      </span>
    );
  })}
</div>
```

---

### Frontend — Tag Landing Pages (Optional)

Create pages like `/tags/eco-friendly` that show all products with that tag:

```typescript
// app/(public)/tags/[slug]/page.tsx
export default async function TagPage({ params }) {
  // Find tag by slug
  const { data: tagsData } = await api.get('/catalog/tags');
  const tag = tagsData.data.tags.find(t => t.slug === params.slug);

  if (!tag) return notFound();

  // Fetch products with this tag
  const { data } = await api.get(`/catalog/products?tags=${tag._id}`);

  return (
    <div>
      <h1>{tag.name}</h1>
      {tag.description && <p>{tag.description}</p>}
      <ProductGrid products={data.data.products} />
    </div>
  );
}
```

---

### Sidebar — Add to Admin Navigation

```typescript
// Under Catalog section
{ label: 'Tags', path: '/admin/tags', icon: 'Tag' },
```

---

### Checklist

**Admin Dashboard:**

- [ ] New page: `/admin/tags` — CRUD for tags
- [ ] Tag form: name, slug, description, image, active toggle
- [ ] Product form: add multi-select tag picker
- [ ] Sidebar: add "Tags" item under Catalog section

**Customer Website:**

- [ ] Product listing: add tag filter chips (clickable pills)
- [ ] URL updates when tags selected/deselected
- [ ] Product cards: show tag badges (optional)
- [ ] Tag landing pages `/tags/:slug` (optional)
- [ ] Fetch tags on page load for filter UI

---

## Appendix: Test Accounts

| Role       | Email                   | Password       |
| ---------- | ----------------------- | -------------- |
| Admin      | `admin@ecommerce.co.uk` | `Admin123@`    |
| Staff      | `staff@ecommerce.co.uk` | `Staff123@`    |
| Customer   | `customer@example.com`  | `Customer123@` |
| Bulk Buyer | `bulk@wholesale.co.uk`  | `Bulk123@`     |

> Run `npm run seed` on the backend to create these accounts with sample data.

---

## Appendix: Order Status Flow

The system uses **two separate status fields** on each order:

### Order Status (Fulfillment)

| Status       | Meaning                                     |
| ------------ | ------------------------------------------- |
| `pending`    | Order placed, awaiting payment confirmation |
| `confirmed`  | Payment received or COD accepted            |
| `processing` | Being prepared/packed                       |
| `shipped`    | In transit                                  |
| `delivered`  | Complete                                    |
| `cancelled`  | Cancelled by customer or admin              |

### Payment Status (Money)

| Status        | Meaning                                   |
| ------------- | ----------------------------------------- |
| `unpaid`      | Awaiting payment (Stripe pending)         |
| `paid`        | Payment received successfully             |
| `failed`      | Payment attempt failed                    |
| `refunded`    | Refund processed                          |
| `cod_pending` | COD — payment to be collected on delivery |

### Flow Diagram

```
ORDER STATUS (Delivery orders):
  pending → confirmed → processing → shipped → delivered
                                                    ↓
  cancelled ← (from pending or confirmed only)

ORDER STATUS (Pickup orders):
  pending → confirmed → processing → picked_up
                                         ↓
  cancelled ← (from pending or confirmed only)

PAYMENT STATUS:
  Stripe: unpaid → paid (webhook success)
                 → failed (webhook failure)
                 → refunded (admin refund)

  COD:    cod_pending → paid (on delivery confirmation)
```

### Checkout Combinations

| Payment Method | Initial Order Status | Initial Payment Status |
| -------------- | -------------------- | ---------------------- |
| Stripe         | `pending`            | `unpaid`               |
| COD            | `confirmed`          | `cod_pending`          |

### After Stripe Webhook

| Event                           | Order Status          | Payment Status |
| ------------------------------- | --------------------- | -------------- |
| `payment_intent.succeeded`      | `confirmed`           | `paid`         |
| `payment_intent.payment_failed` | `pending` (unchanged) | `failed`       |

### Refund

Refund only changes `paymentStatus` to `refunded`. The order status remains unchanged (e.g., stays `delivered`).

---

## Appendix: Environment Variables (Frontend)

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```
