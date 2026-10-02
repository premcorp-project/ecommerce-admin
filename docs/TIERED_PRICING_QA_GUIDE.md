# QA Guide: Tiered Pricing & Delivery System

Complete testing guide with all use cases, expected behaviors, and example payloads for the tiered pricing and weight-based delivery features.

---

## Table of Contents

- [Checkout Flow Overview](#checkout-flow-overview)
- [User Type Behavior Matrix](#user-type-behavior-matrix)
- [Test Environment Setup](#test-environment-setup)
- [Use Case 1: Tiered Bulk Pricing](#use-case-1-tiered-bulk-pricing)
- [Use Case 2: Retail Discount Tiers](#use-case-2-retail-discount-tiers)
- [Use Case 3: Coupon Interaction](#use-case-3-coupon-interaction)
- [Use Case 4: Weight-Based Delivery](#use-case-4-weight-based-delivery)
- [Use Case 5: Free Delivery Flag](#use-case-5-free-delivery-flag)
- [Use Case 6: Validation Errors](#use-case-6-validation-errors)
- [Use Case 7: Server-Side Enforcement](#use-case-7-server-side-enforcement)
- [Use Case 8: Edge Cases](#use-case-8-edge-cases)
- [Use Case 9: Mixed Cart Scenarios](#use-case-9-mixed-cart-scenarios)
- [Full Checkout Examples by User Type](#full-checkout-examples-by-user-type)
- [Regression Checklist](#regression-checklist)

---

## Checkout Flow Overview

### Pricing Stack (How Prices Layer)

The system applies prices in layers. Each layer builds on the previous:

```
Layer 1: Base Price (variant.price)              → always set, required
Layer 2: Sale Price (variant.discountedPrice)    → optional, must be < price
Layer 3: Tier Discount (applied ON TOP of sale price)
         - Bulk buyers: bulkPricingTiers
         - Normal/Guest: retailDiscountTiers
Layer 4: Coupon (applied to order total, replaces Layer 3 for normal/guest)
```

**The "effective retail price" is the starting point for ALL tier calculations:**

```javascript
effectiveRetailPrice = variant.discountedPrice ?? variant.price
```

| Variant Config | Effective Retail Price | Tiers Discount From |
|---|---|---|
| price: £100, discountedPrice: null | £100 | £100 |
| price: £100, discountedPrice: £80 | £80 | £80 |
| price: £100, discountedPrice: £60 | £60 | £60 |

**Sale price stacks with tiers — example:**

```
Variant: price £100, discountedPrice £80 (20% sale already applied)
bulkPricingTiers: [{minQty:10, maxQty:null, type:"percentage", value:15}]
retailDiscountTiers: [{minQty:5, maxQty:10, type:"percentage", value:10}]

Bulk buyer, qty 10:
  effectiveRetailPrice = £80 (sale price is the base)
  Tier: 15% off £80 = £80 × 0.85 = £68/unit
  Total discount from original: £100 → £68 (32% off)

Normal user, qty 5 (no coupon):
  effectiveRetailPrice = £80
  Tier: 10% off £80 = £80 × 0.90 = £72/unit
  Total discount from original: £100 → £72 (28% off)

Normal user, qty 1 (no tier match):
  Unit price = £80 (just the sale price, no tier)

Normal user, qty 5 (with coupon):
  Unit price = £80 (sale price, tier SKIPPED, coupon on total)
```

### Checkout Steps (All Users)

Every checkout follows these steps (server-side):

```
1. Resolve items (cart for auth users, request body for guest)
2. Validate stock for all items
3. Check user type (isBulkBuyer?)
4. If bulk buyer + coupon → 403 reject
5. Check COD eligibility (if paymentMethod = cod)
6. Get platform config (taxRate, currency)
7. Calculate delivery fee (weight-based from weightRanges)
8. Calculate unit prices per item (tiered pricing engine)
9. Apply coupon if provided (normal/guest only)
10. Calculate tax on (subtotal - discount)
11. Compute total = subtotal - discount + tax + deliveryFee
12. Create order (Stripe PaymentIntent or COD confirm)
```

---

## User Type Behavior Matrix

### Pricing by User Type

| | Bulk Buyer | Normal User | Guest |
|---|---|---|---|
| `bulkPricingTiers` | ✅ Applied | ❌ Ignored | ❌ Ignored |
| `retailDiscountTiers` | ❌ Never | ✅ Applied (no coupon) | ✅ Applied (no coupon) |
| Coupon | ❌ 403 error | ✅ Overrides retail tiers | ✅ Overrides retail tiers |
| Base price | discountedPrice ?? price | discountedPrice ?? price | discountedPrice ?? price |

### Delivery by User Type

| | Bulk Buyer | Normal User | Guest |
|---|---|---|---|
| `freeDelivery` flag | ❌ Ignored | ✅ Excludes weight | ✅ Excludes weight |
| Weight calculation | All items always | Non-free items only | Non-free items only |
| All-free cart | Still pays delivery (full weight) | Fee = lowest range price | Fee = lowest range price |

### Coupon by User Type

| | Bulk Buyer | Normal User | Guest |
|---|---|---|---|
| Can apply coupon | ❌ 403 | ✅ | ✅ |
| Effect on pricing | N/A | Retail tiers skipped | Retail tiers skipped |
| Per-user limit | N/A | Enforced | Blocked (requires auth) |
| Invalid coupon | 403 (before validation) | 400 error | 400 error |

### Payment Methods by User Type

| | Bulk Buyer | Normal User | Guest |
|---|---|---|---|
| Stripe | ✅ | ✅ | ✅ |
| COD | ✅ (if isCodEnabled) | ✅ (if isCodEnabled) | ❌ |

### Cart & Address by User Type

| | Bulk Buyer | Normal User | Guest |
|---|---|---|---|
| Cart source | Server-side cart | Server-side cart | Items in request body |
| Address | `addressId` or inline | `addressId` or inline | Must provide full address |
| Order history | Yes | Yes | No |

### pricingType Values

| Value | When | User Types |
|-------|------|-----------|
| `bulk_tier` | Bulk tier matched | Bulk only |
| `retail_discount` | Retail tier matched, no coupon | Normal, Guest |
| `coupon_override` | Coupon applied | Normal, Guest |
| `retail` | No tier matched / no tiers configured | Any |

---

## Test Environment Setup

### Test Users (from seed data)

| User | Email | Password | Type |
|------|-------|----------|------|
| Admin | `admin@ecommerce.co.uk` | `Admin123@` | Admin |
| Bulk Buyer | `bulk@wholesale.co.uk` | `Bulk123@` | Customer (isBulkBuyer: true) |
| Normal Customer | `customer@example.com` | `Customer123@` | Customer |
| Guest | — | — | No auth |

### Create Test Variant with All Pricing Fields

```bash
POST /api/v1/variants/products/:productId
Authorization: Bearer <admin-token>

{
  "attributes": [{ "key": "Size", "value": "Large" }],
  "price": 100.00,
  "discountedPrice": 80.00,
  "inventory": 10000,
  "weight": 2.5,
  "freeDelivery": false,
  "bulkPricingTiers": [
    { "minQty": 10, "maxQty": 49, "type": "percentage", "value": 10 },
    { "minQty": 50, "maxQty": 199, "type": "percentage", "value": 25 },
    { "minQty": 200, "maxQty": null, "type": "fixed", "value": 40.00 }
  ],
  "retailDiscountTiers": [
    { "minQty": 3, "maxQty": 5, "type": "percentage", "value": 5 },
    { "minQty": 6, "maxQty": 10, "type": "percentage", "value": 10 },
    { "minQty": 11, "maxQty": 20, "type": "fixed", "value": 72.00 }
  ]
}
```

### Create Test Delivery Rate with Weight Ranges

```bash
POST /api/v1/config/delivery-rates
Authorization: Bearer <admin-token>

{
  "city": "london",
  "estimatedDays": 3,
  "weightRanges": [
    { "minWeight": 0, "maxWeight": 5, "price": 4.99 },
    { "minWeight": 5, "maxWeight": 15, "price": 7.99 },
    { "minWeight": 15, "maxWeight": 30, "price": 12.99 },
    { "minWeight": 30, "maxWeight": 50, "price": 19.99 }
  ]
}
```

---

## Use Case 1: Tiered Bulk Pricing

### 1.1 Bulk Buyer — Percentage Tier Matches

**Setup:** Bulk buyer, variant with `bulkPricingTiers`, effective retail = £80.00

| Test | Quantity | Expected Unit Price | Expected pricingType |
|------|----------|--------------------|--------------------|
| Below all tiers | 5 | £80.00 | `retail` |
| First tier (10%) | 10 | £72.00 | `bulk_tier` |
| First tier boundary | 49 | £72.00 | `bulk_tier` |
| Second tier (25%) | 50 | £60.00 | `bulk_tier` |
| Second tier mid | 100 | £60.00 | `bulk_tier` |

**Checkout request:**
```bash
POST /api/v1/orders/checkout
Authorization: Bearer <bulk-buyer-token>

{ "paymentMethod": "cod", "addressId": "<address-id>" }
```

**Expected response (qty 50):**
```json
{
  "items": [{
    "price": 60.00,
    "quantity": 50,
    "isBulkPriceApplied": true,
    "pricingType": "bulk_tier"
  }],
  "subtotal": 3000.00
}
```

### 1.2 Bulk Buyer — Fixed Tier Matches

| Test | Quantity | Expected Unit Price | pricingType |
|------|----------|--------------------|--------------------|
| Fixed tier (£40) | 200 | £40.00 | `bulk_tier` |
| Unbounded tier (null maxQty) | 5000 | £40.00 | `bulk_tier` |

### 1.3 Bulk Buyer — No Tier Matches

| Test | Quantity | Expected Unit Price | pricingType |
|------|----------|--------------------|--------------------|
| Below all tiers | 1 | £80.00 | `retail` |
| Between tiers (gap) | 8 | £80.00 | `retail` |

### 1.4 Rounding Verification

**Setup:** Variant with price £99.99, discountedPrice null, tier: 15% off

```
Expected: £99.99 × (1 - 15/100) = £99.99 × 0.85 = £84.9915 → rounded to £84.99
```

Verify half-up rounding: price £10.05, tier 50% → £10.05 × 0.5 = £5.025 → £5.03 (half-up)

---

## Use Case 2: Retail Discount Tiers

### 2.1 Normal User — Percentage Tier

**Setup:** Normal user, no coupon, variant with `retailDiscountTiers`, effective retail = £80.00

| Test | Quantity | Expected Unit Price | pricingType |
|------|----------|--------------------|--------------------|
| Below all tiers | 1 | £80.00 | `retail` |
| First tier (5%) | 3 | £76.00 | `retail_discount` |
| First tier boundary | 5 | £76.00 | `retail_discount` |
| Second tier (10%) | 6 | £72.00 | `retail_discount` |
| Third tier (fixed £72) | 11 | £72.00 | `retail_discount` |
| Above all tiers | 25 | £80.00 | `retail` |

### 2.2 Guest User — Same Behavior

Guest users receive the same retail discount tiers as normal users.

**Checkout request (guest):**
```bash
POST /api/v1/orders/checkout

{
  "paymentMethod": "stripe",
  "guestEmail": "test@example.com",
  "deliveryAddress": {
    "fullName": "Test User",
    "phone": "+447700900000",
    "line1": "123 Test St",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "GB"
  },
  "items": [
    { "productId": "<id>", "variantId": "<id>", "quantity": 6 }
  ]
}
```

**Expected:** Unit price £72.00, pricingType `retail_discount`

### 2.3 Fixed Type — Consistent Behavior (Both Bulk and Retail)

**"Fixed" means the same thing for BOTH tier types: the value IS the final unit price.**

| Tier Type | `type: "fixed"` Meaning | Calculation | Admin UI Label |
|---|---|---|---|
| **Bulk Pricing Tiers** | Value IS the final unit price | `unitPrice = tier.value` | "Fixed Price" |
| **Retail Discount Tiers** | Value IS the final unit price | `unitPrice = tier.value` | "Fixed Price" |

**Example — Retail Discount (fixed):**
```
Effective retail price: £13.16
Tier: { type: "fixed", value: 10.66 }
Calculation: unitPrice = £10.66
Savings per unit: £13.16 - £10.66 = £2.50
```
Admin enters the TARGET PRICE the customer should pay, not the discount amount.

**Example — Bulk Pricing (fixed):**
```
Effective retail price: £80.00
Tier: { type: "fixed", value: 45.00 }
Calculation: unitPrice = £45.00
Savings per unit: £80.00 - £45.00 = £35.00
```

**Admin UI Dropdown Labels (same for both tier types):**
- `percentage` → "Percentage Discount" (e.g., value 10 = 10% off effective price)
- `fixed` → "Fixed Price" (e.g., value 10.66 = customer pays £10.66 per unit)

**Validation:**
- Fixed value must be LESS than effective price (the target price must be a discount)

### 2.4 Bulk Buyer Never Gets Retail Discounts

**Test:** Bulk buyer checks out with quantity matching a retail discount tier.

**Expected:** Bulk pricing logic runs (not retail discount). If no bulk tier matches, price is effective retail. `pricingType` is never `retail_discount` for bulk buyers.

---

## Use Case 3: Coupon Interaction

### 3.1 Normal User + Coupon → Retail Discounts Skipped

**Setup:** Normal user, valid coupon, variant with retailDiscountTiers

**Checkout request:**
```bash
POST /api/v1/orders/checkout
Authorization: Bearer <customer-token>

{
  "paymentMethod": "stripe",
  "addressId": "<address-id>",
  "couponCode": "SAVE20"
}
```

**Expected:**
- Each item: `pricingType: "coupon_override"`, unit price = effective retail price
- Coupon discount applied to order total separately
- Retail discount tiers NOT applied

### 3.2 Normal User + No Coupon → Retail Discounts Applied

**Expected:** Items get `pricingType: "retail_discount"` when tier matches

### 3.3 Normal User + Invalid Coupon → Retail Discounts Still Applied

**Setup:** Provide an expired or invalid coupon code

**Expected:**
- 400 error for invalid coupon
- If checkout proceeds without coupon, retail discount tiers apply normally

### 3.4 Bulk Buyer + Coupon → 403 Error

**Checkout request:**
```bash
POST /api/v1/orders/checkout
Authorization: Bearer <bulk-buyer-token>

{
  "paymentMethod": "cod",
  "addressId": "<address-id>",
  "couponCode": "SAVE20"
}
```

**Expected response:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Coupons are not available for bulk accounts"
}
```

### 3.5 Bulk Buyer + No Coupon → Normal Bulk Pricing

**Expected:** Bulk pricing tiers applied normally, no error

---

## Use Case 4: Weight-Based Delivery

### 4.1 Basic Weight Calculation

**Setup:** Delivery rate with weightRanges configured for London

| Cart Contents | Total Weight | Expected Fee |
|--------------|-------------|--------------|
| 1 item × 2.5kg × qty 1 | 2.5 kg | £4.99 |
| 1 item × 2.5kg × qty 3 | 7.5 kg | £7.99 |
| 1 item × 2.5kg × qty 8 | 20 kg | £12.99 |
| 1 item × 2.5kg × qty 15 | 37.5 kg | £19.99 |

### 4.2 Multiple Items — Weight Summed

**Cart:**
```
Item A: weight 2.5kg, qty 4 → 10 kg
Item B: weight 1.0kg, qty 3 → 3 kg
Total: 13 kg → [5, 15) range → £7.99
```

### 4.3 Overflow — Weight Exceeds All Ranges

**Cart:** Total weight = 75 kg (exceeds max range of 50 kg)

**Expected:** Uses highest range price → £19.99

### 4.4 Zero Weight — All Variants Have No Weight

**Cart:** All items have `weight: null` or `weight: 0`

**Expected:** Total weight = 0 → Uses lowest range price → £4.99

### 4.5 Boundary Values

| Total Weight | Expected Range | Fee |
|-------------|---------------|-----|
| 0 kg | Lowest range | £4.99 |
| 4.99 kg | [0, 5) | £4.99 |
| 5.0 kg | [5, 15) | £7.99 |
| 14.99 kg | [5, 15) | £7.99 |
| 15.0 kg | [15, 30) | £12.99 |
| 50.0 kg | [30, 50] (highest, inclusive) | £19.99 |
| 50.01 kg | Overflow → highest | £19.99 |

### 4.6 City-Specific vs Default Rate

**Test:** Checkout with city "Manchester" (no specific rate configured)

**Expected:** Falls back to default rate (city: null) and uses its weightRanges

### 4.7 No Delivery Rate Found

**Test:** Checkout with a city that has no rate and no default rate exists

**Expected:** 400 error: "No delivery rate configured for the destination."

---

## Use Case 5: Free Delivery Flag

### 5.1 All Items Free Delivery (Normal User)

**Cart:**
```
Item A: weight 5kg, qty 2, freeDelivery: true
Item B: weight 3kg, qty 1, freeDelivery: true
```

**Expected:** Total weight = 0 → Delivery fee = £0

### 5.2 Mixed Cart (Normal User)

**Cart:**
```
Item A: weight 5kg, qty 2, freeDelivery: true  → excluded (0 kg)
Item B: weight 3kg, qty 3, freeDelivery: false → included (9 kg)
```

**Expected:** Total weight = 9 kg → [5, 15) range → £7.99

### 5.3 Bulk Buyer Ignores Free Delivery Flag

**Cart (same items, bulk buyer):**
```
Item A: weight 5kg, qty 2, freeDelivery: true  → included (10 kg)
Item B: weight 3kg, qty 3, freeDelivery: false → included (9 kg)
```

**Expected:** Total weight = 19 kg → [15, 30) range → £12.99

### 5.4 Variant Without freeDelivery Field

**Expected:** Treated as `freeDelivery: false` — weight always counted

### 5.5 Variant Without Weight Field

**Expected:** Treated as `weight: 0` — contributes 0 to total weight

---

## Use Case 6: Validation Errors

### 6.1 Overlapping Bulk Pricing Tiers

```bash
POST /api/v1/variants/products/:productId

{
  "bulkPricingTiers": [
    { "minQty": 10, "maxQty": 50, "type": "percentage", "value": 10 },
    { "minQty": 40, "maxQty": 100, "type": "percentage", "value": 20 }
  ]
}
```

**Expected:** 400 — "Tier ranges must be non-overlapping..."

### 6.2 Null maxQty Not on Last Tier

```bash
{
  "bulkPricingTiers": [
    { "minQty": 10, "maxQty": null, "type": "percentage", "value": 10 },
    { "minQty": 50, "maxQty": 100, "type": "percentage", "value": 20 }
  ]
}
```

**Expected:** 400 — "only the last tier may have a null maxQty"

### 6.3 Percentage Value Out of Range

```bash
{
  "bulkPricingTiers": [
    { "minQty": 10, "maxQty": 50, "type": "percentage", "value": 0 }
  ]
}
```

**Expected:** 400 — "value must be greater than 0"

```bash
{
  "bulkPricingTiers": [
    { "minQty": 10, "maxQty": 50, "type": "percentage", "value": 100 }
  ]
}
```

**Expected:** 400 — "Percentage tier value must be between 1 and 99"

### 6.4 Fixed Value >= Effective Price

**Setup:** Variant with price £100, discountedPrice £80

```bash
{
  "bulkPricingTiers": [
    { "minQty": 10, "maxQty": 50, "type": "fixed", "value": 80.00 }
  ]
}
```

**Expected:** 400 — "Fixed tier value must be less than effective retail price"

### 6.5 More Than 10 Tiers

**Expected:** 400 — "Maximum 10 bulk pricing tiers allowed"

### 6.6 Overlapping Weight Ranges

```bash
{
  "weightRanges": [
    { "minWeight": 0, "maxWeight": 10, "price": 5.99 },
    { "minWeight": 8, "maxWeight": 20, "price": 9.99 }
  ]
}
```

**Expected:** 400 — "weightRanges must have non-overlapping brackets..."

### 6.7 Weight Range minWeight >= maxWeight

```bash
{
  "weightRanges": [
    { "minWeight": 10, "maxWeight": 5, "price": 5.99 }
  ]
}
```

**Expected:** 400 — validation error

### 6.8 More Than 20 Weight Ranges

**Expected:** 400 — "weightRanges must have at most 20 entries"

### 6.9 Variant Weight Out of Range

```bash
{ "weight": -1 }     → 400: "Weight must be >= 0"
{ "weight": 10000 }  → 400: "Weight must be <= 9999"
```

---

## Use Case 7: Server-Side Enforcement

### 7.1 Client Sends Price in Request Body

**Checkout request (guest with fake prices):**
```bash
POST /api/v1/orders/checkout

{
  "items": [
    { "productId": "<id>", "variantId": "<id>", "quantity": 10, "price": 1.00 }
  ],
  "deliveryAddress": { ... },
  "guestEmail": "test@example.com",
  "paymentMethod": "stripe"
}
```

**Expected:** The `price: 1.00` in the request is silently ignored. Server computes the real price from the database.

### 7.2 Client Sends Delivery Fee

Any `deliveryFee` field in the request body is ignored. Server computes it from weight and delivery rate configuration.

### 7.3 Client Sends Discount Amount

Any `discount` field in the request body is ignored. Server computes it from coupon validation.

---

## Use Case 8: Edge Cases

### 8.1 Quantity = 1 (No Tier Matches)

Most tiers start at minQty > 1. Quantity 1 should always fall through to effective retail price.

### 8.2 Single-Quantity Tier (minQty = maxQty)

```bash
{
  "retailDiscountTiers": [
    { "minQty": 5, "maxQty": 5, "type": "percentage", "value": 10 }
  ]
}
```

**Expected:** Only quantity exactly 5 gets the discount. Quantity 4 or 6 does not.

### 8.3 Variant with discountedPrice = null

**Expected:** Effective retail price = `variant.price` (base price used for all calculations)

### 8.4 Variant with weight = null

**Expected:** Treated as 0 kg in delivery calculation

### 8.5 Empty Cart Checkout

**Expected:** 400 — "Your cart is empty" (auth user) or "Items are required" (guest)

### 8.6 Very Large Quantities

**Test:** Bulk buyer, quantity 999999, tier with null maxQty

**Expected:** Matches the unbounded last tier. No overflow or calculation errors.

### 8.7 Decimal Precision

**Test:** Percentage tier that produces repeating decimals

Example: price £33.33, tier 33% → £33.33 × 0.67 = £22.3311 → rounded to £22.33

---

## Use Case 9: Mixed Cart Scenarios

### 9.1 Bulk Buyer — Mixed Tier Matches

**Cart:**
```
Item A: qty 100, matches tier 2 (25% off £80) → £60.00/unit
Item B: qty 5, no tier matches → £80.00/unit
Item C: qty 200, matches tier 3 (fixed £40) → £40.00/unit
```

**Expected:**
```json
{
  "items": [
    { "price": 60.00, "quantity": 100, "pricingType": "bulk_tier" },
    { "price": 80.00, "quantity": 5, "pricingType": "retail" },
    { "price": 40.00, "quantity": 200, "pricingType": "bulk_tier" }
  ],
  "subtotal": 14400.00
}
```

### 9.2 Normal User — Mixed Discount + No Discount

**Cart (no coupon):**
```
Item A: qty 6, matches retail tier 2 (10% off £80) → £72.00/unit
Item B: qty 1, no tier matches → £80.00/unit
```

**Expected:**
```json
{
  "items": [
    { "price": 72.00, "quantity": 6, "pricingType": "retail_discount" },
    { "price": 80.00, "quantity": 1, "pricingType": "retail" }
  ]
}
```

### 9.3 Normal User — Coupon Overrides All Retail Discounts

**Cart (with coupon):**
```
Item A: qty 6, would match retail tier → but coupon active
Item B: qty 1, no tier anyway
```

**Expected:**
```json
{
  "items": [
    { "price": 80.00, "quantity": 6, "pricingType": "coupon_override" },
    { "price": 80.00, "quantity": 1, "pricingType": "coupon_override" }
  ]
}
```

Coupon discount applied to order total separately.

### 9.4 Mixed Free/Non-Free Delivery Items

**Cart (normal user):**
```
Item A: weight 5kg, qty 2, freeDelivery: true  → 0 kg (excluded)
Item B: weight 2kg, qty 4, freeDelivery: false → 8 kg
Item C: weight 1kg, qty 3, freeDelivery: true  → 0 kg (excluded)
```

**Expected:** Total weight = 8 kg → [5, 15) → £7.99

---

## Full Checkout Examples by User Type

> **Tip:** All these calculations can be verified by calling `POST /api/v1/orders/checkout-preview` with the same parameters. The preview returns the exact same pricing without creating an order.

### Guest User — No Coupon, Retail Tiers Apply

**Setup:**
- Guest user (no auth)
- Variant A: price £100, discountedPrice £80, weight 2kg, freeDelivery false
  - retailDiscountTiers: [{minQty:3, maxQty:10, type:"percentage", value:10}]
- Variant B: price £50, no tiers, weight 1kg, freeDelivery true
- Delivery rate (London): [{0-5: £4.99}, {5-15: £7.99}, {15-30: £12.99}]

**Request:**
```json
POST /api/v1/orders/checkout
{
  "paymentMethod": "stripe",
  "guestEmail": "guest@test.com",
  "deliveryAddress": { "fullName": "Jane", "phone": "+44770090", "line1": "123 St", "city": "London", "postcode": "SW1A 1AA", "country": "GB" },
  "items": [
    { "productId": "...", "variantId": "A", "quantity": 6 },
    { "productId": "...", "variantId": "B", "quantity": 2 }
  ]
}
```

**Calculation:**
```
Pricing:
  Variant A: qty 6 matches tier (3-10, 10% off £80) → £72/unit × 6 = £432 (retail_discount)
  Variant B: qty 2, no tier → £50/unit × 2 = £100 (retail)
  Subtotal: £532

Delivery:
  Variant A: weight 2kg × 6 = 12kg (freeDelivery: false → counted)
  Variant B: weight 1kg × 2 = 0kg (freeDelivery: true → excluded for guest)
  Total weight: 12kg → [5-15) range → £7.99

Tax: £532 × 20% = £106.40
Total: £532 + £106.40 + £7.99 = £646.39
```

**Response:**
```json
{
  "items": [
    { "price": 72.00, "quantity": 6, "pricingType": "retail_discount", "isBulkPriceApplied": false },
    { "price": 50.00, "quantity": 2, "pricingType": "retail", "isBulkPriceApplied": false }
  ],
  "subtotal": 532.00,
  "discount": 0,
  "deliveryFee": 7.99,
  "taxAmount": 106.40,
  "total": 646.39
}
```

---

### Guest User — With Coupon (Retail Tiers Skipped)

**Same setup, but with coupon "SAVE15" (15% off, min order £100):**

**Calculation:**
```
Pricing (coupon active → retail tiers SKIPPED):
  Variant A: £80/unit × 6 = £480 (coupon_override)
  Variant B: £50/unit × 2 = £100 (coupon_override)
  Subtotal: £580

Coupon: 15% of £580 = £87
Delivery: same as above → £7.99
Tax: (£580 - £87) × 20% = £98.60
Total: £580 - £87 + £98.60 + £7.99 = £599.59
```

**Response:**
```json
{
  "items": [
    { "price": 80.00, "quantity": 6, "pricingType": "coupon_override" },
    { "price": 50.00, "quantity": 2, "pricingType": "coupon_override" }
  ],
  "subtotal": 580.00,
  "discount": 87.00,
  "couponCode": "SAVE15",
  "deliveryFee": 7.99,
  "taxAmount": 98.60,
  "total": 599.59
}
```

---

### Normal Auth User — No Coupon, COD Payment

**Setup:**
- Authenticated normal user (isBulkBuyer: false, isCodEnabled: true)
- Cart has: Variant A × 4 (price £80, retailDiscountTiers: [{minQty:3, maxQty:10, type:"fixed", value:75}], weight 3kg)
- Delivery rate (Manchester): [{0-10: £5.99}, {10-25: £9.99}]

**Request:**
```json
POST /api/v1/orders/checkout
Authorization: Bearer <token>
{
  "paymentMethod": "cod",
  "addressId": "saved-address-id"
}
```

**Calculation:**
```
Pricing:
  Variant A: qty 4 matches tier (3-10, fixed £75) → £75/unit × 4 = £300 (retail_discount)
  Subtotal: £300

Delivery:
  Weight: 3kg × 4 = 12kg → [10-25) range → £9.99

Tax: £300 × 20% = £60
Total: £300 + £60 + £9.99 = £369.99
```

**Response:**
```json
{
  "order": {
    "status": "confirmed",
    "paymentStatus": "cod_pending",
    "items": [{ "price": 75.00, "quantity": 4, "pricingType": "retail_discount" }],
    "subtotal": 300.00,
    "deliveryFee": 9.99,
    "taxAmount": 60.00,
    "total": 369.99
  }
}
```

---

### Bulk Buyer — Tier Matches, No Coupon

**Setup:**
- Bulk buyer (isBulkBuyer: true)
- Cart has: Variant A × 100 (price £80, discountedPrice £70,
  bulkPricingTiers: [{minQty:10, maxQty:99, type:"percentage", value:15}, {minQty:100, maxQty:null, type:"fixed", value:45}],
  weight 0.5kg, freeDelivery: true)
- Delivery rate: [{0-20: £5.99}, {20-50: £9.99}, {50-100: £14.99}]

**Request:**
```json
POST /api/v1/orders/checkout
Authorization: Bearer <bulk-token>
{
  "paymentMethod": "cod",
  "addressId": "saved-address-id"
}
```

**Calculation:**
```
Pricing:
  Effective retail: £70 (discountedPrice)
  qty 100 matches tier 2 (100+, fixed £45) → £45/unit × 100 = £4,500 (bulk_tier)
  Subtotal: £4,500

Delivery:
  freeDelivery flag IGNORED for bulk buyer
  Weight: 0.5kg × 100 = 50kg → [50-100] range (highest, inclusive) → £14.99

Tax: £4,500 × 20% = £900
Total: £4,500 + £900 + £14.99 = £5,414.99
```

**Response:**
```json
{
  "order": {
    "items": [{ "price": 45.00, "quantity": 100, "pricingType": "bulk_tier", "isBulkPriceApplied": true }],
    "subtotal": 4500.00,
    "deliveryFee": 14.99,
    "taxAmount": 900.00,
    "total": 5414.99
  }
}
```

---

### Bulk Buyer — Attempts Coupon (403 Error)

**Request:**
```json
POST /api/v1/orders/checkout
Authorization: Bearer <bulk-token>
{
  "paymentMethod": "cod",
  "addressId": "saved-address-id",
  "couponCode": "SAVE20"
}
```

**Response (403):**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Coupons are not available for bulk accounts"
}
```

Checkout does NOT proceed. No order created.

---

### Bulk Buyer — No Tier Matches (Falls to Retail Price)

**Setup:** Bulk buyer, qty 3, bulkPricingTiers start at minQty 10

**Calculation:**
```
qty 3 < minQty 10 → no tier matches
Unit price: effective retail (£70)
pricingType: "retail"
isBulkPriceApplied: false
```

---

### Normal User — All Free Delivery Items

**Setup:**
- Normal user, 3 items all with freeDelivery: true
- Weights: 5kg, 3kg, 2kg

**Calculation:**
```
Delivery:
  All items excluded (freeDelivery: true for normal user)
  Total weight: 0kg → lowest range price (e.g., £4.99)
```

Note: Weight 0 maps to the lowest weight range, not £0. The fee is the lowest configured price.

---

### Bulk Buyer — Same Items, Free Delivery Ignored

**Same items as above but bulk buyer:**

**Calculation:**
```
Delivery:
  freeDelivery IGNORED for bulk
  Total weight: 5kg + 3kg + 2kg = 10kg (assuming qty 1 each)
  Maps to appropriate weight range
```

---

## Regression Checklist

Run these tests after any change to pricing or delivery logic:

### Pricing Regression

- [ ] Normal user checkout without tiers → effective retail price
- [ ] Normal user checkout with matching retail tier → discounted price
- [ ] Bulk buyer checkout without tiers → effective retail price
- [ ] Bulk buyer checkout with matching bulk tier → tier price
- [ ] Coupon + normal user → retail tiers skipped
- [ ] Coupon + bulk buyer → 403 error
- [ ] Guest checkout with retail tiers → discounted price
- [ ] `isBulkPriceApplied` field correct on order items
- [ ] `pricingType` field correct on order items
- [ ] Rounding: half-up to 2 decimal places

### Delivery Regression

- [ ] Weight-based delivery with matching range → correct fee
- [ ] Weight overflow → highest range price
- [ ] Zero weight → lowest range price
- [ ] Free delivery items excluded for normal users
- [ ] Free delivery items included for bulk buyers
- [ ] Mixed free/non-free cart → only non-free weights counted
- [ ] No delivery rate found → 400 error
- [ ] City-specific rate found → used over default
- [ ] City not found → falls back to default rate

### Validation Regression

- [ ] Overlapping tiers rejected
- [ ] Null maxQty on non-last tier rejected
- [ ] Percentage value 0 or 100 rejected
- [ ] Fixed value >= effective price rejected
- [ ] More than 10 tiers rejected
- [ ] Overlapping weight ranges rejected
- [ ] minWeight >= maxWeight rejected
- [ ] More than 20 weight ranges rejected
- [ ] Weight < 0 or > 9999 rejected

---

## Running Automated Tests

```bash
# Run all tests
npm test

# Run specific test files
npx vitest run src/modules/orders/pricing.validation.helpers.test.js
npx vitest run src/modules/config/__tests__/delivery.helpers.test.js

# Run with verbose output
npx vitest run --reporter=verbose
```

Current test coverage:
- `pricing.validation.helpers.test.js` — 12 tests (tier validation)
- `delivery.helpers.test.js` — 17 tests (delivery calculation)
- `auth.tokens.test.js` — 7 tests (existing)

---

## API Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/variants/products/:productId` | POST | Create variant with tiers |
| `/variants/:variantId` | PUT | Update variant tiers/weight |
| `/config/delivery-rates` | POST | Create delivery rate with weight ranges |
| `/config/delivery-rates/:id` | PUT | Update delivery rate weight ranges |
| `/orders/checkout` | POST | Checkout (pricing + delivery calculated) |
| `/orders/checkout-preview` | POST | Dry-run pricing breakdown (no order created) |
| `/orders/delivery-fee` | POST | Delivery fee estimate |
| `/users/:userId/bulk-buyer` | PUT | Toggle bulk buyer status |
