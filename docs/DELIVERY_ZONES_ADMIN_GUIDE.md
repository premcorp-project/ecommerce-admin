# Delivery Zones — Admin Guide

Complete guide for managing delivery zones, configuring pricing, and understanding how delivery fees are calculated for customers.

---

## Table of Contents

1. [How Delivery Works](#1-how-delivery-works)
2. [Creating a Zone](#2-creating-a-zone)
3. [Updating a Zone](#3-updating-a-zone)
4. [Delivery Mode (Strict vs Lenient)](#4-delivery-mode-strict-vs-lenient)
5. [Fallback Delivery Fee](#5-fallback-delivery-fee)
6. [Free Delivery Flag](#6-free-delivery-flag)
7. [Bulk Import/Export](#7-bulk-importexport)
8. [Use Cases & Examples](#8-use-cases--examples)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. How Delivery Works

When a customer checks out, the system calculates the delivery fee using this flow:

```
1. Sum cart weight (variant.weight × quantity) for items WITHOUT freeDelivery
2. Find the customer's city in active zones
3. Match total weight against the zone's weight ranges
4. Return the fee for the matching range

If no zone matches:
  - Lenient mode: use fallback fee (defaultDeliveryFee from settings)
  - Strict mode: block checkout with error
```

### Key Concepts

| Concept           | Description                                                                   |
| ----------------- | ----------------------------------------------------------------------------- |
| **Zone**          | A group of cities that share the same delivery pricing and estimated days     |
| **Weight Range**  | A row defining: if cart weighs between X and Y kg, charge £Z                  |
| **Free Delivery** | A per-variant flag — excludes that variant's weight from delivery calculation |
| **Default Zone**  | Fallback zone (per country) when customer's city isn't in any specific zone   |
| **Priority**      | When multiple zones contain the same city, highest priority wins              |

---

## 2. Creating a Zone

**Admin → Settings → Delivery → Add Zone**

### Required Fields

| Field             | Description                                         | Example                    |
| ----------------- | --------------------------------------------------- | -------------------------- |
| **Zone Name**     | Descriptive name (used for matching in bulk import) | "London Metro"             |
| **Country**       | ISO 2-letter code (uppercase)                       | "GB"                       |
| **Cities**        | List of cities covered by this zone                 | London, Croydon, Greenwich |
| **Weight Ranges** | At least 1 range (min weight, max weight, price)    | 0-5kg: £4.99               |

### Optional Fields

| Field          | Default | Description                                          |
| -------------- | ------- | ---------------------------------------------------- |
| Estimated Days | null    | Delivery time shown to customer (e.g., "3 days")     |
| Active         | true    | Inactive zones are ignored in fee calculation        |
| Default        | false   | Only ONE default zone per country — used as fallback |
| Priority       | 0       | Higher number wins when multiple zones match         |

### Validation Rules

- 1–20 weight ranges per zone
- Weight ranges must NOT overlap (minWeight of next must be ≥ maxWeight of previous)
- minWeight < maxWeight for each range
- Price ≥ 0
- A city can only belong to ONE active zone per country
- Only ONE active default zone per country

### Example: Creating "London Metro" Zone

```
Name: London Metro
Country: GB
Cities: London, Croydon, Bromley, Greenwich, Lewisham
Weight Ranges:
  0–5 kg: £4.49
  5–15 kg: £7.99
  15–30 kg: £12.99
  30–50 kg: £19.99
Estimated Days: 2
Active: Yes
Default: No
Priority: 10
```

---

## 3. Updating a Zone

**Admin → Settings → Delivery → Click Edit (pencil icon) on any zone**

All fields can be updated. Common updates:

### Adding a new city to an existing zone

Edit the zone → add the city name to the cities list → save.

### Changing pricing

Edit the zone → modify the weight range prices → save.

### Removing a city

Edit the zone → remove the city from the list → save. The city will no longer be served by this zone (falls to default zone or fallback fee).

### Deactivating a zone

Edit the zone → toggle "Active" off → save. All cities in this zone will fall back to the default zone.

---

## 4. Delivery Mode (Strict vs Lenient)

**Admin → Settings → Delivery → Delivery Settings card**

| Mode                  | Behaviour when city has no zone                                                           |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Lenient** (default) | Falls back to default zone → if no default → uses fallback fee. Checkout always proceeds. |
| **Strict**            | Blocks checkout with error: "Delivery is not available for this city."                    |

### When to use Strict mode

- You only deliver to specific cities and want to prevent orders from unsupported areas
- You want customers to see "We don't deliver here" at the address step

### When to use Lenient mode

- You deliver everywhere but with different pricing tiers
- You want checkout to always succeed (even with a flat fallback fee)

---

## 5. Fallback Delivery Fee

**Admin → Settings → Delivery → Delivery Settings card → "Fallback Delivery Fee"**

This flat fee is charged ONLY when:

- Mode is **lenient**
- Customer's city doesn't match any active zone
- No default zone exists for the country

Example: Set to £10.00 — any city not covered by a zone pays £10 flat delivery fee.

---

## 6. Free Delivery Flag

**Admin → Products → Edit Product → Variants → "Free Delivery" toggle**

This is set **per variant**, not per product. When a variant has `freeDelivery: true`:

- Its weight is **excluded** from the delivery fee calculation for normal/guest users
- If ALL items in the cart are free-delivery, `deliveryWeight = 0` → delivery fee = £0
- Mixed carts: only free-delivery items' weight is excluded

### Example

```
Cart:
  - Epoxy 500ml (weight: 0.5kg, freeDelivery: true)  → weight excluded
  - Epoxy 5L (weight: 5.5kg, freeDelivery: false)    → weight counted

Total delivery weight: 5.5kg (not 6.0kg)
Fee calculated based on 5.5kg against the zone's weight ranges
```

### When to use

- Promotional items (free delivery as incentive)
- Lightweight sample-size products
- Digital/downloadable products

---

## 7. Bulk Import/Export

**Admin → Settings → Delivery → Export / Import buttons**

### Export

Two formats available:

- **JSON** — raw data, perfect for programmatic editing or backup
- **Excel (.xlsx)** — human-readable spreadsheet for editing in Excel/Google Sheets

### Import

Accepts both `.json` and `.xlsx` files.

### How Import Works (Upsert)

| Scenario                         | Result                                        |
| -------------------------------- | --------------------------------------------- |
| Zone name+country doesn't exist  | Creates new zone                              |
| Zone name+country already exists | Updates existing zone (overwrites all fields) |
| Row has validation errors        | Skipped, error reported                       |

A bad row **never aborts** the rest of the batch.

### JSON Format

```json
[
  {
    "name": "London Metro",
    "country": "GB",
    "cities": ["London", "Croydon"],
    "weightRanges": [
      { "minWeight": 0, "maxWeight": 5, "price": 4.49 },
      { "minWeight": 5, "maxWeight": 15, "price": 7.99 }
    ],
    "estimatedDays": 2,
    "isActive": true,
    "isDefault": false,
    "priority": 10
  }
]
```

### Excel Format

| Name         | Country | Cities           | Weight Ranges                    | Estimated Days | Active | Default | Priority |
| ------------ | ------- | ---------------- | -------------------------------- | -------------- | ------ | ------- | -------- |
| London Metro | GB      | London, Croydon  | 0-5kg: £4.49 \| 5-15kg: £7.99    | 2              | Yes    | No      | 10       |
| Yorkshire    | GB      | Leeds, Sheffield | 0-10kg: £6.99 \| 10-30kg: £12.99 | 3              | Yes    | No      | 0        |

**Cities:** comma-separated list
**Weight Ranges:** pipe-separated, format: `{min}-{max}kg: £{price}`
**Active/Default:** "Yes" or "No"

### Round-Trip Workflow

```
1. Export zones (Excel or JSON)
2. Edit in Excel or text editor
3. Re-import the modified file
4. Updated = existing zones overwritten
5. Created = new zones added
```

### Re-importing the same file

Safe to do — same data produces `{ created: 0, updated: N, skipped: 0 }`. It's idempotent.

---

## 8. Use Cases & Examples

### Use Case 1: Set up delivery for a new city

**Scenario:** You want to add Birmingham to your delivery coverage.

**Option A: Add to existing zone**

1. Admin → Settings → Delivery
2. Find a zone that covers nearby cities (e.g., "Midlands")
3. Click Edit → add "Birmingham" to cities → Save

**Option B: Create new zone**

1. Admin → Settings → Delivery → Add Zone
2. Name: "Birmingham Area"
3. Country: GB
4. Cities: Birmingham, Solihull, Wolverhampton
5. Weight Ranges: set your pricing
6. Save

### Use Case 2: Different pricing for different regions

**Scenario:** You want to charge less for local deliveries and more for distant areas.

```
Zone: Local (priority: 10)
  Cities: London, Croydon
  0-10kg: £3.99, 10-30kg: £6.99

Zone: National (priority: 0, isDefault: true)
  Cities: (none — it's the default)
  0-10kg: £7.99, 10-30kg: £14.99
```

Local cities get cheap delivery; everywhere else pays the default zone rate.

### Use Case 3: Offer free delivery over a certain weight

**Scenario:** Orders over 50kg get free delivery.

This is controlled at the weight range level:

```
Zone: All Areas
  0-10kg: £5.99
  10-30kg: £9.99
  30-50kg: £14.99
  50-100kg: £0.00      ← free for heavy orders
```

### Use Case 4: Block delivery to certain areas

**Scenario:** You don't deliver to Scotland.

1. Set delivery mode to **Strict**
2. Don't create zones for Scottish cities
3. Customers in Scotland see: "We don't deliver to this city"
4. They cannot proceed to checkout

### Use Case 5: Seasonal pricing update

**Scenario:** You need to increase all delivery fees by 10% for Christmas.

1. Click **Export** → Excel
2. Open in Excel → multiply all prices by 1.1
3. Save the file
4. Click **Import** → select the modified file
5. All zones are updated with new prices

### Use Case 6: Launch in a new country

**Scenario:** You're expanding to Ireland.

1. Create zones with `country: "IE"`
2. Set cities, weight ranges, estimated days
3. The storefront automatically shows Ireland in the country dropdown
4. Irish cities appear when customer selects Ireland

No code changes needed — just add zones with the new country code.

### Use Case 7: Set up a default fallback zone

**Scenario:** You want all unlisted cities to get standard delivery pricing.

1. Add Zone → Name: "Standard Delivery"
2. Country: GB
3. Cities: (leave empty)
4. Toggle "Default Zone" → On
5. Set weight ranges with your standard pricing
6. Save

Any customer whose city isn't in a specific zone will get this default pricing.

### Use Case 8: One product has free delivery

**Scenario:** A promotional product should ship free.

1. Admin → Products → Edit the product
2. Go to the variant
3. Toggle "Free Delivery" → On
4. Save

That variant's weight is excluded from fee calculation. If it's the only item in cart, delivery is £0.

---

## 9. Troubleshooting

### Customer sees "We don't deliver to this city"

- **Cause:** Strict mode is on AND the customer's city isn't in any active zone
- **Fix:** Either add the city to a zone, or switch to lenient mode

### Customer is charged delivery when all items are free-delivery

- **Cause:** Backend bug — if `deliveryWeight` is 0, fee should be 0
- **Check:** Verify all items in the cart have `freeDelivery: true` on their variants
- **Note:** Bulk buyers are charged delivery regardless of freeDelivery flag

### Import shows "City already assigned to another zone"

- **Cause:** The city is already in a different active zone for the same country
- **Fix:** Remove the city from the other zone first, then re-import

### Import shows "Only one active default zone per country"

- **Cause:** You're trying to import a zone with `isDefault: true` but one already exists
- **Fix:** Set the existing default to `isDefault: false` first

### Delivery fee is higher than expected

- **Check:** Cart total weight (sum of all non-freeDelivery variants × quantity)
- **Check:** Which zone matched (customer's city → zone → weight range)
- **Check:** If weight exceeds all ranges, the highest range's fee is used

### Zone not showing in customer dropdown

- **Cause:** Zone is inactive (`isActive: false`)
- **Fix:** Edit zone → toggle Active on

### Customer's city not in dropdown

- **Cause:** City not added to any active zone
- **Fix:** Add the city to the appropriate zone

---

## Quick Reference

### Admin UI Location

```
Admin → Settings → Delivery tab
  ├── Delivery Settings (fallback fee + delivery mode)
  ├── Export / Import buttons
  ├── Add Zone button
  └── Zone table (edit, clone, delete)
```

### API Endpoints (for reference)

| Action                | Endpoint                                     |
| --------------------- | -------------------------------------------- |
| List zones            | `GET /delivery/zones/admin/list`             |
| Create zone           | `POST /delivery/zones`                       |
| Update zone           | `PUT /delivery/zones/:id`                    |
| Delete zone           | `DELETE /delivery/zones/:id`                 |
| Bulk import           | `POST /delivery/zones/bulk-import`           |
| Export                | `GET /delivery/zones/export`                 |
| Check deliverability  | `GET /delivery/check?country=GB&city=London` |
| List served cities    | `GET /delivery/cities?country=GB`            |
| List served countries | `GET /delivery/countries`                    |

### Weight Range Pricing Tiers (Example Template)

```
Local zones (2-day delivery):
  0-5 kg:   £4.49
  5-15 kg:  £7.99
  15-30 kg: £12.99
  30-50 kg: £19.99

National zones (3-4 day delivery):
  0-5 kg:   £6.99
  5-15 kg:  £9.99
  15-30 kg: £16.99
  30-50 kg: £24.99

Remote areas (5-7 day delivery):
  0-5 kg:   £9.99
  5-15 kg:  £14.99
  15-30 kg: £22.99
  30-50 kg: £34.99
```
