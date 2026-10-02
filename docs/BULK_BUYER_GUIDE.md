# Bulk Buyer & Tiered Pricing Guide

Complete guide for the tiered pricing system — bulk buyer tiers and retail discount tiers.

---

## Table of Contents

- [Overview](#overview)
- [Admin Setup](#admin-setup)
- [Tiered Bulk Pricing](#tiered-bulk-pricing)
- [Retail Discount Tiers (Normal/Guest Users)](#retail-discount-tiers-normaguest-users)
- [Coupon Interaction](#coupon-interaction)
- [Pricing Precedence](#pricing-precedence)
- [API Reference](#api-reference)
- [Frontend Implementation](#frontend-implementation)
- [Security](#security)
- [File References](#file-references)

---

## Overview

The pricing system supports two discount mechanisms:

| Mechanism | Target Users | Configuration | Precedence |
|-----------|-------------|---------------|------------|
| **Tiered Bulk Pricing** | Bulk buyers only | `bulkPricingTiers` on variant | Highest (for bulk buyers) |
| **Retail Discount Tiers** | Normal + Guest users | `retailDiscountTiers` on variant | Applied unless coupon active |

### Pricing Stack (How Prices Layer)

Prices are applied in layers — each builds on the previous:

```
Layer 1: Base Price (variant.price)              → always set, required
Layer 2: Sale Price (variant.discountedPrice)    → optional, must be < price
Layer 3: Tier Discount (applied ON TOP of sale price)
         - Bulk buyers: bulkPricingTiers
         - Normal/Guest: retailDiscountTiers
Layer 4: Coupon (applied to order total, replaces Layer 3 for normal/guest)
```

The **effective retail price** is the starting point for all tier calculations:

```
effectiveRetailPrice = variant.discountedPrice ?? variant.price
```

| Variant Config | Effective Retail Price | Tiers Discount From |
|---|---|---|
| price: £100, discountedPrice: null | £100 | £100 |
| price: £100, discountedPrice: £80 | £80 | £80 |

Sale price and tiers stack. Example: price £100, sale £80, bulk tier 15% off → £80 × 0.85 = £68 (32% total discount from original).

### Key Concepts

| Concept | Description |
|---------|-------------|
| Bulk Buyer | User with `isBulkBuyer: true` (admin-toggled) |
| Pricing Tier | Entry in `bulkPricingTiers`: quantity range + discount |
| Retail Discount | Entry in `retailDiscountTiers`: quantity range + discount for normal/guest |
| Fixed Type | Tier value IS the unit price (bulk) or subtracted from price (retail) |
| Percentage Type | Tier value is % discount off effective retail price |
| Effective Retail Price | `discountedPrice` if set, otherwise `price` |

---

## Admin Setup

### 1. Enable Bulk Buyer on a User

```
PUT /api/v1/users/:userId/bulk-buyer
Authorization: Bearer <admin-token>

{ "isBulkBuyer": true }
```

### 2. Configure Tiered Bulk Pricing on a Variant

```
POST /api/v1/variants/products/:productId
Authorization: Bearer <admin-token>

{
  "attributes": [{ "key": "Size", "value": "M" }],
  "price": 89.99,
  "discountedPrice": 69.99,
  "inventory": 5000,
  "bulkPricingTiers": [
    { "minQty": 10, "maxQty": 49, "type": "percentage", "value": 10 },
    { "minQty": 50, "maxQty": 199, "type": "percentage", "value": 20 },
    { "minQty": 200, "maxQty": 999, "type": "fixed", "value": 45.00 },
    { "minQty": 1000, "maxQty": null, "type": "fixed", "value": 39.99 }
  ]
}
```

### 3. Configure Retail Discount Tiers

```
PUT /api/v1/variants/:variantId
Authorization: Bearer <admin-token>

{
  "retailDiscountTiers": [
    { "minQty": 3, "maxQty": 5, "type": "percentage", "value": 5 },
    { "minQty": 6, "maxQty": 10, "type": "percentage", "value": 10 },
    { "minQty": 11, "maxQty": 20, "type": "fixed", "value": 10.00 }
  ]
}
```

### Validation Rules

#### Bulk Pricing Tiers

| Rule | Constraint |
|------|-----------|
| Max entries | 10 tiers per variant |
| `minQty` | Integer ≥ 1 |
| `maxQty` | Integer ≥ minQty, or `null` (last tier only) |
| Ordering | Ascending by minQty, non-overlapping |
| Overlap | Each tier's minQty must be > previous tier's maxQty |
| Null maxQty | Only the last tier may have `null` (unbounded) |
| Percentage value | Between 1 and 99 inclusive |
| Fixed value | Must be less than effective retail price |

#### Retail Discount Tiers

Same rules as bulk tiers, except:
- `maxQty` is always required (no null allowed)
- Fixed value is subtracted from price (not used as absolute price)

---

## Tiered Bulk Pricing

### How It Works

When a bulk buyer checks out, the pricing engine finds the matching tier for each item's quantity:

```
bulkPricingTiers: [
  { minQty: 10, maxQty: 49, type: "percentage", value: 10 },   → 10% off
  { minQty: 50, maxQty: 199, type: "percentage", value: 20 },  → 20% off
  { minQty: 200, maxQty: 999, type: "fixed", value: 45.00 },   → £45/unit
  { minQty: 1000, maxQty: null, type: "fixed", value: 39.99 }  → £39.99/unit
]
```

### Calculation Examples

Given: `price: £89.99`, `discountedPrice: £69.99` (effective retail = £69.99)

| Quantity | Matching Tier | Calculation | Unit Price |
|----------|--------------|-------------|------------|
| 5 | None | No tier matches | £69.99 |
| 10 | Tier 1 (10-49, 10%) | £69.99 × (1 - 10/100) | £62.99 |
| 50 | Tier 2 (50-199, 20%) | £69.99 × (1 - 20/100) | £55.99 |
| 200 | Tier 3 (200-999, fixed £45) | Fixed value | £45.00 |
| 1000 | Tier 4 (1000+, fixed £39.99) | Fixed value | £39.99 |
| 5000 | Tier 4 (null maxQty) | Fixed value | £39.99 |

### Type Behavior (Bulk)

- **Fixed**: The tier `value` IS the unit price (absolute)
- **Percentage**: Unit price = effectiveRetailPrice × (1 - value/100), rounded to 2dp (half-up)

---

## Retail Discount Tiers (Normal/Guest Users)

### How It Works

Normal and guest users get quantity-based discounts via `retailDiscountTiers`. These are only applied when NO coupon is active.

```
retailDiscountTiers: [
  { minQty: 3, maxQty: 5, type: "percentage", value: 5 },    → 5% off
  { minQty: 6, maxQty: 10, type: "percentage", value: 10 },  → 10% off
  { minQty: 11, maxQty: 20, type: "fixed", value: 10.00 }    → £10 off
]
```

### Calculation Examples

Given: `price: £89.99`, `discountedPrice: £69.99` (effective retail = £69.99)

| Quantity | Matching Tier | Calculation | Unit Price |
|----------|--------------|-------------|------------|
| 1 | None | No discount | £69.99 |
| 3 | Tier 1 (3-5, 5%) | £69.99 × (1 - 5/100) | £66.49 |
| 6 | Tier 2 (6-10, 10%) | £69.99 × (1 - 10/100) | £62.99 |
| 11 | Tier 3 (11-20, fixed £10) | £69.99 - £10.00 | £59.99 |
| 25 | None | No tier matches | £69.99 |

### Type Behavior (Retail Discount)

- **Fixed**: Unit price = effectiveRetailPrice - tier.value (subtraction)
- **Percentage**: Unit price = effectiveRetailPrice × (1 - value/100), rounded to 2dp (half-up)

---

## Coupon Interaction

| Scenario | Behavior |
|----------|----------|
| Normal/Guest + coupon applied | Retail discount tiers are SKIPPED; coupon discount applied to order |
| Normal/Guest + no coupon | Retail discount tiers applied per item |
| Normal/Guest + invalid/expired coupon | Coupon rejected, retail discount tiers still applied |
| Bulk buyer + coupon attempted | **403 error**: "Coupons are not available for bulk accounts" |
| Bulk buyer + no coupon | Bulk pricing tiers applied normally |

---

## Pricing Precedence

### Complete Decision Tree

```
Is user a bulk buyer?
├── YES (isBulkBuyer: true)
│   ├── Has bulkPricingTiers?
│   │   ├── YES → Find matching tier for quantity
│   │   │   ├── Tier found → Apply tier (pricingType: 'bulk_tier')
│   │   │   └── No match → Use effective retail price (pricingType: 'retail')
│   │   └── NO → Use effective retail price (pricingType: 'retail')
│   └── Coupon provided? → 403 ERROR (bulk buyers cannot use coupons)
│
└── NO (Normal or Guest user)
    ├── Coupon applied?
    │   ├── YES → Use effective retail price (pricingType: 'coupon_override')
    │   │         (coupon discount applied separately to order total)
    │   └── NO → Has retailDiscountTiers?
    │       ├── YES → Find matching tier for quantity
    │       │   ├── Tier found → Apply tier (pricingType: 'retail_discount')
    │       │   └── No match → Use effective retail price (pricingType: 'retail')
    │       └── NO → Use effective retail price (pricingType: 'retail')
```

### Pricing Type Values

| Value | Meaning |
|-------|---------|
| `bulk_tier` | Tiered bulk pricing applied |
| `retail_discount` | Retail discount tier applied |
| `coupon_override` | Coupon active, variant discounts skipped |
| `retail` | No discount applied, effective retail price used |

---

## API Reference

### Variant Response (includes pricing fields)

```json
{
  "_id": "6a04b0b699dc96fcdf42404c",
  "sku": "WIRELESS-A1B2C3D4",
  "price": 89.99,
  "discountedPrice": 69.99,
  "effectivePrice": 69.99,
  "bulkPricingTiers": [
    { "minQty": 10, "maxQty": 49, "type": "percentage", "value": 10 },
    { "minQty": 50, "maxQty": null, "type": "fixed", "value": 45.00 }
  ],
  "retailDiscountTiers": [
    { "minQty": 3, "maxQty": 5, "type": "percentage", "value": 5 },
    { "minQty": 6, "maxQty": 10, "type": "fixed", "value": 5.00 }
  ],
  "weight": 0.5,
  "freeDelivery": false,
  "inventory": 5000
}
```

### Checkout Response (order items include pricingType)

```json
{
  "items": [
    {
      "name": "Wireless Headphones",
      "price": 45.00,
      "quantity": 200,
      "isBulkPriceApplied": true,
      "pricingType": "bulk_tier",
      "variantSku": "WIRELESS-A1B2C3D4"
    }
  ]
}
```

### Checkout Preview (Dry-Run)

Call this to get a full pricing breakdown without creating an order. Useful for showing live totals in the cart/checkout UI.

**Endpoint:** `POST /api/v1/orders/checkout-preview`

**Auth user (pricing only, no delivery fee):**
```json
{ }
```

**Auth user (full breakdown with delivery):**
```json
{ "addressId": "saved-address-id" }
```

**Auth user (with coupon):**
```json
{ "addressId": "saved-address-id", "couponCode": "SAVE20" }
```

**Guest user:**
```json
{
  "city": "london",
  "items": [
    { "productId": "...", "variantId": "...", "quantity": 50 }
  ]
}
```

**Response (bulk buyer, qty 50, tier matched):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "product": { "_id": "...", "name": "Wireless Headphones" },
        "variant": { "_id": "...", "sku": "WH-BLACK", "attributes": [{"key":"Color","value":"Black"}] },
        "quantity": 50,
        "basePrice": 79.99,
        "unitPrice": 55.99,
        "pricingType": "bulk_tier",
        "tierApplied": { "type": "percentage", "value": 30 },
        "lineTotal": 2799.50,
        "savings": 1200.00
      }
    ],
    "subtotal": 2799.50,
    "discount": 0,
    "couponCode": null,
    "deliveryFee": 6.99,
    "deliveryWeight": 17.5,
    "taxRate": 20,
    "taxAmount": 559.90,
    "total": 3366.39,
    "currency": "GBP",
    "isBulkBuyer": true
  }
}
```

**Key behaviors:**
- Does NOT validate stock (works even if items are low stock)
- Does NOT create an order or PaymentIntent
- Does NOT decrement inventory or clear cart
- Bulk buyer + coupon → 403 error (same as checkout)
- Address/city optional — `deliveryFee` is null when omitted

---

## Frontend Implementation

### Price Display with Tiers

```jsx
function VariantPrice({ variant, quantity, isBulkBuyer, hasCoupon }) {
  const retailPrice = variant.discountedPrice ?? variant.price;

  // Determine which tiers to show
  const tiers = isBulkBuyer ? variant.bulkPricingTiers : variant.retailDiscountTiers;

  return (
    <div>
      {/* Base price */}
      {variant.discountedPrice && (
        <span className="line-through text-gray-400">£{variant.price}</span>
      )}
      <span className="text-lg font-bold">£{retailPrice}</span>

      {/* Tier breakdown */}
      {tiers && tiers.length > 0 && !hasCoupon && (
        <div className="mt-2 text-sm">
          <p className="font-medium text-gray-700">Quantity discounts:</p>
          {tiers.map((tier, i) => (
            <div key={i} className="flex justify-between text-gray-600">
              <span>
                {tier.minQty}–{tier.maxQty ?? '∞'} units
              </span>
              <span>
                {tier.type === 'percentage'
                  ? `${tier.value}% off`
                  : isBulkBuyer
                    ? `£${tier.value}/unit`
                    : `£${tier.value} off`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Live Price Calculator (Display Only)

```javascript
/**
 * Calculate display price for a variant. Backend recalculates at checkout.
 */

/**
 * Calculate display price for a variant. Backend recalculates at checkout.
 */
const calculateDisplayPrice = (variant, quantity, isBulkBuyer, hasCoupon) => {
  const retailPrice = variant.discountedPrice ?? variant.price;

  if (isBulkBuyer) {
    // Check tiered pricing
    if (variant.bulkPricingTiers?.length > 0) {
      const tier = variant.bulkPricingTiers.find(
        t => quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty)
      );
      if (tier) {
        const unitPrice = tier.type === 'fixed'
          ? tier.value
          : Math.round(retailPrice * (1 - tier.value / 100) * 100) / 100;
        return { unitPrice, pricingType: 'bulk_tier', savings: (retailPrice - unitPrice) * quantity };
      }
    }
    return { unitPrice: retailPrice, pricingType: 'retail', savings: 0 };
  }

  // Normal/Guest
  if (hasCoupon) {
    return { unitPrice: retailPrice, pricingType: 'coupon_override', savings: 0 };
  }

  if (variant.retailDiscountTiers?.length > 0) {
    const tier = variant.retailDiscountTiers.find(
      t => quantity >= t.minQty && quantity <= t.maxQty
    );
    if (tier) {
      const unitPrice = tier.type === 'fixed'
        ? Math.round((retailPrice - tier.value) * 100) / 100
        : Math.round(retailPrice * (1 - tier.value / 100) * 100) / 100;
      return { unitPrice, pricingType: 'retail_discount', savings: (retailPrice - unitPrice) * quantity };
    }
  }

  return { unitPrice: retailPrice, pricingType: 'retail', savings: 0 };
};
```

> **Recommended:** Instead of computing prices client-side, call `POST /orders/checkout-preview` for server-accurate pricing. Use the client-side calculator only for instant feedback before the API responds.

---

## Security

| Concern | Protection |
|---------|-----------|
| User claims to be bulk buyer | Backend checks `user.isBulkBuyer` from DB |
| Frontend sends fake price | Ignored — prices always computed server-side |
| Bulk buyer uses coupon | 403 error thrown before checkout proceeds |
| Normal user gets bulk tiers | Impossible — `isBulkBuyer` check gates tier selection |
| Quantity manipulation | Validated against `variant.inventory` |
| Client sends price/discount in body | Silently overwritten with server-computed values |

---

## File References

| File | Purpose |
|------|---------|
| `src/modules/orders/pricing.helpers.js` | Pure pricing functions (calculateEffectivePrice, findMatchingTier, applyTier, roundHalfUp) |
| `src/modules/orders/pricing.validation.helpers.js` | validateTierRanges (shared by Mongoose + Zod) |
| `src/modules/orders/orders.service.js` | Checkout flow with tiered pricing integration |
| `src/modules/variants/productVariant.model.js` | Schema: bulkPricingTiers, retailDiscountTiers |
| `src/modules/variants/variants.validation.js` | Zod schemas for tier validation |
| `src/modules/auth/auth.model.js` | `isBulkBuyer` field on User |
