# Customer Storefront Integration Guide

> **Audience:** Next.js developers building the customer-facing storefront for OttimoDirect.
> This guide covers every API endpoint, data shape, and implementation pattern needed to build the full shopping experience.
> This is NOT the admin panel guide.

**Backend Base URL:** `http://localhost:5000/api/v1`
**API Docs (Swagger):** `http://localhost:5000/api-docs`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication](#2-authentication)
3. [Homepage](#3-homepage)
4. [Product Listing Page](#4-product-listing-page)
5. [Product Detail Page](#5-product-detail-page)
6. [Cart](#6-cart)
7. [Wishlist](#7-wishlist)
8. [Checkout Flow](#8-checkout-flow)
9. [Order History & Tracking](#9-order-history--tracking)
10. [User Account](#10-user-account)
11. [Reviews](#11-reviews)
12. [Support Tickets](#12-support-tickets)
13. [Real-time (SSE)](#13-real-time-sse)
14. [Complete TypeScript Types](#14-complete-typescript-types)
15. [Common Patterns & Error Handling](#15-common-patterns--error-handling)

---

## 1. Architecture Overview

### Key Principles

| Rule                                       | Detail                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **All products are variant-based**         | There are no simple products. Every add-to-cart requires a `variantId`.                                                |
| **Price lives on the variant**             | `Product` has no `price` field. Use `variant.effectivePrice` for display (pre-calculated: `discountedPrice ?? price`). |
| **Cart item identity**                     | Cart update and remove use the cart item `_id` (from the cart response), NOT `productId` or `variantId`.               |
| **Wishlist is product-only**               | Wishlist tracks products, not specific variants.                                                                       |
| **Checkout rate limit**                    | 5 requests/min per IP. Show a friendly message on 429.                                                                 |
| **Coupon + perUserLimit**                  | Coupons with a per-user limit require authentication. Guests receive 403.                                              |
| **`minPrice` / `inventory` / `available`** | These are computed fields on the Product — derived from its variants.                                                  |
| **`variants` array**                       | Only present on the product detail endpoint, not on listing endpoints.                                                 |

### Response Envelope

All endpoints return JSON. Success responses follow:

```json
{ "success": true, "data": { ... } }
```

Error responses follow:

```json
{ "success": false, "message": "Human-readable error", "errors": [...] }
```

Access data as `res.data.data` for success payloads (axios). Some endpoints return `res.data` directly (e.g., auth token endpoints — check each section).

### Axios Instance (shared across all sections)

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true, // sends httpOnly cookies automatically
  headers: { 'Content-Type': 'application/json' },
});

export default api;
```

Interceptors for auth and error handling are covered in [Section 15](#15-common-patterns--error-handling).

---

## 2. Authentication

### 2.1 Register

```
POST /auth/register
```

**Request:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "customer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

The `accessToken` is also set as an `httpOnly` cookie. Store it in the cookie (recommended) rather than `localStorage`.

```typescript
// hooks/useRegister.ts
import api from '@/lib/api';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export async function register(payload: RegisterPayload) {
  const res = await api.post('/auth/register', payload);
  return res.data.data; // { user, accessToken }
}
```

### 2.2 Login

```
POST /auth/login
```

**Request:**

```json
{ "email": "jane@example.com", "password": "SecurePass123!" }
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "customer"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

```typescript
export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  return res.data.data; // { user, accessToken }
}
```

### 2.3 Google OAuth

Redirect the user to:

```
GET /auth/google
```

The backend handles the OAuth flow and redirects back to your configured callback URL with the session cookie set. No frontend token handling needed.

```typescript
// components/GoogleLoginButton.tsx
export function GoogleLoginButton() {
  return (
    <a href="http://localhost:5000/api/v1/auth/google">
      <button type="button">Continue with Google</button>
    </a>
  );
}
```

### 2.4 Token Refresh

```
POST /auth/refresh-token
```

The refresh token is stored in an `httpOnly` cookie and sent automatically via `withCredentials: true`. Call this endpoint when you receive a `401` on any request.

**Response `200`:**

```json
{
  "success": true,
  "data": { "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
}
```

### 2.5 Logout

```
POST /auth/logout
```

Clears the refresh token cookie server-side.

```typescript
export async function logout() {
  await api.post('/auth/logout');
  // clear any local user state
}
```

### 2.6 Guest vs Authenticated Differences

| Feature                     | Guest              | Authenticated                 |
| --------------------------- | ------------------ | ----------------------------- |
| Browse products             | ✅                 | ✅                            |
| Add to cart                 | ✅ (session-based) | ✅ (persisted)                |
| Wishlist                    | ❌                 | ✅                            |
| Checkout (COD)              | ✅                 | ✅                            |
| Checkout (Stripe)           | ✅                 | ✅                            |
| Coupons with `perUserLimit` | ❌ (403)           | ✅                            |
| Order history               | Guest lookup only  | ✅ full history               |
| Reviews                     | ❌                 | ✅ (delivered order required) |
| Support tickets             | ❌                 | ✅                            |

---

## 3. Homepage

### What to Fetch

The homepage needs three independent data sources. Fetch them in parallel:

| Data              | Endpoint                                        |
| ----------------- | ----------------------------------------------- |
| Featured products | `GET /catalog/products?isFeatured=true&limit=8` |
| Category tree     | `GET /catalog/categories`                       |
| Banners           | `GET /banners`                                  |

### Parallel Fetch Pattern

```typescript
// app/page.tsx (Next.js App Router — Server Component)
import api from '@/lib/api';
import type { Product, Category, Banner } from '@/types';

async function getHomepageData() {
  const [featuredRes, categoriesRes, bannersRes] = await Promise.all([
    api.get('/catalog/products', { params: { isFeatured: true, limit: 8 } }),
    api.get('/catalog/categories'),
    api.get('/banners'),
  ]);

  return {
    featuredProducts: featuredRes.data.data.products as Product[],
    categories: categoriesRes.data.data as Category[],
    banners: bannersRes.data.data as Banner[],
  };
}

export default async function HomePage() {
  const { featuredProducts, categories, banners } = await getHomepageData();

  return (
    <main>
      <BannerCarousel banners={banners} />
      <CategoryGrid categories={categories} />
      <FeaturedProducts products={featuredProducts} />
    </main>
  );
}
```

### Featured Products Response

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Industrial Epoxy Resin",
        "slug": "industrial-epoxy-resin",
        "description": "High-strength two-part epoxy...",
        "category": {
          "_id": "64f1...",
          "name": "Adhesives",
          "slug": "adhesives"
        },
        "images": [
          { "url": "https://cdn.example.com/img1.jpg", "publicId": "img1" }
        ],
        "isFeatured": true,
        "status": "active",
        "variantAttributes": [
          { "key": "Volume", "values": ["500ml", "1L", "5L"] }
        ],
        "averageRating": 4.7,
        "reviewCount": 23,
        "minPrice": 12.99,
        "inventory": 150,
        "available": true
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
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Adhesives",
      "slug": "adhesives",
      "image": {
        "url": "https://cdn.example.com/cat1.jpg",
        "publicId": "cat1"
      },
      "parent": null,
      "children": [
        { "_id": "64f1...", "name": "Epoxy", "slug": "epoxy", "children": [] }
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
      "_id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "title": "Summer Sale",
      "imageUrl": "https://cdn.example.com/banner1.jpg",
      "linkUrl": "/products?category=adhesives",
      "isActive": true,
      "order": 1
    }
  ]
}
```

---

## 4. Product Listing Page

This is the most important section. The listing endpoint is highly flexible and powers category pages, search, and filtered browsing.

### Endpoint

```
GET /catalog/products
```

### All Query Parameters

| Parameter         | Type    | Example                      | Description                                                   |
| ----------------- | ------- | ---------------------------- | ------------------------------------------------------------- |
| `page`            | number  | `1`                          | Page number (default: 1)                                      |
| `limit`           | number  | `20`                         | Items per page (default: 20)                                  |
| `category`        | string  | `64f1a2b3...` or `clothing`  | Filter by category `_id` or slug                              |
| `search`          | string  | `epoxy resin`                | Full-text search                                              |
| `sortBy`          | string  | `price_asc`                  | `newest`, `price_asc`, `price_desc`, `name_asc`, `popularity` |
| `minPrice`        | number  | `20`                         | Minimum effective price (uses discountedPrice when set)       |
| `maxPrice`        | number  | `150`                        | Maximum effective price (uses discountedPrice when set)       |
| `inStock`         | boolean | `true`                       | Only show `available: true` products                          |
| `featured`        | boolean | `true`                       | Only featured products                                        |
| `attributes[Key]` | string  | `attributes[Color]=Red,Blue` | OR within a key; AND across keys                              |

> **Never send `?includeAll=false`** — just omit the param for storefront requests. Only send `?includeAll=true` for admin views that need all statuses.

### Attribute Filter Logic

- `attributes[Color]=Red,Blue` → products that have Color=Red **OR** Color=Blue
- `attributes[Color]=Red&attributes[Size]=M` → products that have Color=Red **AND** Size=M
- Combine freely: `attributes[Color]=Red,Blue&attributes[Size]=M,L`

### Full Response Example

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Industrial Epoxy Resin",
        "slug": "industrial-epoxy-resin",
        "description": "High-strength two-part epoxy for industrial use.",
        "category": {
          "_id": "64f1...",
          "name": "Adhesives",
          "slug": "adhesives"
        },
        "images": [
          { "url": "https://cdn.example.com/img1.jpg", "publicId": "img1" }
        ],
        "isFeatured": false,
        "status": "active",
        "variantAttributes": [
          { "key": "Volume", "values": ["500ml", "1L", "5L"] }
        ],
        "averageRating": 4.7,
        "reviewCount": 23,
        "frequentlyBoughtTogether": [],
        "minPrice": 12.99,
        "inventory": 150,
        "available": true
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
        { "key": "Color", "values": ["Black", "Blue", "Red"] },
        { "key": "Size", "values": ["M", "L", "S", "XL"] },
        { "key": "Volume", "values": ["500ml", "1L", "5L"] }
      ],
      "priceRange": { "min": 5.99, "max": 299.99 }
    }
  }
}
```

### URL State Management (Next.js App Router)

Keep all filter state in the URL so pages are shareable and SSR-friendly.

```typescript
// app/products/page.tsx
import { Suspense } from 'react';
import { ReadonlyURLSearchParams } from 'next/navigation';
import api from '@/lib/api';
import type { ProductListResponse } from '@/types';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

async function fetchProducts(searchParams: PageProps['searchParams']): Promise<ProductListResponse> {
  // Build attribute filters from searchParams like attributes[Color]=Red,Blue
  const params: Record<string, string | number | boolean> = {};

  if (searchParams.page) params.page = Number(searchParams.page);
  if (searchParams.limit) params.limit = Number(searchParams.limit);
  if (searchParams.category) params.category = searchParams.category as string;
  if (searchParams.search) params.search = searchParams.search as string;
  if (searchParams.sortBy) params.sortBy = searchParams.sortBy as string;
  if (searchParams.minPrice) params.minPrice = Number(searchParams.minPrice);
  if (searchParams.maxPrice) params.maxPrice = Number(searchParams.maxPrice);
  if (searchParams.inStock) params.inStock = true;

  // Pass attribute filters through directly — axios serialises them correctly
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key.startsWith('attributes[')) {
      params[key] = value as string;
    }
  });

  const res = await api.get('/catalog/products', { params });
  return res.data.data;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const data = await fetchProducts(searchParams);

  return (
    <div className="flex gap-6">
      <FilterSidebar filters={data.availableFilters} />
      <div className="flex-1">
        <ProductGrid products={data.products} />
        <Pagination pagination={data.pagination} />
      </div>
    </div>
  );
}
```

### Filter Sidebar Implementation

```typescript
// components/FilterSidebar.tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import type { AvailableFilters } from '@/types';

interface FilterSidebarProps {
  filters: AvailableFilters;
}

export function FilterSidebar({ filters }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Reset to page 1 on filter change
      params.set('page', '1');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const toggleAttributeValue = useCallback(
    (attrKey: string, attrValue: string) => {
      const paramKey = `attributes[${attrKey}]`;
      const current = searchParams.get(paramKey);
      const currentValues = current ? current.split(',') : [];

      let newValues: string[];
      if (currentValues.includes(attrValue)) {
        newValues = currentValues.filter((v) => v !== attrValue);
      } else {
        newValues = [...currentValues, attrValue];
      }

      updateFilter(paramKey, newValues.length > 0 ? newValues.join(',') : null);
    },
    [searchParams, updateFilter]
  );

  return (
    <aside className="w-64 shrink-0">
      {/* Price Range */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Price Range</h3>
        <p className="text-sm text-gray-500">
          ${filters.priceRange.min} – ${filters.priceRange.max}
        </p>
        <input
          type="range"
          min={filters.priceRange.min}
          max={filters.priceRange.max}
          defaultValue={Number(searchParams.get('maxPrice')) || filters.priceRange.max}
          onChange={(e) => updateFilter('maxPrice', e.target.value)}
        />
      </div>

      {/* In Stock */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={searchParams.get('inStock') === 'true'}
            onChange={(e) => updateFilter('inStock', e.target.checked ? 'true' : null)}
          />
          In Stock Only
        </label>
      </div>

      {/* Attribute Filters */}
      {filters.attributes.map((attr) => {
        const paramKey = `attributes[${attr.key}]`;
        const selectedValues = (searchParams.get(paramKey) || '').split(',').filter(Boolean);

        return (
          <div key={attr.key} className="mb-6">
            <h3 className="font-semibold mb-2">{attr.key}</h3>
            <div className="flex flex-wrap gap-2">
              {attr.values.map((val) => (
                <button
                  key={val}
                  onClick={() => toggleAttributeValue(attr.key, val)}
                  className={`px-3 py-1 rounded border text-sm ${
                    selectedValues.includes(val)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
```

### Sort Selector

```typescript
// components/SortSelector.tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popularity', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A–Z' },
];

export function SortSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      value={searchParams.get('sortBy') || 'newest'}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sortBy', e.target.value);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
```

---

## 5. Product Detail Page

### Endpoint

```
GET /catalog/products/:idOrSlug
```

You can pass either the product `_id` or the `slug`. Use the slug for SEO-friendly URLs.

### Full Response

```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Industrial Epoxy Resin",
    "slug": "industrial-epoxy-resin",
    "description": "High-strength two-part epoxy for industrial use.",
    "category": { "_id": "64f1...", "name": "Adhesives", "slug": "adhesives" },
    "images": [
      { "url": "https://cdn.example.com/img1.jpg", "publicId": "img1" },
      { "url": "https://cdn.example.com/img2.jpg", "publicId": "img2" }
    ],
    "isFeatured": false,
    "status": "active",
    "variantAttributes": [{ "key": "Volume", "values": ["500ml", "1L", "5L"] }],
    "averageRating": 4.7,
    "reviewCount": 23,
    "frequentlyBoughtTogether": [
      "64f1a2b3c4d5e6f7a8b9c0d9",
      "64f1a2b3c4d5e6f7a8b9c0da"
    ],
    "minPrice": 12.99,
    "inventory": 150,
    "available": true,
    "variants": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0e1",
        "sku": "EPX-500ML",
        "attributes": [{ "key": "Volume", "value": "500ml" }],
        "price": 12.99,
        "discountedPrice": 10.99,
        "effectivePrice": 10.99,
        "bulkPricing": { "minQuantity": 10, "bulkPrice": 9.5 },
        "inventory": 80,
        "available": true,
        "image": "64f1a2b3c4d5e6f7a8b9c0f1",
        "imageUrl": "https://cdn.example.com/epx-500ml.jpg"
      },
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0e2",
        "sku": "EPX-1L",
        "attributes": [{ "key": "Volume", "value": "1L" }],
        "price": 22.99,
        "discountedPrice": null,
        "effectivePrice": 22.99,
        "bulkPricing": null,
        "inventory": 0,
        "available": false,
        "image": null,
        "imageUrl": null
      }
    ]
  }
}
```

### Fetching the Product

```typescript
// app/products/[slug]/page.tsx
import api from '@/lib/api';
import type { Product } from '@/types';

interface PageProps {
  params: { slug: string };
}

async function getProduct(slug: string): Promise<Product> {
  const res = await api.get(`/catalog/products/${slug}`);
  return res.data.data;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await getProduct(params.slug);

  // Fetch FBT products in parallel if any exist
  const fbtProducts = product.frequentlyBoughtTogether.length > 0
    ? await Promise.all(
        product.frequentlyBoughtTogether.map((id) =>
          api.get(`/catalog/products/${id}`).then((r) => r.data.data)
        )
      )
    : [];

  return <ProductDetailClient product={product} fbtProducts={fbtProducts} />;
}
```

### Variant Selector Implementation

```typescript
// components/VariantSelector.tsx
'use client';

import { useState, useMemo } from 'react';
import type { Product, Variant } from '@/types';

interface VariantSelectorProps {
  product: Product;
  onVariantChange: (variant: Variant | null) => void;
}

export function VariantSelector({ product, onVariantChange }: VariantSelectorProps) {
  // Track selected value per attribute key
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Find the variant that matches all current selections
  const selectedVariant = useMemo<Variant | null>(() => {
    if (!product.variants) return null;
    const keys = product.variantAttributes.map((a) => a.key);
    if (keys.some((k) => !selections[k])) return null; // not all selected yet

    return (
      product.variants.find((v) =>
        v.attributes.every((a) => selections[a.key] === a.value)
      ) ?? null
    );
  }, [selections, product.variants, product.variantAttributes]);

  const handleSelect = (key: string, value: string) => {
    const next = { ...selections, [key]: value };
    setSelections(next);

    // Resolve variant with new selections
    const keys = product.variantAttributes.map((a) => a.key);
    if (keys.every((k) => next[k])) {
      const variant = product.variants?.find((v) =>
        v.attributes.every((a) => next[a.key] === a.value)
      ) ?? null;
      onVariantChange(variant);
    } else {
      onVariantChange(null);
    }
  };

  // Determine which values are available given current partial selections
  const isValueAvailable = (key: string, value: string): boolean => {
    if (!product.variants) return false;
    const testSelections = { ...selections, [key]: value };
    return product.variants.some((v) => {
      // Check if any variant matches the test selections (ignoring unset keys)
      return Object.entries(testSelections).every(([k, val]) =>
        v.attributes.some((a) => a.key === k && a.value === val)
      ) && v.available;
    });
  };

  return (
    <div className="space-y-4">
      {product.variantAttributes.map((attr) => (
        <div key={attr.key}>
          <p className="font-medium mb-2">
            {attr.key}: <span className="font-normal">{selections[attr.key] || 'Select'}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {attr.values.map((val) => {
              const available = isValueAvailable(attr.key, val);
              const selected = selections[attr.key] === val;
              return (
                <button
                  key={val}
                  disabled={!available}
                  onClick={() => handleSelect(attr.key, val)}
                  className={`px-4 py-2 rounded border text-sm transition-colors ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : available
                      ? 'bg-white text-gray-800 border-gray-300 hover:border-blue-400'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                  }`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedVariant && (
        <VariantPriceDisplay variant={selectedVariant} />
      )}
    </div>
  );
}
```

### Price Display Logic

Always use `variant.effectivePrice` for the displayed price. Show a strikethrough on `variant.price` only when `discountedPrice` is not null.

```typescript
// components/VariantPriceDisplay.tsx
import type { Variant } from '@/types';

interface Props {
  variant: Variant;
  quantity?: number;
}

export function VariantPriceDisplay({ variant, quantity = 1 }: Props) {
  // Check if bulk pricing applies
  const bulkApplies =
    variant.bulkPricing !== null && quantity >= variant.bulkPricing.minQuantity;
  const displayPrice = bulkApplies ? variant.bulkPricing!.bulkPrice : variant.effectivePrice;
  const hasDiscount = variant.discountedPrice !== null;

  return (
    <div className="flex items-baseline gap-3">
      <span className="text-2xl font-bold text-gray-900">
        ${displayPrice.toFixed(2)}
      </span>

      {hasDiscount && !bulkApplies && (
        <span className="text-lg text-gray-400 line-through">
          ${variant.price.toFixed(2)}
        </span>
      )}

      {bulkApplies && (
        <span className="text-sm text-green-600 font-medium">
          Bulk price (min {variant.bulkPricing!.minQuantity} units)
        </span>
      )}

      {!variant.available && (
        <span className="text-sm text-red-500 font-medium">Out of Stock</span>
      )}
    </div>
  );
}
```

### Add to Cart Button

```typescript
// components/AddToCartButton.tsx
'use client';

import { useState } from 'react';
import api from '@/lib/api';
import type { Variant } from '@/types';

interface Props {
  productId: string;
  variant: Variant | null;
  quantity: number;
}

export function AddToCartButton({ productId, variant, quantity }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCart = async () => {
    if (!variant) {
      setError('Please select all options before adding to cart.');
      return;
    }
    if (!variant.available) {
      setError('This variant is out of stock.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/orders/cart', {
        productId,
        variantId: variant._id, // REQUIRED
        quantity,
      });
      // Show success toast / update cart count
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add to cart.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAddToCart}
        disabled={loading || !variant || !variant.available}
        className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

### Reviews Fetch

```
GET /catalog/products/:productId/reviews?page=1&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "_id": "64f1...",
        "user": { "_id": "64f1...", "name": "Jane Doe" },
        "rating": 5,
        "comment": "Excellent adhesion, very strong bond.",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 23,
      "totalPages": 3,
      "currentPage": 1,
      "perPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

```typescript
export async function fetchReviews(productId: string, page = 1) {
  const res = await api.get(`/catalog/products/${productId}/reviews`, {
    params: { page, limit: 10 },
  });
  return res.data.data; // { reviews, pagination }
}
```

---

## 6. Cart

### 6.1 Get Cart

```
GET /orders/cart
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0f1",
        "product": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
          "name": "Industrial Epoxy Resin",
          "slug": "industrial-epoxy-resin",
          "images": [
            { "url": "https://cdn.example.com/img1.jpg", "publicId": "img1" }
          ],
          "variantAttributes": [
            { "key": "Volume", "values": ["500ml", "1L", "5L"] }
          ]
        },
        "variant": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0e1",
          "sku": "EPX-500ML",
          "attributes": [{ "key": "Volume", "value": "500ml" }],
          "price": 12.99,
          "discountedPrice": 10.99,
          "bulkPricing": { "minQuantity": 10, "bulkPrice": 9.5 },
          "inventory": 80,
          "image": null
        },
        "quantity": 2
      }
    ],
    "itemCount": 2
  }
}
```

> **Note:** If a variant was deleted after being added to cart, it is silently removed from the cart response (auto-clean behaviour). Always re-render the cart from the API response.

### 6.2 Add to Cart

```
POST /orders/cart
```

**Request:**

```json
{
  "productId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "variantId": "64f1a2b3c4d5e6f7a8b9c0e1",
  "quantity": 2
}
```

`variantId` is **required**. Omitting it returns a `400` error.

**Response `200`:** Returns the updated cart (same shape as GET /orders/cart).

### 6.3 Update Cart Item Quantity

```
PUT /orders/cart/:itemId
```

Use the cart item `_id` from the cart response — **not** the `productId` or `variantId`.

**Request:**

```json
{ "quantity": 5 }
```

**Response `200`:** Returns the updated cart.

### 6.4 Remove Cart Item

```
DELETE /orders/cart/:itemId
```

No request body. Returns the updated cart.

### 6.5 Clear Cart

```
DELETE /orders/cart
```

Removes all items. Returns `{ "success": true, "data": { "items": [], "itemCount": 0 } }`.

### 6.6 Cart Implementation

```typescript
// hooks/useCart.ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Cart, CartItem } from '@/types';
import api from '@/lib/api';

export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/cart');
      setCart(res.data.data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addItem = async (
    productId: string,
    variantId: string,
    quantity: number,
  ) => {
    const res = await api.post('/orders/cart', {
      productId,
      variantId,
      quantity,
    });
    setCart(res.data.data);
  };

  const updateItem = async (itemId: string, quantity: number) => {
    const res = await api.put(`/orders/cart/${itemId}`, { quantity });
    setCart(res.data.data);
  };

  const removeItem = async (itemId: string) => {
    const res = await api.delete(`/orders/cart/${itemId}`);
    setCart(res.data.data);
  };

  const clearCart = async () => {
    const res = await api.delete('/orders/cart');
    setCart(res.data.data);
  };

  return {
    cart,
    loading,
    fetchCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
  };
}
```

### 6.7 Cart Total Calculation (Frontend Preview)

This is a client-side preview only. The authoritative total is calculated server-side at checkout.

```typescript
export function calculateCartPreview(items: CartItem[]): {
  subtotal: number;
  itemCount: number;
} {
  let subtotal = 0;
  let itemCount = 0;

  for (const item of items) {
    const variant = item.variant;
    // Use discountedPrice if available, otherwise price
    const unitPrice = variant.discountedPrice ?? variant.price;

    // Check bulk pricing
    const bulkApplies =
      variant.bulkPricing !== null &&
      item.quantity >= variant.bulkPricing.minQuantity;
    const effectiveUnitPrice = bulkApplies
      ? variant.bulkPricing!.bulkPrice
      : unitPrice;

    subtotal += effectiveUnitPrice * item.quantity;
    itemCount += item.quantity;
  }

  return { subtotal: Math.round(subtotal * 100) / 100, itemCount };
}
```

---

## 7. Wishlist

Wishlist tracks **products only** — no variant tracking. Requires authentication.

### 7.1 Get Wishlist

```
GET /wishlist
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0g1",
        "product": {
          "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
          "name": "Industrial Epoxy Resin",
          "slug": "industrial-epoxy-resin",
          "images": [
            { "url": "https://cdn.example.com/img1.jpg", "publicId": "img1" }
          ],
          "minPrice": 12.99,
          "available": true
        }
      }
    ]
  }
}
```

### 7.2 Add to Wishlist

```
POST /wishlist
```

**Request:**

```json
{ "productId": "64f1a2b3c4d5e6f7a8b9c0d1" }
```

**Response `200`:** Returns the updated wishlist.

### 7.3 Remove from Wishlist

```
DELETE /wishlist/:itemId
```

Use the wishlist item `_id` (not the `productId`). Returns the updated wishlist.

### 7.4 Check if Product is Wishlisted

```
GET /wishlist/check/:productId
```

**Response:**

```json
{
  "success": true,
  "data": { "isWishlisted": true, "itemId": "64f1a2b3c4d5e6f7a8b9c0g1" }
}
```

Use `itemId` for the subsequent DELETE call.

### 7.5 Heart Button Toggle Pattern

```typescript
// components/WishlistButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import api from '@/lib/api';

interface Props {
  productId: string;
}

export function WishlistButton({ productId }: Props) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get(`/wishlist/check/${productId}`)
      .then((res) => {
        setIsWishlisted(res.data.data.isWishlisted);
        setItemId(res.data.data.itemId ?? null);
      })
      .catch(() => {}); // not authenticated — silently ignore
  }, [productId]);

  const toggle = async () => {
    setLoading(true);
    try {
      if (isWishlisted && itemId) {
        await api.delete(`/wishlist/${itemId}`);
        setIsWishlisted(false);
        setItemId(null);
      } else {
        const res = await api.post('/wishlist', { productId });
        // Find the new item in the returned wishlist
        const newItem = res.data.data.items.find(
          (i: any) => i.product._id === productId
        );
        setIsWishlisted(true);
        setItemId(newItem?._id ?? null);
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Redirect to login
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
    >
      <Heart
        size={20}
        className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}
      />
    </button>
  );
}
```

---

## 8. Checkout Flow

### Step-by-Step Flow

```
1. View Cart
      ↓
2. Validate Coupon (optional, read-only preview)
      ↓
3. Select / Add Delivery Address
      ↓
4. Calculate Delivery Fee
      ↓
5. Select Payment Method (Stripe | COD)
      ↓
6a. Stripe → Create Order → Confirm Payment with Stripe.js
6b. COD    → Create Order → Done
      ↓
7. Order Confirmation Page
```

> **Rate limit:** Checkout endpoint is limited to **5 requests/min per IP**. On `429`, show: "Too many checkout attempts. Please wait a moment and try again."

### 8.1 Validate Coupon (Preview Only)

This endpoint validates a coupon and returns the discount preview. It does **not** apply the coupon — that happens when the order is created.

```
POST /coupons/validate
```

**Request:**

```json
{
  "code": "SAVE20",
  "cartTotal": 89.97
}
```

**Response `200`:**

```json
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
```

**Response `403` (perUserLimit coupon, guest user):**

```json
{
  "success": false,
  "message": "This coupon requires an account. Please log in to use it."
}
```

```typescript
export async function validateCoupon(code: string, cartTotal: number) {
  try {
    const res = await api.post('/coupons/validate', { code, cartTotal });
    return { success: true, data: res.data.data };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.message || 'Invalid coupon code.',
      status: err.response?.status,
    };
  }
}
```

### 8.2 Get User Addresses

```
GET /users/addresses
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0h1",
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

### 8.3 Calculate Delivery Fee

```
POST /orders/delivery-fee
```

**Request:**

```json
{
  "addressId": "64f1a2b3c4d5e6f7a8b9c0h1",
  "cartTotal": 89.97
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deliveryFee": 5.99,
    "freeShippingThreshold": 100.0,
    "qualifiesForFreeShipping": false
  }
}
```

### 8.4 Create Order (Stripe)

```
POST /orders
```

**Request:**

```json
{
  "addressId": "64f1a2b3c4d5e6f7a8b9c0h1",
  "paymentMethod": "stripe",
  "couponCode": "SAVE20"
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "orderId": "64f1a2b3c4d5e6f7a8b9c0i1",
    "orderNumber": "ORD-2024-00123",
    "paymentIntent": {
      "clientSecret": "pi_3OxYZ_secret_abc123",
      "amount": 7598,
      "currency": "usd"
    },
    "total": 75.98,
    "deliveryFee": 5.99,
    "discountAmount": 17.99
  }
}
```

### 8.5 Confirm Stripe Payment

After receiving the `clientSecret`, use Stripe.js to confirm the payment on the client.

```typescript
// components/StripeCheckout.tsx
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '@/lib/api';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutFormProps {
  clientSecret: string;
  orderId: string;
  onSuccess: (orderId: string) => void;
}

function CheckoutForm({ clientSecret, orderId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}/confirmation`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed.');
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      onSuccess(orderId);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

export function StripeCheckoutWrapper({ clientSecret, orderId, onSuccess }: CheckoutFormProps) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm clientSecret={clientSecret} orderId={orderId} onSuccess={onSuccess} />
    </Elements>
  );
}
```

### 8.6 Create Order (COD)

```
POST /orders
```

**Request:**

```json
{
  "addressId": "64f1a2b3c4d5e6f7a8b9c0h1",
  "paymentMethod": "cod",
  "couponCode": null
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "orderId": "64f1a2b3c4d5e6f7a8b9c0i2",
    "orderNumber": "ORD-2024-00124",
    "paymentIntent": null,
    "total": 95.96,
    "deliveryFee": 5.99,
    "discountAmount": 0
  }
}
```

No further payment steps needed. Redirect directly to the confirmation page.

### 8.7 Full Checkout Flow Implementation

```typescript
// hooks/useCheckout.ts
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface CheckoutPayload {
  addressId: string;
  paymentMethod: 'stripe' | 'cod';
  couponCode?: string;
}

export function useCheckout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeData, setStripeData] = useState<{
    clientSecret: string;
    orderId: string;
  } | null>(null);

  const createOrder = async (payload: CheckoutPayload) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/orders', payload);
      const data = res.data.data;

      if (payload.paymentMethod === 'cod') {
        router.push(`/orders/${data.orderId}/confirmation`);
        return;
      }

      // Stripe — show payment form
      setStripeData({
        clientSecret: data.paymentIntent.clientSecret,
        orderId: data.orderId,
      });
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message;

      if (status === 429) {
        setError(
          'Too many checkout attempts. Please wait a moment and try again.',
        );
      } else if (status === 400 && message?.includes('stock')) {
        setError(`Stock issue: ${message}. Please update your cart.`);
      } else if (status === 400 && message?.includes('coupon')) {
        setError(`Coupon error: ${message}`);
      } else {
        setError(message || 'Checkout failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return { createOrder, loading, error, stripeData };
}
```

### 8.8 Order Confirmation Page

```typescript
// app/orders/[orderId]/confirmation/page.tsx
import api from '@/lib/api';

interface PageProps {
  params: { orderId: string };
}

async function getOrder(orderId: string) {
  const res = await api.get(`/orders/${orderId}`);
  return res.data.data;
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const order = await getOrder(params.orderId);

  return (
    <div className="max-w-lg mx-auto py-12 text-center">
      <div className="text-green-500 text-6xl mb-4">✓</div>
      <h1 className="text-2xl font-bold mb-2">Order Confirmed!</h1>
      <p className="text-gray-600 mb-4">Order #{order.orderNumber}</p>
      <p className="text-gray-500">
        A confirmation email has been sent to {order.user?.email ?? order.guestEmail}.
      </p>
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
        <p className="font-medium">Total: ${order.total.toFixed(2)}</p>
        <p className="text-sm text-gray-500">Payment: {order.paymentMethod.toUpperCase()}</p>
        <p className="text-sm text-gray-500">Status: {order.status}</p>
      </div>
    </div>
  );
}
```

---

## 9. Order History & Tracking

### 9.1 Get Order List (Authenticated)

```
GET /orders?page=1&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0i1",
        "orderNumber": "ORD-2024-00123",
        "status": "processing",
        "paymentMethod": "stripe",
        "paymentStatus": "paid",
        "total": 75.98,
        "itemCount": 2,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 12,
      "totalPages": 2,
      "currentPage": 1,
      "perPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 9.2 Get Order Detail (Authenticated)

```
GET /orders/:orderId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0i1",
    "orderNumber": "ORD-2024-00123",
    "status": "shipped",
    "paymentMethod": "stripe",
    "paymentStatus": "paid",
    "items": [
      {
        "product": {
          "_id": "...",
          "name": "Industrial Epoxy Resin",
          "slug": "industrial-epoxy-resin"
        },
        "variant": {
          "_id": "...",
          "sku": "EPX-500ML",
          "attributes": [{ "key": "Volume", "value": "500ml" }]
        },
        "quantity": 2,
        "unitPrice": 10.99,
        "totalPrice": 21.98
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
    "trackingUrl": "https://www.ups.com/track?tracknum=1Z999AA10123456784",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T08:00:00.000Z"
  }
}
```

### 9.3 Guest Order Lookup

```
GET /orders/guest/:orderId?email=jane@example.com
```

**Response:** Same shape as authenticated order detail.

```typescript
export async function getGuestOrder(orderId: string, email: string) {
  const res = await api.get(`/orders/guest/${orderId}`, { params: { email } });
  return res.data.data;
}
```

### 9.4 Cancel Order

```
POST /orders/:orderId/cancel
```

Only available for orders in `pending` or `processing` status.

**Response `200`:**

```json
{ "success": true, "data": { "orderId": "...", "status": "cancelled" } }
```

```typescript
export async function cancelOrder(orderId: string) {
  try {
    const res = await api.post(`/orders/${orderId}/cancel`);
    return { success: true, data: res.data.data };
  } catch (err: any) {
    return {
      success: false,
      message: err.response?.data?.message || 'Cannot cancel this order.',
    };
  }
}
```

### 9.5 Reorder

```
POST /orders/:orderId/reorder
```

Adds all items from a previous order back into the current cart (skips unavailable variants).

**Response `200`:** Returns the updated cart.

```typescript
export async function reorder(orderId: string) {
  const res = await api.post(`/orders/${orderId}/reorder`);
  return res.data.data; // updated cart
}
```

---

## 10. User Account

### 10.1 Get Profile

```
GET /users/profile
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1-555-0100",
    "avatar": "https://cdn.example.com/avatars/jane.jpg",
    "role": "customer",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 10.2 Update Profile

```
PUT /users/profile
```

**Request:**

```json
{ "name": "Jane Smith", "phone": "+1-555-0200" }
```

**Response `200`:** Returns the updated user object.

```typescript
export async function updateProfile(data: { name?: string; phone?: string }) {
  const res = await api.put('/users/profile', data);
  return res.data.data;
}
```

### 10.3 Change Password

```
PUT /users/change-password
```

**Request:**

```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response `200`:**

```json
{ "success": true, "data": { "message": "Password updated successfully." } }
```

### 10.4 Addresses CRUD

**List:**

```
GET /users/addresses
```

**Add:**

```
POST /users/addresses
```

```json
{
  "label": "Office",
  "fullName": "Jane Doe",
  "phone": "+1-555-0100",
  "addressLine1": "456 Business Ave",
  "addressLine2": "Suite 200",
  "city": "Chicago",
  "state": "IL",
  "postalCode": "60601",
  "country": "US",
  "isDefault": false
}
```

**Update:**

```
PUT /users/addresses/:addressId
```

Same body as POST (partial updates accepted).

**Delete:**

```
DELETE /users/addresses/:addressId
```

**Set Default:**

```
PUT /users/addresses/:addressId/default
```

```typescript
// hooks/useAddresses.ts
import type { Address } from '@/types';
import api from '@/lib/api';

export const addressApi = {
  list: () => api.get('/users/addresses').then((r) => r.data.data as Address[]),
  add: (data: Omit<Address, '_id'>) =>
    api.post('/users/addresses', data).then((r) => r.data.data as Address),
  update: (id: string, data: Partial<Address>) =>
    api.put(`/users/addresses/${id}`, data).then((r) => r.data.data as Address),
  remove: (id: string) => api.delete(`/users/addresses/${id}`),
  setDefault: (id: string) =>
    api
      .put(`/users/addresses/${id}/default`)
      .then((r) => r.data.data as Address[]),
};
```

### 10.5 Push Notification Token Registration

```
POST /users/push-token
```

**Request:**

```json
{ "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]", "platform": "web" }
```

**Response `200`:**

```json
{ "success": true, "data": { "message": "Push token registered." } }
```

```typescript
export async function registerPushToken(token: string) {
  await api.post('/users/push-token', { token, platform: 'web' });
}
```

---

## 11. Reviews

### Rules

- User must have a **delivered** order containing the product.
- One review per product per user.
- Rating must be 1–5.
- Comment is optional.

### Submit a Review

```
POST /catalog/products/:productId/reviews
```

**Request:**

```json
{ "rating": 5, "comment": "Excellent adhesion, very strong bond." }
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0j1",
    "user": { "_id": "...", "name": "Jane Doe" },
    "rating": 5,
    "comment": "Excellent adhesion, very strong bond.",
    "createdAt": "2024-01-20T14:00:00.000Z"
  }
}
```

**Error `403`:** "You must have a delivered order containing this product to leave a review."
**Error `409`:** "You have already reviewed this product."

```typescript
// components/ReviewForm.tsx
'use client';

import { useState } from 'react';
import api from '@/lib/api';

interface Props {
  productId: string;
  onSuccess: () => void;
}

export function ReviewForm({ productId, onSuccess }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/catalog/products/${productId}/reviews`, { rating, comment });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-medium mb-1">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block font-medium mb-1">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full border rounded-lg p-2"
          placeholder="Share your experience..."
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}
```

---

## 12. Support Tickets

Requires authentication.

### 12.1 Create Ticket

```
POST /support/tickets
```

**Request:**

```json
{
  "subject": "Order not received",
  "message": "My order ORD-2024-00123 was marked as delivered but I haven't received it.",
  "orderId": "64f1a2b3c4d5e6f7a8b9c0i1"
}
```

**Response `201`:**

```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0k1",
    "ticketNumber": "TKT-2024-00045",
    "subject": "Order not received",
    "status": "open",
    "createdAt": "2024-01-20T15:00:00.000Z"
  }
}
```

### 12.2 List Tickets

```
GET /support/tickets?page=1&limit=10
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0k1",
        "ticketNumber": "TKT-2024-00045",
        "subject": "Order not received",
        "status": "open",
        "lastMessageAt": "2024-01-20T15:00:00.000Z",
        "createdAt": "2024-01-20T15:00:00.000Z"
      }
    ],
    "pagination": {
      "totalCount": 3,
      "totalPages": 1,
      "currentPage": 1,
      "perPage": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### 12.3 View Ticket

```
GET /support/tickets/:ticketId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0k1",
    "ticketNumber": "TKT-2024-00045",
    "subject": "Order not received",
    "status": "open",
    "messages": [
      {
        "_id": "64f1...",
        "sender": "customer",
        "message": "My order ORD-2024-00123 was marked as delivered but I haven't received it.",
        "createdAt": "2024-01-20T15:00:00.000Z"
      },
      {
        "_id": "64f1...",
        "sender": "support",
        "message": "We're looking into this for you. Please allow 24 hours.",
        "createdAt": "2024-01-20T16:30:00.000Z"
      }
    ]
  }
}
```

### 12.4 Add Message to Ticket

```
POST /support/tickets/:ticketId/messages
```

**Request:**

```json
{ "message": "It has now been 48 hours and still no update." }
```

**Response `200`:** Returns the updated ticket with all messages.

```typescript
export const supportApi = {
  create: (data: { subject: string; message: string; orderId?: string }) =>
    api.post('/support/tickets', data).then((r) => r.data.data),
  list: (page = 1) =>
    api
      .get('/support/tickets', { params: { page, limit: 10 } })
      .then((r) => r.data.data),
  get: (ticketId: string) =>
    api.get(`/support/tickets/${ticketId}`).then((r) => r.data.data),
  addMessage: (ticketId: string, message: string) =>
    api
      .post(`/support/tickets/${ticketId}/messages`, { message })
      .then((r) => r.data.data),
};
```

---

## 13. Real-time (SSE)

The backend pushes real-time events to authenticated customers via Server-Sent Events.

### Connect to the Stream

```
GET /notifications/stream
```

Requires authentication (cookie sent automatically with `withCredentials`). The connection stays open indefinitely. Reconnect automatically on disconnect.

### Customer-Relevant Event Types

| Event                  | When it fires                        | Payload                                             |
| ---------------------- | ------------------------------------ | --------------------------------------------------- |
| `order_status_updated` | Order status changes (e.g., shipped) | `{ orderId, orderNumber, status, trackingNumber? }` |
| `order_delivered`      | Order marked as delivered            | `{ orderId, orderNumber }`                          |
| `order_cancelled`      | Order cancelled by admin             | `{ orderId, orderNumber, reason? }`                 |
| `payment_confirmed`    | Stripe payment confirmed             | `{ orderId, orderNumber }`                          |
| `ticket_reply`         | Support agent replied to ticket      | `{ ticketId, ticketNumber, message }`               |
| `notification`         | General push notification            | `{ title, body, url? }`                             |

### EventSource Implementation

```typescript
// hooks/useSSE.ts
'use client';

import { useCallback, useEffect, useRef } from 'react';

type SSEHandler = (data: any) => void;

interface SSEOptions {
  onOrderStatusUpdated?: SSEHandler;
  onOrderDelivered?: SSEHandler;
  onOrderCancelled?: SSEHandler;
  onPaymentConfirmed?: SSEHandler;
  onTicketReply?: SSEHandler;
  onNotification?: SSEHandler;
}

export function useSSE(options: SSEOptions) {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // EventSource doesn't support custom headers, but cookies are sent automatically
    const es = new EventSource(
      'http://localhost:5000/api/v1/notifications/stream',
      { withCredentials: true },
    );

    es.addEventListener('order_status_updated', (e) => {
      options.onOrderStatusUpdated?.(JSON.parse(e.data));
    });

    es.addEventListener('order_delivered', (e) => {
      options.onOrderDelivered?.(JSON.parse(e.data));
    });

    es.addEventListener('order_cancelled', (e) => {
      options.onOrderCancelled?.(JSON.parse(e.data));
    });

    es.addEventListener('payment_confirmed', (e) => {
      options.onPaymentConfirmed?.(JSON.parse(e.data));
    });

    es.addEventListener('ticket_reply', (e) => {
      options.onTicketReply?.(JSON.parse(e.data));
    });

    es.addEventListener('notification', (e) => {
      options.onNotification?.(JSON.parse(e.data));
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Reconnect after 5 seconds
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    esRef.current = es;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);
}
```

### Usage Example

```typescript
// app/layout.tsx (inside authenticated layout)
'use client';

import { useSSE } from '@/hooks/useSSE';
import { toast } from 'sonner'; // or any toast library

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  useSSE({
    onOrderStatusUpdated: (data) => {
      toast.info(`Order ${data.orderNumber} is now ${data.status}.`);
    },
    onOrderDelivered: (data) => {
      toast.success(`Order ${data.orderNumber} has been delivered!`);
    },
    onTicketReply: (data) => {
      toast.info(`Support replied to ticket ${data.ticketNumber}.`);
    },
    onNotification: (data) => {
      toast(data.title, { description: data.body });
    },
  });

  return <>{children}</>;
}
```

---

## 14. Complete TypeScript Types

Place these in `types/index.ts` and import across your project.

```typescript
// types/index.ts

// ─── Core Models ────────────────────────────────────────────────────────────

export interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: { url: string; publicId: string };
  parent: string | null;
  children: Category[];
}

export interface Banner {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  isActive: boolean;
  order: number;
}

export interface VariantAttribute {
  key: string;
  values: string[];
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: { _id: string; name: string; slug: string };
  images: { url: string; publicId: string }[];
  isFeatured: boolean;
  status: 'active' | 'sold' | 'draft';
  variantAttributes: VariantAttribute[];
  averageRating: number;
  reviewCount: number;
  frequentlyBoughtTogether: string[]; // raw IDs — not populated
  // Computed fields
  minPrice: number | null;
  inventory: number;
  available: boolean;
  // Only on detail endpoint
  variants?: Variant[];
}

export interface BulkPricing {
  minQuantity: number;
  bulkPrice: number;
}

export interface Variant {
  _id: string;
  sku: string;
  attributes: { key: string; value: string }[];
  price: number;
  discountedPrice: number | null;
  effectivePrice: number; // use this for display: discountedPrice ?? price
  bulkPricing: BulkPricing | null;
  inventory: number;
  available: boolean;
  image: string | null;
  imageUrl: string | null; // resolved URL — use directly in <img src>
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItemVariant {
  _id: string;
  sku: string;
  attributes: { key: string; value: string }[];
  price: number;
  discountedPrice: number | null;
  bulkPricing: BulkPricing | null;
  inventory: number;
  image: string | null;
}

export interface CartItemProduct {
  _id: string;
  name: string;
  slug: string;
  images: { url: string; publicId: string }[];
  variantAttributes: VariantAttribute[];
}

export interface CartItem {
  _id: string; // use as itemId for PUT/DELETE /orders/cart/:itemId
  product: CartItemProduct;
  variant: CartItemVariant;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export interface WishlistItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    slug: string;
    images: { url: string; publicId: string }[];
    minPrice: number | null;
    available: boolean;
  };
}

export interface Wishlist {
  items: WishlistItem[];
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  product: { _id: string; name: string; slug: string };
  variant: {
    _id: string;
    sku: string;
    attributes: { key: string; value: string }[];
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: 'stripe' | 'cod';
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  trackingNumber?: string;
  trackingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderSummary {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: 'stripe' | 'cod';
  paymentStatus: PaymentStatus;
  total: number;
  itemCount: number;
  createdAt: string;
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
  paymentIntent: {
    clientSecret: string;
    amount: number;
    currency: string;
  } | null;
  total: number;
  deliveryFee: number;
  discountAmount: number;
}

export interface CouponValidationResult {
  valid: boolean;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  finalTotal: number;
  message: string;
}

// ─── Address ─────────────────────────────────────────────────────────────────

export interface Address {
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

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'customer' | 'admin';
  createdAt: string;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  _id: string;
  user: { _id: string; name: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

// ─── Support ─────────────────────────────────────────────────────────────────

export interface TicketMessage {
  _id: string;
  sender: 'customer' | 'support';
  message: string;
  createdAt: string;
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: TicketMessage[];
  lastMessageAt: string;
  createdAt: string;
}

// ─── Product Listing ─────────────────────────────────────────────────────────

export interface AttributeFilter {
  key: string;
  values: string[];
}

export interface AvailableFilters {
  // Attributes with 2+ distinct values across all matching products
  attributes: AttributeFilter[];
  // Price range uses effective price (discountedPrice if set, otherwise price)
  priceRange: { min: number; max: number };
}

export interface Pagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProductListResponse {
  products: Product[];
  pagination: Pagination;
  availableFilters: AvailableFilters;
}
```

---

## 15. Common Patterns & Error Handling

### 15.1 Axios Instance with Interceptors

```typescript
// lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token from memory/cookie ──────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // If using in-memory token storage (not httpOnly cookie):
  const token =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('accessToken')
      : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 with token refresh ──────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (
  error: AxiosError | null,
  token: string | null = null,
) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ── 401: attempt token refresh ──────────────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh-token');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login?session=expired';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 429: rate limit ─────────────────────────────────────────────────────
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const message = retryAfter
        ? `Too many requests. Please wait ${retryAfter} seconds.`
        : 'Too many requests. Please wait a moment and try again.';
      // Attach friendly message for consumers
      (error as any).friendlyMessage = message;
    }

    return Promise.reject(error);
  },
);

export default api;
```

### 15.2 Typed Error Helper

```typescript
// lib/apiError.ts
import { AxiosError } from 'axios';

export interface ApiError {
  message: string;
  status: number;
  errors?: { field: string; message: string }[];
}

export function parseApiError(err: unknown): ApiError {
  if (err instanceof AxiosError && err.response) {
    return {
      message: err.response.data?.message || 'An unexpected error occurred.',
      status: err.response.status,
      errors: err.response.data?.errors,
    };
  }
  return { message: 'Network error. Please check your connection.', status: 0 };
}
```

### 15.3 Optimistic UI Pattern (Cart)

Update the UI immediately, then sync with the server. Roll back on failure.

```typescript
// hooks/useOptimisticCart.ts
'use client';

import { useCallback, useState } from 'react';
import type { Cart } from '@/types';
import api from '@/lib/api';
import { parseApiError } from '@/lib/apiError';

export function useOptimisticCart(initialCart: Cart) {
  const [cart, setCart] = useState<Cart>(initialCart);
  const [error, setError] = useState<string | null>(null);

  const updateQuantity = useCallback(
    async (itemId: string, newQuantity: number) => {
      // Snapshot for rollback
      const snapshot = cart;

      // Optimistic update
      setCart((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item._id === itemId ? { ...item, quantity: newQuantity } : item,
        ),
      }));

      try {
        const res = await api.put(`/orders/cart/${itemId}`, {
          quantity: newQuantity,
        });
        setCart(res.data.data); // sync with server truth
      } catch (err) {
        setCart(snapshot); // rollback
        setError(parseApiError(err).message);
      }
    },
    [cart],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const snapshot = cart;

      setCart((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item._id !== itemId),
        itemCount: prev.itemCount - 1,
      }));

      try {
        const res = await api.delete(`/orders/cart/${itemId}`);
        setCart(res.data.data);
      } catch (err) {
        setCart(snapshot);
        setError(parseApiError(err).message);
      }
    },
    [cart],
  );

  return { cart, error, updateQuantity, removeItem };
}
```

### 15.4 Loading State Pattern

```typescript
// hooks/useAsync.ts
import { useCallback, useState } from 'react';
import { parseApiError } from '@/lib/apiError';

type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: string };

export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const run = useCallback(async (promise: Promise<T>) => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const data = await promise;
      setState({ status: 'success', data, error: null });
      return data;
    } catch (err) {
      const { message } = parseApiError(err);
      setState({ status: 'error', data: null, error: message });
      throw err;
    }
  }, []);

  return { ...state, run };
}
```

### 15.5 Next.js Caching Hints

For server components, use `fetch` cache options or revalidation tags where appropriate. With the axios instance, control caching via Next.js `unstable_cache` or route segment config.

```typescript
// app/products/[slug]/page.tsx — revalidate product data every 60 seconds
export const revalidate = 60;

// For on-demand revalidation after admin updates, use revalidateTag in a route handler:
// revalidateTag('products');
```

### 15.6 Error Boundary for API Failures

```typescript
// components/ApiErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; message: string }

export class ApiErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-center">
          <p className="text-red-500 font-medium">Something went wrong.</p>
          <p className="text-sm text-gray-500 mt-1">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 15.7 HTTP Status Code Reference

| Status | Meaning          | Action                                                   |
| ------ | ---------------- | -------------------------------------------------------- |
| `200`  | OK               | Use `res.data.data`                                      |
| `201`  | Created          | Use `res.data.data`                                      |
| `400`  | Bad Request      | Show `res.data.message` to user                          |
| `401`  | Unauthorized     | Attempt token refresh → redirect to login                |
| `403`  | Forbidden        | Show access denied message (e.g., coupon requires login) |
| `404`  | Not Found        | Show 404 page                                            |
| `409`  | Conflict         | Show conflict message (e.g., duplicate review)           |
| `422`  | Validation Error | Show field-level errors from `res.data.errors`           |
| `429`  | Rate Limited     | Show retry message with `Retry-After` header value       |
| `500`  | Server Error     | Show generic error, log to monitoring                    |

---

_Guide version: 1.0 — OttimoDirect Customer Storefront_
_Backend base URL: `http://localhost:5000/api/v1`_

---

## Bulk Buyer Experience

### Detection

From `GET /api/v1/users/profile`:

```json
{ "data": { "user": { "isBulkBuyer": true } } }
```

Frontend maps this to `user.hasBulkAccess` in the customer auth store.

### Variant Bulk Pricing Data

Each variant may have:

```json
{
  "price": 89.99,
  "discountedPrice": 69.99,
  "bulkPricing": { "minQuantity": 10, "bulkPrice": 49.99 },
  "inventory": 5000
}
```

### UI Requirements

**1. Bulk Price Tag** — Show on product detail when `user.hasBulkAccess && variant.bulkPricing`:

```
£69.99 each
🏷️ Bulk: £49.99 (min 10 units)
```

Hidden for non-bulk users or variants without `bulkPricing`.

**2. Quantity Input** — Bulk buyers get a free-type number input (no max=10 limit). Normal users get the +/- stepper (1–10 range).

**3. Effective Price Calculation:**

```ts
const getDisplayPrice = (variant, quantity, isBulkBuyer) => {
  const retailPrice = variant.discountedPrice ?? variant.price;
  if (isBulkBuyer && variant.bulkPricing) {
    const { minQuantity, bulkPrice } = variant.bulkPricing;
    if (quantity >= minQuantity) return { price: bulkPrice, isBulk: true };
  }
  return { price: retailPrice, isBulk: false };
};
```

**4. Minimum Order Hint** — When quantity < minQuantity, show:

```
Add X more for bulk price (£49.99/unit)
```

**5. Cart Savings** — Show "You saved £X with bulk pricing" in cart summary for bulk buyers.

### Backend Handles

- Bulk price calculation at checkout (frontend is display-only)
- Inventory validation (rejects if quantity > stock)
- Minimum quantity enforcement (applies normal price if below threshold)
- Price tampering prevention (prices come from DB, not frontend)

---

## Stripe Checkout Flow

### Setup

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Flow

1. **Create order** — `POST /api/v1/orders/checkout` with `{ paymentMethod: "stripe", addressId }` (auth) or `{ paymentMethod: "stripe", deliveryAddress, items, guestEmail }` (guest)

2. **Response** — `{ data: { order: { orderId, ... }, clientSecret: "pi_xxx_secret_xxx" } }`

3. **Render Stripe Elements:**

```tsx
<Elements stripe={stripePromise} options={{ clientSecret }}>
  <StripePaymentForm orderId={orderId} />
</Elements>
```

4. **Confirm payment:**

```ts
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: { return_url: `${origin}/orders/${orderId}/confirmation` },
});
```

5. **Success** — Stripe redirects to `/orders/{orderId}/confirmation?redirect_status=succeeded`. The webhook confirms the order on the backend.

### COD Flow (Auth users with `isCodEnabled` only)

- `POST /api/v1/orders/checkout` with `{ paymentMethod: "cod", addressId }`
- No `clientSecret` returned — order is confirmed immediately
- Redirect straight to `/orders/{orderId}/confirmation`
- Guests cannot use COD (403)

### Response Shape (Checkout)

```json
{
  "success": true,
  "data": {
    "order": {
      "orderId": "ORD-ABC123",
      "_id": "...",
      "status": "pending",
      "paymentStatus": "unpaid",
      "total": 27.99,
      ...
    },
    "clientSecret": "pi_xxx_secret_xxx"
  }
}
```

### Delivery Fee

`POST /api/v1/orders/delivery-fee`

- Auth: `{ addressId }`
- Guest: `{ city }`
- Response: `{ data: { deliveryFee, currency, estimatedDays } }`

---

## Google OAuth Flow

### Setup

**Backend `.env`:**

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

**Frontend `.env.local`:**

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Flow

1. **User clicks "Continue with Google"** on the login page → navigates to `GET /api/v1/auth/google`

2. **Backend redirects to Google** consent screen

3. **Google authenticates** → redirects to backend `GET /api/v1/auth/google/callback?code=...`

4. **Backend processes the callback** — creates/finds user, generates JWT, then **redirects to frontend:**

```
GET {FRONTEND_URL}/auth/google/callback?token={jwt}&user={encodeURIComponent(JSON.stringify(user))}
```

5. **Frontend callback page** (`app/(auth)/auth/google/callback/page.tsx`) reads params, stores auth in Zustand, redirects to `/account`

### Backend Callback Handler — Required Redirect

The backend `GET /auth/google/callback` handler **must redirect** to the frontend — not return JSON:

```js
// ✅ CORRECT — redirect to frontend with token
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const userParam = encodeURIComponent(
  JSON.stringify({
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isBulkBuyer: user.isBulkBuyer,
    isCodEnabled: user.isCodEnabled,
  }),
);
res.redirect(
  `${frontendUrl}/auth/google/callback?token=${token}&user=${userParam}`,
);

// ❌ WRONG — returns JSON in the browser, frontend never receives it
res.json({ success: true, data: { user, token } });
```

### Frontend Callback Page

Located at `app/(auth)/auth/google/callback/page.tsx`:

- Reads `token` and `user` from URL search params
- Parses user JSON, maps to `CustomerUser` shape
- Calls `setAuth(customerUser, token)` on the customer auth store
- Redirects to `/account`
- On error → redirects to `/login?error=google_failed`

### Error Handling

| Scenario                  | Behaviour                                                             |
| ------------------------- | --------------------------------------------------------------------- |
| User denies consent       | Backend should redirect to `{FRONTEND_URL}/login?error=google_denied` |
| Token/user params missing | Frontend redirects to `/login?error=google_failed`                    |
| Invalid user JSON         | Frontend redirects to `/login?error=google_failed`                    |
| Backend error             | Backend should redirect to `{FRONTEND_URL}/login?error=google_failed` |

---

## Order Response Shape (GET /orders/:orderId)

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "...",
      "orderId": "ORD-ABC123",
      "items": [{
        "product": { "_id": "...", "name": "...", "slug": "...", "images": [...] },
        "variant": { "_id": "...", "sku": "...", "attributes": [...], "price": 10 },
        "variantAttributes": [{ "key": "Size", "value": "S" }],
        "variantSku": "SKU-123",
        "name": "Product Name",
        "price": 10,
        "quantity": 2,
        "isBulkPriceApplied": false
      }],
      "subtotal": 20,
      "taxRate": 20,
      "taxAmount": 4,
      "deliveryFee": 3.99,
      "total": 27.99,
      "estimatedDelivery": "2026-05-23T00:00:00.000Z",
      "status": "shipped",
      "paymentStatus": "paid",
      "createdAt": "2026-05-15T08:38:05.762Z"
    }
  }
}
```

Key fields:

- `orderId` — human-readable ID (use for all API calls and URLs, NOT `_id`)
- `estimatedDelivery` — show to customer when not null
- `isBulkPriceApplied` — show "Bulk Price" badge on order items
- `variant` — now populated with full variant data (sku, attributes, price)

---

## Banner API (GET /banners?active=true)

```json
{
  "success": true,
  "data": {
    "banners": [
      {
        "_id": "...",
        "title": "Summer Sale",
        "image": { "url": "https://...", "publicId": "banners/..." },
        "link": "/products?category=adhesives",
        "position": 1,
        "isActive": true
      }
    ]
  }
}
```

Fields: `image.url` (not `imageUrl`), `link` (not `linkUrl`), `position` (not `order`).
Banners are full-width images — the image carries all visual content. No text overlay needed.

---

## Cart API (GET /orders/cart)

```json
{
  "success": true,
  "data": {
    "cart": {
      "items": [...],
      "totalItems": 5,
      "totalUniqueItems": 2
    }
  }
}
```

- `totalItems` — sum of all quantities (use for cart badge)
- `totalUniqueItems` — number of distinct line items
