# Delivery System Guide

Complete guide for the weight-based delivery fee system, free delivery flag, and delivery rate configuration.

---

## Table of Contents

- [Overview](#overview)
- [Admin Configuration](#admin-configuration)
- [Weight-Based Delivery Calculation](#weight-based-delivery-calculation)
- [Free Delivery Flag](#free-delivery-flag)
- [API Reference](#api-reference)
- [Frontend Integration](#frontend-integration)
- [File References](#file-references)

---

## Overview

The delivery system uses weight-based pricing:

| Mode | Configuration | Requirement |
|------|--------------|-------------|
| **Weight-based** | `weightRanges` on delivery rate | **Required** on every delivery rate |

Every delivery rate must have `weightRanges` configured. The system calculates delivery fees by summing the cart weight and matching it against the configured weight ranges.

Additionally, variants can be flagged as `freeDelivery: true` to exclude their weight from the delivery calculation for normal/guest users.

---

## Admin Configuration

### Create a Delivery Rate

```
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

### Update Existing Rate

```
PUT /api/v1/config/delivery-rates/:id
Authorization: Bearer <admin-token>

{
  "weightRanges": [
    { "minWeight": 0, "maxWeight": 10, "price": 5.99 },
    { "minWeight": 10, "maxWeight": 25, "price": 9.99 },
    { "minWeight": 25, "maxWeight": 50, "price": 14.99 }
  ]
}
```

### Set Variant Weight and Free Delivery

```
PUT /api/v1/variants/:variantId
Authorization: Bearer <admin-token>

{
  "weight": 2.5,
  "freeDelivery": false
}
```

```
PUT /api/v1/variants/:variantId
Authorization: Bearer <admin-token>

{
  "weight": 0.1,
  "freeDelivery": true
}
```

### Validation Rules

#### Weight Ranges

| Rule | Constraint |
|------|-----------|
| Required | Every delivery rate must have `weightRanges` |
| Max entries | 20 per delivery rate |
| `minWeight` | Number ≥ 0 (kg) |
| `maxWeight` | Number > minWeight |
| `price` | Number ≥ 0 |
| Overlap | No two ranges may overlap |

#### Variant Weight

| Rule | Constraint |
|------|-----------|
| `weight` | Number, 0 to 9999 kg, nullable |
| `freeDelivery` | Boolean, default false |

---

## Weight-Based Delivery Calculation

### How City + Weight Works Together

The delivery fee is determined by **two factors**: the destination city and the total cart weight.

**Rate Lookup (by city):**
```
1. Extract city from user's delivery address
2. Find active DeliveryRate where city matches (case-insensitive)
3. If no city-specific rate found → fall back to default rate (city: null)
4. If no default rate exists → 400 error: "No delivery rate configured"
```

**Each city has its own weight ranges** — different cities can have completely different pricing:

```
London rate:
  weightRanges: [{ 0-5: £4.99 }, { 5-15: £7.99 }, { 15-30: £12.99 }]

Birmingham rate:
  weightRanges: [{ 0-5: £3.99 }, { 5-15: £6.99 }, { 15-30: £11.99 }]

Default rate (all other cities):
  weightRanges: [{ 0-10: £5.99 }, { 10-25: £9.99 }, { 25-50: £14.99 }]
```

**Full flow example:**
```
User's delivery address: city = "Birmingham"
Cart:
  Item A: weight 2kg × qty 3 = 6kg
  Item B: weight 1kg × qty 4 = 4kg
  Total weight: 10kg

→ Finds Birmingham rate (city match)
→ 10kg falls in [5, 15) range
→ Delivery fee: £6.99
```

**Fallback example:**
```
User's delivery address: city = "Bristol" (no specific rate configured)

→ No city-specific rate found
→ Falls back to default rate (city: null)
→ Uses default's weightRanges against total cart weight
```

### Step-by-Step Flow

1. **Look up delivery rate** by destination city (from user's address)
2. **Calculate total cart weight**: Sum `variant.weight × item.quantity` for applicable items
3. **Find matching weight range** in that city's rate: Locate the range where `minWeight ≤ totalWeight < maxWeight`
4. **Return the range's price** as the delivery fee

### Range Matching Rules

| Scenario | Behavior |
|----------|----------|
| Weight falls within a range | Use that range's price |
| Weight equals a range boundary | Lower bound inclusive, upper bound exclusive (except highest range) |
| Highest range | Both bounds inclusive (`minWeight ≤ weight ≤ maxWeight`) |
| Weight exceeds all ranges | Use the price from the range with the highest maxWeight (overflow) |
| Weight is 0 | Use the price from the range with the lowest minWeight |

### Boundary Behavior — Why Adjacent Ranges Don't Overlap

Ranges use **inclusive lower bound, exclusive upper bound** (except the highest range):

```
Range 1: [0, 5)   → 0 ≤ weight < 5    → matches 0, 1, 2, 3, 4, 4.99
Range 2: [5, 15)  → 5 ≤ weight < 15   → matches 5, 6, ..., 14.99
Range 3: [15, 30] → 15 ≤ weight ≤ 30  → matches 15, 16, ..., 30 (highest = inclusive upper)
```

**Why `maxWeight` of one range = `minWeight` of the next is NOT an overlap:**

```
[0 ──── 5)  [5 ──── 15)  [15 ──── 30]
         ↑   ↑
    exclusive inclusive
```

- Weight **4.99** → Range 1 (< 5)
- Weight **5.0** → Range 2 (≥ 5)
- Weight **14.99** → Range 2 (< 15)
- Weight **15.0** → Range 3 (≥ 15)

The overlap validator checks: `range1.minWeight < range2.maxWeight && range2.minWeight < range1.maxWeight`. For `[0,5)` and `[5,15)`: `0 < 15` = true, but `5 < 5` = **false** → not overlapping.

**Best practice for contiguous ranges:** Set each range's `minWeight` equal to the previous range's `maxWeight`:

```json
[
  { "minWeight": 0, "maxWeight": 5, "price": 4.99 },
  { "minWeight": 5, "maxWeight": 15, "price": 7.99 },
  { "minWeight": 15, "maxWeight": 30, "price": 12.99 }
]
```

This creates seamless coverage with no gaps.

### Calculation Examples

Given weight ranges:
```
[0, 5) → £4.99
[5, 15) → £7.99
[15, 30) → £12.99
[30, 50] → £19.99  (highest range, inclusive upper bound)
```

| Cart Weight | Matching Range | Delivery Fee |
|-------------|---------------|--------------|
| 0 kg | [0, 5) | £4.99 |
| 3.5 kg | [0, 5) | £4.99 |
| 5 kg | [5, 15) | £7.99 |
| 14.9 kg | [5, 15) | £7.99 |
| 15 kg | [15, 30) | £12.99 |
| 50 kg | [30, 50] | £19.99 |
| 75 kg | [30, 50] (overflow) | £19.99 |

---

## Free Delivery Flag

### How It Works

| User Type | `freeDelivery: true` items | Behavior |
|-----------|---------------------------|----------|
| Normal/Guest | All items free delivery | Delivery fee = £0 |
| Normal/Guest | Mixed (some free, some not) | Weight calculated from non-free items only |
| Normal/Guest | No free delivery items | Weight calculated from all items |
| **Bulk Buyer** | Any | **Flag ignored** — all items counted |

### Examples

**Cart (Normal User):**
```
Item A: weight 2kg, qty 3, freeDelivery: true  → excluded (0 kg)
Item B: weight 1kg, qty 5, freeDelivery: false → included (5 kg)
Total weight: 5 kg
```

**Cart (Bulk Buyer, same items):**
```
Item A: weight 2kg, qty 3, freeDelivery: true  → included (6 kg)
Item B: weight 1kg, qty 5, freeDelivery: false → included (5 kg)
Total weight: 11 kg
```

**All-free cart (Normal User):**
```
Item A: weight 2kg, qty 3, freeDelivery: true  → excluded
Item B: weight 1kg, qty 2, freeDelivery: true  → excluded
Total weight: 0 kg → Delivery fee: £0
```

---

## API Reference

### Delivery Rate Response

```json
{
  "_id": "6a05601b4eaa4d3fb9815f79",
  "city": "london",
  "estimatedDays": 3,
  "isActive": true,
  "weightRanges": [
    { "minWeight": 0, "maxWeight": 5, "price": 4.99 },
    { "minWeight": 5, "maxWeight": 15, "price": 7.99 },
    { "minWeight": 15, "maxWeight": 30, "price": 12.99 }
  ]
}
```

### Checkout Response (delivery fee)

```json
{
  "subtotal": 139.98,
  "deliveryFee": 7.99,
  "taxAmount": 27.99,
  "total": 175.96
}
```

### Delivery Fee Estimate

```
POST /api/v1/orders/delivery-fee

{ "city": "london" }
```

The estimate endpoint uses the weight-based calculation with the user's current cart contents.

### Checkout Preview (includes delivery fee)

For a more accurate delivery fee that accounts for cart weight and free delivery flags, use the checkout preview endpoint:

```
POST /api/v1/orders/checkout-preview
{ "addressId": "saved-address-id" }
```

Response includes `deliveryFee` and `deliveryWeight` computed from actual cart contents.

---

## Frontend Integration

### Display Weight Ranges to User

```jsx
function DeliveryRateInfo({ deliveryRate }) {
  return (
    <div>
      <p className="font-medium">Delivery rates by weight:</p>
      <table className="text-sm">
        <thead>
          <tr><th>Weight</th><th>Fee</th></tr>
        </thead>
        <tbody>
          {deliveryRate.weightRanges
            .sort((a, b) => a.minWeight - b.minWeight)
            .map((range, i) => (
              <tr key={i}>
                <td>{range.minWeight}–{range.maxWeight} kg</td>
                <td>£{range.price.toFixed(2)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Estimate Cart Delivery (Client-Side Preview)

```javascript
/**
 * Estimate delivery fee based on cart contents. Display only — backend recalculates.
 */
const estimateDeliveryFee = (cartItems, weightRanges, isBulkBuyer) => {
  // Calculate total weight
  let totalWeight = 0;
  for (const item of cartItems) {
    if (!isBulkBuyer && item.variant.freeDelivery) continue;
    totalWeight += (item.variant.weight ?? 0) * item.quantity;
  }

  // All free delivery
  if (totalWeight === 0 && !isBulkBuyer) return 0;

  // Find matching range
  const sorted = [...weightRanges].sort((a, b) => a.minWeight - b.minWeight);
  const highest = sorted.reduce((max, r) => r.maxWeight > max.maxWeight ? r : max, sorted[0]);

  if (totalWeight === 0) return sorted[0].price;

  for (const range of sorted) {
    const isHighest = range === highest;
    if (isHighest) {
      if (totalWeight >= range.minWeight && totalWeight <= range.maxWeight) return range.price;
    } else {
      if (totalWeight >= range.minWeight && totalWeight < range.maxWeight) return range.price;
    }
  }

  return highest.price; // overflow
};
```

---

## File References

| File | Purpose |
|------|---------|
| `src/modules/config/delivery.helpers.js` | Pure delivery functions (calculateCartWeight, findMatchingWeightRange, computeDeliveryFee) |
| `src/modules/config/delivery.validation.helpers.js` | validateWeightRanges (shared by Mongoose + Zod) |
| `src/modules/config/deliveryRate.model.js` | Schema: weightRanges field |
| `src/modules/config/config.validation.js` | Zod schemas for weight range validation |
| `src/modules/orders/orders.service.js` | Checkout flow with weight-based delivery |
| `src/modules/variants/productVariant.model.js` | Schema: weight, freeDelivery fields |
