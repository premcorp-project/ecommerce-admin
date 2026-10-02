# Zone-Based Delivery System — Migration & Frontend Upgrade Guide

**Base URL:** `/api/v1`
**Status:** Backend complete. Requires (1) one-time DB migration and (2) frontend endpoint updates.

---

## Table of Contents

1. [What Changed & Why](#1-what-changed--why)
2. [Database Changes](#2-database-changes)
3. [Removed Endpoints (Breaking)](#3-removed-endpoints-breaking)
4. [New Public Endpoints](#4-new-public-endpoints)
5. [New Admin Endpoints](#5-new-admin-endpoints)
6. [Unchanged Endpoints](#6-unchanged-endpoints)
7. [Configuration Change](#7-configuration-change)
8. [Frontend Upgrade Checklist](#8-frontend-upgrade-checklist)
9. [New Features to Implement](#9-new-features-to-implement)

---

## 1. What Changed & Why

The old system stored delivery pricing per **city** in a `DeliveryRate` collection. Each city was its own document. This made it impossible to:

- Group multiple cities under one shared price/config
- Support more than one country
- Bulk-manage coverage

The new system introduces a **Zone** model. A Zone groups one or more cities under a single country with shared weight-range pricing, estimated delivery days, an active flag, a default flag, and a priority. This is country-agnostic, so new countries can be added with data only — no code changes.

**Preserved unchanged:**
- Weight-range pricing logic
- `freeDelivery` flag behaviour (excluded for normal/guest users, included for bulk buyers)
- The fallback chain semantics (city match → default zone → flat fee)
- The checkout/estimate response shape (`deliveryFee`, `currency`, `estimatedDays`, `deliveryWeight`)

---

## 2. Database Changes

### New collection: `zones`

```jsonc
{
  "_id": "ObjectId",
  "name": "London Metro",              // zone display name
  "country": "GB",                      // ISO 3166-1 alpha-2, uppercase, default "GB"
  "cities": [
    { "name": "London", "normalized": "london" }   // normalized = name.trim().toLowerCase()
  ],
  "isActive": true,                     // default true
  "isDefault": false,                   // default false — only one active default per country
  "priority": 0,                        // higher wins when multiple zones match; default 0
  "estimatedDays": 3,                   // min 1, or null
  "weightRanges": [
    { "minWeight": 0, "maxWeight": 5, "price": 4.99 }
  ],
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### Migration (one-time, run by you)

```bash
node src/scripts/migrate-delivery-rates-to-zones.js
```

**What it does:**
- For each city-specific `DeliveryRate` → creates one Zone (single city, `isDefault: false`, `country: "GB"`)
- For the `city: "default"` `DeliveryRate` → creates one Zone with `isDefault: true`, empty `cities`
- Carries over `weightRanges`, `estimatedDays`, `isActive` **unaltered**
- **Idempotent** — running it twice creates zero duplicates
- **Does NOT delete** the source `DeliveryRate` documents (safe rollback)

**Reports:** `{ deliveryRatesProcessed, zonesCreated, zonesSkipped }`

### Configuration collection

A new field `deliveryMode` (`"strict"` | `"lenient"`, default `"lenient"`) is added. Existing config documents self-heal — when the field is absent, the code defaults to `"lenient"`. No migration needed.

### Not touched

`products`, `categories`, `variants`, `orders`, `users`, `coupons`, `banners`, `reviews`, `tags` — all untouched.

---

## 3. Removed Endpoints (Breaking)

These returned **404** now. Any admin UI page using them must migrate to the new `/delivery/zones` admin endpoints.

| Method | Old URL | Replacement |
|---|---|---|
| GET | `/api/v1/config/delivery-rates` | `GET /api/v1/delivery/zones/admin/list` |
| POST | `/api/v1/config/delivery-rates` | `POST /api/v1/delivery/zones` |
| PUT | `/api/v1/config/delivery-rates/:id` | `PUT /api/v1/delivery/zones/:id` |
| DELETE | `/api/v1/config/delivery-rates/:id` | `DELETE /api/v1/delivery/zones/:id` |

---

## 4. New Public Endpoints

All public endpoints require **no authentication**. All responses use the envelope `{ "success": true, "data": {...} }`.

### 4.1 List served cities

```
GET /api/v1/delivery/cities?country=GB
```
`country` is optional, defaults to `GB`.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "country": "GB",
    "cities": [
      { "name": "London", "value": "london" },
      { "name": "Manchester", "value": "manchester" }
    ]
  }
}
```
- Deduplicated by `value` (normalized name)
- A city appearing in **any inactive** zone is excluded
- Empty `cities: []` when no active zones exist

### 4.2 Check deliverability

```
GET /api/v1/delivery/check?country=GB&city=London
```
`country` optional (default `GB`), `city` **required**. Optional cart context can be sent in the body to also get a fee.

**200 Response (no cart context):**
```json
{
  "success": true,
  "data": {
    "deliverable": true,
    "zone": "London Metro",
    "estimatedDays": 3
  }
}
```

**200 Response (with cart context — includes `fee`):**
```json
{
  "success": true,
  "data": {
    "deliverable": true,
    "zone": "London Metro",
    "estimatedDays": 3,
    "fee": 4.99
  }
}
```

**200 Response (strict mode, city not served):**
```json
{
  "success": true,
  "data": {
    "deliverable": false,
    "zone": null,
    "estimatedDays": null
  }
}
```

### 4.3 Zone coverage list

```
GET /api/v1/delivery/zones?country=GB
```
`country` optional (default `GB`). Returns active zones with complete info (name + ≥1 city + estimatedDays).

**200 Response:**
```json
{
  "success": true,
  "data": {
    "country": "GB",
    "zones": [
      {
        "name": "London Metro",
        "cities": [{ "name": "London", "value": "london" }],
        "estimatedDays": 3
      }
    ]
  }
}
```

### 4.4 List served countries

```
GET /api/v1/delivery/countries
```

**200 Response:**
```json
{
  "success": true,
  "data": {
    "countries": [
      { "code": "GB", "name": "United Kingdom" },
      { "code": "IE", "name": "Ireland" }
    ]
  }
}
```
- Only countries with ≥1 active zone
- Unknown ISO codes fall back to `name = code`
- Empty `countries: []` when none active

---

## 5. New Admin Endpoints

All admin endpoints require:
- `Authorization: Bearer <token>`
- `config.write` permission

Missing token → **401**. Valid token without `config.write` → **403**.

### 5.1 Create zone

```
POST /api/v1/delivery/zones
```

**Request body:**
```json
{
  "name": "London Metro",
  "country": "GB",
  "cities": ["London", "Croydon"],
  "weightRanges": [
    { "minWeight": 0, "maxWeight": 5, "price": 4.99 },
    { "minWeight": 5, "maxWeight": 20, "price": 7.99 }
  ],
  "estimatedDays": 3,
  "isActive": true,
  "isDefault": false,
  "priority": 10
}
```
- `cities` accepts plain strings `["London"]` OR objects `[{ "name": "London" }]` — `normalized` is always derived server-side
- `country` defaults to `GB`; `isActive` to `true`; `isDefault` to `false`; `priority` to `0`
- `weightRanges` required, 1–20 entries, non-overlapping, `minWeight < maxWeight`

**201 Response:**
```json
{
  "success": true,
  "data": {
    "zone": {
      "_id": "665...",
      "name": "London Metro",
      "country": "GB",
      "cities": [
        { "name": "London", "normalized": "london" },
        { "name": "Croydon", "normalized": "croydon" }
      ],
      "weightRanges": [
        { "minWeight": 0, "maxWeight": 5, "price": 4.99 },
        { "minWeight": 5, "maxWeight": 20, "price": 7.99 }
      ],
      "estimatedDays": 3,
      "isActive": true,
      "isDefault": false,
      "priority": 10,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**400 errors:**
- Invalid weight ranges
- A city already assigned to another active zone in the same country
- Setting `isDefault: true` when an active default already exists for the country

### 5.2 Update zone

```
PUT /api/v1/delivery/zones/:id
```
All fields optional (partial update). Same body shape as create.

**200 Response:** `{ "success": true, "data": { "zone": { ...updated } } }`
**404** if zone not found.

### 5.3 Delete zone

```
DELETE /api/v1/delivery/zones/:id
```

**200 Response:**
```json
{ "success": true, "data": { "message": "Zone <id> deleted successfully." } }
```

### 5.4 List zones (admin, paginated)

```
GET /api/v1/delivery/zones/admin/list?country=GB&isActive=true&isDefault=false&page=1&limit=20
```
All query params optional.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "zones": [ /* full zone documents */ ],
    "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
  }
}
```

> **Note:** the admin list lives at `/delivery/zones/admin/list`, NOT `/delivery/zones` (that path is the public coverage endpoint).

### 5.5 Get single zone

```
GET /api/v1/delivery/zones/:id
```

**200 Response:** `{ "success": true, "data": { "zone": { ... } } }`

### 5.6 Bulk import zones

```
POST /api/v1/delivery/zones/bulk-import
```
Body **must be a JSON array** of zone objects (same shape as create). A non-array body → **400**.

**Request body:**
```json
[
  { "name": "London Metro", "country": "GB", "cities": ["London"], "weightRanges": [{ "minWeight": 0, "maxWeight": 5, "price": 4.99 }], "estimatedDays": 3 },
  { "name": "North England", "country": "GB", "cities": ["Manchester", "Leeds"], "weightRanges": [{ "minWeight": 0, "maxWeight": 10, "price": 6.99 }], "estimatedDays": 4 }
]
```
- Upsert by `name` + `country` (case-insensitive country): existing → updated, new → created
- Per-row isolation: a bad row is skipped, never aborts the batch

**200 Response:**
```json
{
  "success": true,
  "data": {
    "created": 1,
    "updated": 1,
    "skipped": 1,
    "errors": [
      { "index": 2, "reason": "Invalid weightRanges: entries must not overlap..." }
    ]
  }
}
```
Invariant: `created + updated + skipped = array.length`.

### 5.7 Export zones

```
GET /api/v1/delivery/zones/export?country=GB
```
`country` optional — omit to export all countries.

**200 Response:**
```json
{
  "success": true,
  "data": {
    "zones": [
      {
        "name": "London Metro",
        "country": "GB",
        "cities": [{ "name": "London", "normalized": "london" }],
        "weightRanges": [{ "minWeight": 0, "maxWeight": 5, "price": 4.99 }],
        "estimatedDays": 3,
        "isActive": true,
        "isDefault": false,
        "priority": 10
      }
    ]
  }
}
```
Output is stripped of `_id`, `__v`, `createdAt`, `updatedAt` so it can be fed straight back into bulk-import (export → import round-trip).

---

## 6. Unchanged Endpoints

No frontend change needed — same request and response shapes as before:

- **All checkout / order endpoints** — delivery fee resolution now goes through Zones internally, but the response still returns `{ deliveryFee, currency, estimatedDays, deliveryWeight }`.
- `GET /api/v1/orders/delivery-fee-estimate` (or your existing estimate route) — same shape.
- `GET /api/v1/config` — unchanged (now also includes `deliveryMode` in the returned config).
- All product, category, variant, banner, user, auth, wishlist endpoints — untouched.

---

## 7. Configuration Change

`PUT /api/v1/config` now accepts an optional `deliveryMode`:

```json
{ "deliveryMode": "strict" }
```

| Value | Behaviour when a city matches no zone |
|---|---|
| `"lenient"` (default) | Falls back to default zone, then to `defaultDeliveryFee` flat fee. Checkout always proceeds. |
| `"strict"` | City not covered by an active zone → checkout is **blocked with a 400 error**. Estimate/check still return `deliverable: false` without blocking. |

---

## 8. Frontend Upgrade Checklist

### Must-do (breaking)

- [ ] **Admin delivery management page** — replace all four `/config/delivery-rates` calls with the new `/delivery/zones` admin endpoints (§5). The data model changes from per-city rates to zones grouping cities.
  - List: `GET /delivery/zones/admin/list`
  - Create: `POST /delivery/zones`
  - Update: `PUT /delivery/zones/:id`
  - Delete: `DELETE /delivery/zones/:id`

### Should-do (new capabilities)

- [ ] **Customer city dropdown** — switch to `GET /delivery/cities?country=GB`. Use `value` for matching, `name` for display.
- [ ] **Deliverability check at address entry** — call `GET /delivery/check?country=GB&city=...` to show "We deliver here (3 days)" or "Not available" before checkout.
- [ ] **Config admin page** — add a `deliveryMode` toggle (strict/lenient) wired to `PUT /config`.

### Optional (nice to have)

- [ ] Country selector using `GET /delivery/countries` (only relevant once you add non-GB zones).
- [ ] Coverage page using `GET /delivery/zones`.
- [ ] Bulk import/export UI in admin (CSV → JSON → `POST /delivery/zones/bulk-import`; download via `GET /delivery/zones/export`).

---

## 9. New Features to Implement (Frontend)

### A. Zone management (admin) — replaces delivery rates

A zone editor where an admin can:
- Set zone name, country, and a list of cities (chips/tags input)
- Define weight-range pricing rows (minWeight, maxWeight, price)
- Set estimatedDays, isActive, isDefault, priority

**Validation to mirror client-side** (server enforces all of these with 400s):
- 1–20 weight ranges, non-overlapping, `minWeight < maxWeight`
- A city can only belong to one active zone per country
- Only one active default zone per country

### B. Deliverability widget (storefront)

At the address step, debounce-call `GET /delivery/check?country=GB&city=<city>`:
- `deliverable: true` → show zone name + estimated days, allow proceed
- `deliverable: false` (strict mode) → show "We don't deliver to this city yet" and block

Optionally send cart context to also display the live fee.

### C. Strict/lenient mode awareness

If `deliveryMode` is `strict`, the checkout call may return:
```json
{ "success": false, "message": "Delivery is not available for <city>." }  // HTTP 400
```
Handle this 400 gracefully at checkout — show the message and keep the user on the address step.

### D. Bulk import/export (admin)

- **Export:** call `GET /delivery/zones/export`, let the admin download as JSON (or convert to Excel client-side).
- **Import:** admin uploads Excel/CSV → frontend converts to the JSON array shape → `POST /delivery/zones/bulk-import`. Show the `{ created, updated, skipped, errors }` summary, highlighting each `errors[].index` row.

---

## Quick Reference — All New Routes

```
PUBLIC (no auth)
  GET  /api/v1/delivery/cities?country=GB
  GET  /api/v1/delivery/check?country=GB&city=London
  GET  /api/v1/delivery/zones?country=GB
  GET  /api/v1/delivery/countries

ADMIN (Bearer token + config.write)
  GET    /api/v1/delivery/zones/admin/list
  GET    /api/v1/delivery/zones/:id
  POST   /api/v1/delivery/zones
  PUT    /api/v1/delivery/zones/:id
  DELETE /api/v1/delivery/zones/:id
  POST   /api/v1/delivery/zones/bulk-import
  GET    /api/v1/delivery/zones/export?country=GB

REMOVED (now 404)
  GET/POST/PUT/DELETE  /api/v1/config/delivery-rates[/:id]
```
