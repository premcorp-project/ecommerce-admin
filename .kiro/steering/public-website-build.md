---
inclusion: always
---

# Public Website — Build Guide

> This file governs all implementation work on the ChemTech customer-facing storefront.
> It extends the rules in `public-website.md` and `AGENTS.md`.
> **Always read `docs/CUSTOMER_SITE_GUIDE.md` before implementing any public page or feature.**
> For delivery fees, bulk pricing, and checkout logic, also read `docs/BULK_BUYER_GUIDE.md` (references `docs/DELIVERY_SYSTEM_GUIDE.md` and `docs/TIERED_PRICING_QA_GUIDE.md`).

---

## MANDATORY Pre-Implementation Checklist

Before writing a single line of code for any public page or component:

1. **Read `docs/CUSTOMER_SITE_GUIDE.md`** — every endpoint, payload shape, and response format is defined there. Never guess.
2. **Read `docs/BULK_BUYER_GUIDE.md`** — bulk buyer access, delivery fee calculation, tiered pricing, and COD rules. Also references `docs/DELIVERY_SYSTEM_GUIDE.md` and `docs/TIERED_PRICING_QA_GUIDE.md`.
3. **Read `.agents/skills/frontend-design/SKILL.md`** — commit to a clear aesthetic direction before building.
4. **Read `.agents/skills/next-best-practices/SKILL.md`** — RSC boundaries, async params, Suspense, metadata.
5. **Read `.agents/skills/tanstack-query-best-practices/SKILL.md`** — query keys, stale time, mutations.
6. **Read `.agents/skills/shadcn/SKILL.md`** — check installed components before building new UI.
7. **Read existing similar components** in `components/public/` — match the established pattern exactly.

---

## Domain Context — Chemical Products Ecommerce

This is a **B2B/B2C chemical products ecommerce platform**. Design and UX decisions must reflect this:

- Products are industrial/technical (adhesives, resins, coatings, solvents, etc.)
- Customers include both professionals (bulk buyers, procurement teams) and individuals
- Trust signals are critical: safety data, certifications, technical specs, bulk pricing
- Product variants are typically volume/size/concentration — not colour/style
- Bulk pricing tiers are a first-class feature — always display them prominently
- Safety and compliance information may appear in product descriptions — render faithfully with `RichContent`
- The site must feel professional, precise, and trustworthy — not generic retail

### UX Priorities (in order)

1. **Product findability** — search, filters, category navigation must be fast and accurate
2. **Variant clarity** — users must always know exactly what they are buying (SKU, volume, concentration)
3. **Pricing transparency** — show effective price, original price, bulk tiers, and currency clearly
4. **Trust** — ratings, reviews, stock status, delivery estimates
5. **Checkout speed** — minimal friction, saved addresses, clear order summary

---

## API Layer — Public Site

### Axios Instance

Use `lib/api/public-api.ts` — a separate Axios instance from the admin. It must:

- Set `baseURL: process.env.NEXT_PUBLIC_API_URL` (falls back to `http://localhost:5000/api/v1`)
- Set `withCredentials: true` (sends httpOnly refresh token cookie automatically)
- Include a request interceptor that attaches the customer access token from the customer auth store
- Include a response interceptor that handles `401` with token refresh → redirect to `/login?session=expired`
- Handle `429` by attaching a `friendlyMessage` to the error for display

### Hooks

- `usePublicQuery` from `lib/api/public-hooks.ts` — all GET requests
- `usePublicMutation` from `lib/api/public-hooks.ts` — all POST/PUT/DELETE requests
- Query keys always use `['public', 'section', id?]` format

### Query Key Reference

| Resource                   | Key                                          |
| -------------------------- | -------------------------------------------- |
| Homepage featured products | `['public', 'featured-products']`            |
| Homepage banners           | `['public', 'banners']`                      |
| Category tree              | `['public', 'categories']`                   |
| Product listing            | `['public', 'products', searchParamsString]` |
| Product detail             | `['public', 'product', slug]`                |
| Cart                       | `['public', 'cart']`                         |
| Wishlist                   | `['public', 'wishlist']`                     |
| Wishlist check             | `['public', 'wishlist-check', productId]`    |
| Orders list                | `['public', 'orders']`                       |
| Order detail               | `['public', 'order', orderId]`               |
| User profile               | `['public', 'profile']`                      |
| User addresses             | `['public', 'addresses']`                    |
| Reviews                    | `['public', 'reviews', productId]`           |
| Support tickets            | `['public', 'tickets']`                      |
| Ticket detail              | `['public', 'ticket', ticketId]`             |
| Platform config            | `['public', 'config']`                       |

---

## All API Endpoints — Quick Reference

> Full request/response shapes are in `docs/CUSTOMER_SITE_GUIDE.md`. This table is a navigation aid only.

### Auth

| Method | Endpoint              | Purpose                             |
| ------ | --------------------- | ----------------------------------- |
| POST   | `/auth/register`      | Register new customer               |
| POST   | `/auth/login`         | Login                               |
| GET    | `/auth/google`        | Google OAuth (redirect)             |
| POST   | `/auth/refresh-token` | Refresh access token (cookie-based) |
| POST   | `/auth/logout`        | Logout, clear cookie                |

### Homepage

| Method | Endpoint                                    | Purpose            |
| ------ | ------------------------------------------- | ------------------ |
| GET    | `/catalog/products?isFeatured=true&limit=8` | Featured products  |
| GET    | `/catalog/categories`                       | Full category tree |
| GET    | `/banners`                                  | Active banners     |

### Product Listing

| Method | Endpoint            | Purpose                          |
| ------ | ------------------- | -------------------------------- |
| GET    | `/catalog/products` | Paginated, filtered product list |

**Supported query params:** `page`, `limit`, `category` (id or slug), `search`, `sortBy` (`newest`/`price_asc`/`price_desc`/`name_asc`/`popularity`), `minPrice`, `maxPrice`, `inStock`, `featured`, `attributes[Key]=val1,val2`

**Response includes:** `products[]`, `pagination`, `availableFilters` (attributes + priceRange)

> ⚠️ Never send `?includeAll=false` — omit the param entirely for storefront requests.

### Product Detail

| Method | Endpoint                               | Purpose                                                 |
| ------ | -------------------------------------- | ------------------------------------------------------- |
| GET    | `/catalog/products/:idOrSlug`          | Full product with `variants[]` array                    |
| GET    | `/catalog/products/:productId/reviews` | Paginated reviews                                       |
| POST   | `/catalog/products/:productId/reviews` | Submit review (auth required, delivered order required) |

### Cart

| Method | Endpoint               | Purpose                                                  |
| ------ | ---------------------- | -------------------------------------------------------- |
| GET    | `/orders/cart`         | Get current cart                                         |
| POST   | `/orders/cart`         | Add item — requires `productId`, `variantId`, `quantity` |
| PUT    | `/orders/cart/:itemId` | Update quantity — use cart item `_id`, not variantId     |
| DELETE | `/orders/cart/:itemId` | Remove item                                              |
| DELETE | `/orders/cart`         | Clear cart                                               |

> ⚠️ Cart item identity uses the cart item `_id` from the cart response — never `productId` or `variantId`.

### Wishlist (auth required)

| Method | Endpoint                     | Purpose                                          |
| ------ | ---------------------------- | ------------------------------------------------ |
| GET    | `/wishlist`                  | Get wishlist                                     |
| POST   | `/wishlist`                  | Add product — `{ productId }`                    |
| DELETE | `/wishlist/:itemId`          | Remove — use wishlist item `_id`                 |
| GET    | `/wishlist/check/:productId` | Check if wishlisted → `{ isWishlisted, itemId }` |

### Checkout

| Method | Endpoint               | Purpose                                                    |
| ------ | ---------------------- | ---------------------------------------------------------- |
| POST   | `/coupons/validate`    | Preview coupon discount — `{ code, cartTotal }`            |
| GET    | `/users/addresses`     | List saved addresses                                       |
| POST   | `/orders/delivery-fee` | Calculate fee — `{ addressId, cartTotal }`                 |
| POST   | `/orders`              | Create order — `{ addressId, paymentMethod, couponCode? }` |

> ⚠️ Checkout is rate-limited to **5 req/min per IP**. On `429`, show: "Too many checkout attempts. Please wait a moment and try again."

### Orders

| Method | Endpoint                           | Purpose                          |
| ------ | ---------------------------------- | -------------------------------- |
| GET    | `/orders`                          | Authenticated order history      |
| GET    | `/orders/:orderId`                 | Order detail                     |
| GET    | `/orders/guest/:orderId?email=...` | Guest order lookup               |
| POST   | `/orders/:orderId/cancel`          | Cancel (pending/processing only) |
| POST   | `/orders/:orderId/reorder`         | Re-add items to cart             |

### User Account (auth required)

| Method | Endpoint                       | Purpose             |
| ------ | ------------------------------ | ------------------- |
| GET    | `/users/profile`               | Get profile         |
| PUT    | `/users/profile`               | Update name/phone   |
| PUT    | `/users/change-password`       | Change password     |
| POST   | `/users/addresses`             | Add address         |
| PUT    | `/users/addresses/:id`         | Update address      |
| DELETE | `/users/addresses/:id`         | Delete address      |
| PUT    | `/users/addresses/:id/default` | Set default address |
| POST   | `/users/push-token`            | Register push token |

### Support (auth required)

| Method | Endpoint                              | Purpose                                          |
| ------ | ------------------------------------- | ------------------------------------------------ |
| POST   | `/support/tickets`                    | Create ticket — `{ subject, message, orderId? }` |
| GET    | `/support/tickets`                    | List tickets                                     |
| GET    | `/support/tickets/:ticketId`          | Ticket with messages                             |
| POST   | `/support/tickets/:ticketId/messages` | Add message                                      |

### Real-time

| Method | Endpoint                | Purpose                              |
| ------ | ----------------------- | ------------------------------------ |
| GET    | `/notifications/stream` | SSE stream (auth, `withCredentials`) |

**SSE event types:** `order_status_updated`, `order_delivered`, `order_cancelled`, `payment_confirmed`, `ticket_reply`, `notification`

---

## Critical Data Model Rules

These rules come directly from `docs/CUSTOMER_SITE_GUIDE.md` and must never be violated:

1. **All products are variant-based.** There are no simple products. Every add-to-cart requires a `variantId`.
2. **Price lives on the variant.** `Product` has no `price` field. Use `variant.effectivePrice` for display (`discountedPrice ?? price`).
3. **Cart item identity.** Cart update and remove use the cart item `_id` from the cart response — NOT `productId` or `variantId`.
4. **Wishlist is product-only.** Wishlist tracks products, not specific variants.
5. **`variants[]` only on detail endpoint.** The listing endpoint does NOT return variants — only `minPrice`, `inventory`, `available`.
6. **`minPrice` can be `null`** if a product has no active variants — handle gracefully.
7. **`frequentlyBoughtTogether`** is an array of raw product IDs — fetch each separately.
8. **Bulk pricing** — always check `variant.bulkPricing` and display tier pricing when `quantity >= minQuantity`.
9. **`effectivePrice`** is pre-calculated by the backend — always use it, never recalculate.
10. **Response envelope** — `{ success: true, data: { ... } }`. Access via `res.data.data`.

---

## Page Structure & Routes

```
app/(public)/
  layout.tsx                    — Public layout: Navbar, Footer, SSE listener (auth only)
  page.tsx                      — Homepage (SSR/ISR revalidate: 60)
  products/
    page.tsx                    — Product listing (SSR, URL-driven filters)
    [slug]/
      page.tsx                  — Product detail (ISR revalidate: 300)
  categories/
    [slug]/
      page.tsx                  — Category page (ISR revalidate: 300)
  cart/
    page.tsx                    — Cart (client-side only)
  checkout/
    page.tsx                    — Checkout flow (client-side only, auth or guest)
  orders/
    page.tsx                    — Order history (client-side only, auth required)
    [orderId]/
      page.tsx                  — Order detail (client-side only)
      confirmation/
        page.tsx                — Order confirmation (client-side only)
  account/
    page.tsx                    — Account dashboard (client-side only, auth required)
    profile/
      page.tsx                  — Profile settings
    addresses/
      page.tsx                  — Address book
    wishlist/
      page.tsx                  — Wishlist
    support/
      page.tsx                  — Support tickets list
      [ticketId]/
        page.tsx                — Ticket detail / chat
  (auth)/
    login/
      page.tsx                  — Login (redirect if already authenticated)
    register/
      page.tsx                  — Register
    forgot-password/
      page.tsx                  — Forgot password
  order-lookup/
    page.tsx                    — Guest order lookup
```

---

## Component Architecture

### Naming & Location

```
components/public/
  layout/
    Navbar.tsx              — Top navigation, cart count, auth state, mobile menu trigger
    NavbarSearch.tsx        — Search input with debounce
    MobileMenu.tsx          — Slide-out mobile nav
    Footer.tsx              — Links, newsletter, social
    Breadcrumb.tsx          — Page breadcrumb (public pages only)
  home/
    HeroBanner.tsx          — Full-width banner carousel (Embla or shadcn Carousel)
    CategoryGrid.tsx        — Category cards grid
    FeaturedProducts.tsx    — Featured product grid section
    PromoSection.tsx        — Optional promotional banner strip
  products/
    ProductCard.tsx         — Card: image, name, minPrice, rating, stock badge, wishlist btn
    ProductGrid.tsx         — Responsive grid of ProductCards + skeleton state
    ProductFilters.tsx      — Sidebar: price range, in-stock toggle, attribute checkboxes
    SortSelector.tsx        — Sort dropdown (newest/price/popularity/name)
    ProductDetail/
      index.tsx             — Thin orchestrator (< 50 lines)
      ProductImages.tsx     — Image gallery with thumbnail strip
      ProductInfo.tsx       — Name, category, rating, description
      VariantSelector.tsx   — Attribute buttons with availability logic
      PriceDisplay.tsx      — effectivePrice, strikethrough, bulk tier
      AddToCartSection.tsx  — Quantity input + Add to Cart + Wishlist
      BulkPricingTable.tsx  — Bulk pricing tiers table
      ReviewSection.tsx     — Review list + submit form
      FrequentlyBought.tsx  — FBT product cards
  cart/
    CartDrawer.tsx          — Slide-out cart (Sheet)
    CartItem.tsx            — Item row: image, name, variant, qty stepper, remove
    CartSummary.tsx         — Subtotal, delivery estimate, checkout CTA
    EmptyCart.tsx           — Empty state with CTA to browse
  checkout/
    CheckoutLayout.tsx      — Step indicator + content area
    CouponInput.tsx         — Coupon code field with validate button
    AddressSelector.tsx     — List saved addresses + add new
    AddressForm.tsx         — Formik form for new/edit address
    DeliveryFeeDisplay.tsx  — Fee + free shipping progress
    PaymentSelector.tsx     — Stripe / COD radio
    StripePaymentForm.tsx   — Stripe Elements wrapper
    OrderSummaryPanel.tsx   — Items, totals, coupon discount
  account/
    AccountNav.tsx          — Sidebar navigation for account pages
    ProfileForm.tsx         — Name, phone, avatar
    PasswordForm.tsx        — Change password
    OrderHistory.tsx        — Paginated order list
    OrderDetail.tsx         — Full order with tracking
    AddressBook.tsx         — Address list + CRUD
    WishlistGrid.tsx        — Wishlist product cards
    SupportTicketList.tsx   — Ticket list
    SupportTicketDetail.tsx — Ticket messages + reply form
  common/
    Rating.tsx              — Star display (read-only)
    PriceDisplay.tsx        — Reusable price with discount/bulk logic
    StockBadge.tsx          — In Stock / Out of Stock / Low Stock
    QuantityInput.tsx       — +/- stepper with min/max validation
    ProductSkeleton.tsx     — Card skeleton for loading state
    PageSkeleton.tsx        — Full-page skeleton
    EmptyState.tsx          — Empty state with icon, message, CTA
    Breadcrumb.tsx          — Breadcrumb nav
    CurrencyDisplay.tsx     — Formats price with currency from config
```

### Component Size Rule

Hard limit: **200 lines per file**. Complex components (ProductDetail, Checkout) must be split into subfolders as shown above.

---

## SEO Requirements

Every public page must have `generateMetadata()` or `export const metadata`. No exceptions.

### Page-specific metadata

| Page                  | Title                                     | Description  | OG Image                              | JSON-LD        |
| --------------------- | ----------------------------------------- | ------------ | ------------------------------------- | -------------- |
| Homepage              | `ChemTech — Industrial Chemical Products` | Site tagline | Hero banner image                     | Organization   |
| Product listing       | `{category} Products                      | ChemTech`    | Category description                  | —              |
| Product detail        | `{name}                                   | ChemTech`    | Stripped HTML description (160 chars) | Product schema |
| Category              | `{name}                                   | ChemTech`    | Category description                  | —              |
| Cart/Checkout/Account | `{Page}                                   | ChemTech`    | Generic                               | —              |

### Product JSON-LD

```tsx
// Always add to product detail pages
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description.replace(/<[^>]+>/g, ''),
  image: product.images.map((img) => img.url),
  brand: { '@type': 'Brand', name: 'ChemTech' },
  aggregateRating:
    product.reviewCount > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.averageRating,
          reviewCount: product.reviewCount,
        }
      : undefined,
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: product.minPrice,
    priceCurrency: 'USD', // replace with config.currency
    availability: product.available
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  },
};
```

---

## Variant Selector Rules

The variant selector is the most critical UI component on the product detail page.

- Show one button group per `variantAttribute` key (e.g., "Volume", "Concentration")
- A button is **disabled + strikethrough** if no available variant matches that value given current selections
- A button is **selected** when it matches `selections[key]`
- Only resolve a `selectedVariant` when ALL attribute keys have a selection
- Call `onVariantChange(null)` when not all keys are selected
- The Add to Cart button must be disabled when `selectedVariant === null` or `!selectedVariant.available`
- Show the variant's `imageUrl` in the gallery when it has one

---

## Price Display Rules

```
variant.effectivePrice     → always the main displayed price
variant.price              → show with line-through ONLY when discountedPrice !== null
variant.bulkPricing        → show tier table when present; apply when quantity >= minQuantity
product.minPrice           → use on cards (listing page) — prefix with "From"
```

- Never hardcode currency symbols — read from `GET /config → config.currency`
- Use `CurrencyDisplay` component for all price rendering
- Show "From £X.XX" on product cards when `minPrice` is set
- Show bulk pricing table on product detail when `variant.bulkPricing` is not null

---

## Cart Rules

- Cart is session-based for guests, persisted for authenticated users
- Always re-render cart from the API response — never mutate local state directly
- Use optimistic updates for quantity changes and item removal (roll back on error)
- Cart item `_id` is the identifier for PUT/DELETE — never use `productId` or `variantId`
- Show cart item count in Navbar — update after every cart mutation
- If a variant was deleted, it is silently removed from the cart response — handle gracefully

---

## Checkout Flow Rules

```
Step 1: Review cart + apply coupon (optional)
Step 2: Select or add delivery address
Step 3: Review delivery fee + order summary
Step 4: Select payment method (Stripe / COD)
Step 5a (Stripe): Confirm payment with Stripe Elements
Step 5b (COD): Place order → redirect to confirmation
```

- Rate limit: 5 req/min. On `429` show the friendly message — never a raw error.
- Coupon validation (`POST /coupons/validate`) is preview-only — coupon is applied at order creation.
- Guests with `perUserLimit` coupons get `403` — show "This coupon requires an account."
- After successful order: clear cart, redirect to `/orders/:orderId/confirmation`.
- Stripe: use `@stripe/stripe-js` + `@stripe/react-stripe-js` — never install other payment libraries.

---

## Authentication Rules

- Customer auth is completely separate from admin auth.
- Store: `lib/stores/customer-auth-store.ts` — never use admin auth store.
- Access token: stored in memory or `sessionStorage` (NOT `localStorage` for the token itself — use httpOnly cookie via `withCredentials`).
- Protected routes: `/account/*`, `/checkout` → redirect to `/login?redirect=<current-path>` if unauthenticated.
- After login: redirect to the `redirect` query param or `/account`.
- Google OAuth: redirect to `GET /auth/google` — no frontend token handling needed.
- On `401` from any API call: attempt `POST /auth/refresh-token` once → if that fails, redirect to `/login?session=expired`.

---

## Real-time (SSE) Rules

- Connect to `GET /notifications/stream` only when the customer is authenticated.
- Use `EventSource` with `withCredentials: true`.
- Reconnect automatically after 5 seconds on error.
- Disconnect on logout.
- Show toast notifications for: `order_status_updated`, `order_delivered`, `order_cancelled`, `payment_confirmed`, `ticket_reply`.
- Invalidate relevant react-query caches on order/ticket events.

---

## Loading & Error State Rules

| Situation               | Required UI                                            |
| ----------------------- | ------------------------------------------------------ |
| Product grid loading    | `ProductSkeleton` × N (match expected count)           |
| Product detail loading  | Full-page skeleton with image placeholder + text lines |
| Cart loading            | Skeleton rows                                          |
| Any list loading        | Skeleton rows matching the list item shape             |
| API error (recoverable) | User-friendly message + "Try Again" button             |
| 404 product             | Redirect to `/products` with toast                     |
| Empty state             | `EmptyState` component with icon, message, CTA         |
| Auth required           | Redirect to login — never show a blank page            |

Never show:

- Raw error messages or stack traces
- Blank white space while loading
- Spinners without context (always show skeleton shapes)

---

## Localization Rules

- Namespace: `public.{section}.{key}`
- Examples: `public.products.addToCart`, `public.checkout.placeOrder`, `public.account.orderHistory`
- Add to ALL 3 files: `messages/en.json`, `messages/ar.json`, `messages/fr.json`
- RTL layout is automatic via `dir` attribute on `<html>` — no extra CSS needed
- Restart dev server after adding new keys

### Key namespace map

```
public.nav.*          — Navbar links, search placeholder, cart
public.home.*         — Hero, section headings, CTAs
public.products.*     — Listing page, filters, sort, product card labels
public.product.*      — Detail page: variants, price, add to cart, reviews
public.cart.*         — Cart drawer, items, summary, checkout CTA
public.checkout.*     — Steps, address, payment, order summary, errors
public.orders.*       — Order history, detail, status labels, tracking
public.account.*      — Profile, password, addresses, wishlist, support
public.auth.*         — Login, register, forgot password
public.common.*       — Shared: loading, error, empty state, currency
```

---

## Design Principles for ChemTech Public Site

These are non-negotiable aesthetic and UX decisions for this chemical products platform:

### Visual Direction

- **Professional and precise** — clean grid layouts, generous whitespace, clear typography hierarchy
- **Trust-first** — stock badges, ratings, certifications, and safety info must be immediately visible
- **Not generic retail** — avoid playful/casual design patterns; this is a technical B2B/B2C platform
- Use semantic tokens exclusively — the site must look correct across all admin-configured themes

### Typography

- Product names: large, bold, clear
- Technical specs (SKU, volume, concentration): monospace or distinct weight
- Prices: prominent, with clear discount/bulk tier hierarchy
- Descriptions: readable line-height, proper prose spacing via `RichContent`

### Product Cards

Must always show:

- Product image (next/image, aspect-ratio consistent)
- Product name
- "From £X.XX" price (using `minPrice`)
- Star rating + review count (if any)
- Stock badge (In Stock / Out of Stock)
- Wishlist heart button (top-right corner)
- Category label (optional, subtle)

### Product Detail Layout

- Left: image gallery with thumbnail strip
- Right: name, category breadcrumb, rating, price, variant selector, quantity, add to cart, wishlist
- Below fold: full description (`RichContent`), bulk pricing table, reviews, FBT products

### Navbar

- Logo left, main nav centre (or left on mobile), search + cart + auth right
- Cart icon shows item count badge
- Search: debounced, navigates to `/products?search=...`
- Mobile: hamburger → slide-out drawer

### Footer

- Company info, navigation links, newsletter signup
- Social links (lucide-react icons only)
- Currency/language selector if applicable

---

## What NOT to Do — Public Site Specific

- ❌ Never import from `components/admin/` — hard separation, no exceptions
- ❌ Never use `useAdminQuery`, `useAdminMutation`, `adminApi`, or `['admin', ...]` keys
- ❌ Never use admin Zustand stores
- ❌ Never use `<img>` — always `next/image` with explicit dimensions
- ❌ Never hardcode currency symbols — always read from platform config
- ❌ Never hardcode prices — always use `variant.effectivePrice` or `product.minPrice`
- ❌ Never add to cart without a `variantId` — it will return a 400 error
- ❌ Never use `productId` or `variantId` for cart PUT/DELETE — use cart item `_id`
- ❌ Never show raw API errors to customers — always show friendly messages
- ❌ Never skip skeleton loaders — blank space while loading is not acceptable
- ❌ Never skip `generateMetadata()` on public pages — SEO is mandatory
- ❌ Never render `product.description` as plain text — use `RichContent`
- ❌ Never use `dangerouslySetInnerHTML` directly — use `RichContent` which sanitizes
- ❌ Never skip localization — all 3 message files must be updated together
- ❌ Never hardcode colours — use semantic tokens only
- ❌ Never load all products at once — always paginate
- ❌ Never use `window.confirm` — use `AppAlertDialog` for destructive actions
- ❌ Never build a component over 200 lines — split it
- ❌ Never install a payment library other than `@stripe/stripe-js` + `@stripe/react-stripe-js`
- ❌ Never install a rich-text library — use `AppRichEditor` / `RichContent` (Tiptap v3)
- ❌ Never add another icon library — `lucide-react` only
- ❌ Never guess API endpoints — always check `docs/CUSTOMER_SITE_GUIDE.md`

---

## Component Architecture — Section-Based, Variant-Ready

This is the most important structural rule for the public website. Every UI section is built as a **self-contained, reusable section component** that can later have multiple design variants without changing its data contract.

### The Core Idea

A section component owns its **data fetching, state, and behaviour**. Its **visual presentation** is kept separate so a second variant can be dropped in later with zero logic changes.

```
components/public/
  sections/                     ← all page sections live here
    hero/
      HeroSection.tsx           ← default variant (used in pages)
      HeroSection.types.ts      ← shared props interface
      HeroSectionAlt.tsx        ← future alternate design (same props)
    featured-products/
      FeaturedProductsSection.tsx
      FeaturedProductsSection.types.ts
    category-grid/
      CategoryGridSection.tsx
      CategoryGridSection.types.ts
    product-filters/
      ProductFiltersSection.tsx
      ProductFiltersSection.types.ts
    ...
  layout/                       ← Navbar, Footer, MobileMenu (not sections)
  products/                     ← ProductCard, ProductGrid, VariantSelector, etc.
  cart/                         ← CartDrawer, CartItem, CartSummary
  checkout/                     ← CheckoutLayout, steps
  account/                      ← ProfileForm, OrderHistory, etc.
  common/                       ← Rating, PriceDisplay, StockBadge, etc.
```

### Section File Structure

Every section folder contains:

```
sections/hero/
  HeroSection.tsx           — default variant: fetches data, renders UI
  HeroSection.types.ts      — exported props interface (shared by all variants)
  HeroSectionAlt.tsx        — alternate variant (same props, different design)
  index.ts                  — re-exports the active variant
```

The `index.ts` controls which variant is active:

```ts
// sections/hero/index.ts
export { HeroSection as default } from './HeroSection';
// To switch variant: export { HeroSectionAlt as default } from './HeroSectionAlt';
```

Pages always import from the index — never directly from a variant file:

```tsx
// ✅ CORRECT — page doesn't care which variant is active
import HeroSection from '@/components/public/sections/hero';
// ❌ WRONG — page is coupled to a specific variant
import { HeroSection } from '@/components/public/sections/hero/HeroSection';
```

### Props Interface Rules

Every section has a `*.types.ts` file that defines its props interface. All variants of that section must satisfy the same interface.

```ts
// sections/featured-products/FeaturedProductsSection.types.ts
export interface FeaturedProductsSectionProps {
  products: Product[];
  isLoading: boolean;
  title?: string;
}
```

```tsx
// FeaturedProductsSection.tsx — default variant
export function FeaturedProductsSection({ products, isLoading, title }: FeaturedProductsSectionProps) { ... }

// FeaturedProductsSectionAlt.tsx — alternate variant, same contract
export function FeaturedProductsSectionAlt({ products, isLoading, title }: FeaturedProductsSectionProps) { ... }
```

### Data Fetching — Where It Lives

Sections that need data fetch it themselves using `usePublicQuery`. Pages are thin orchestrators that compose sections — they do not fetch data and pass it down.

```tsx
// ✅ CORRECT — section owns its data
// sections/featured-products/FeaturedProductsSection.tsx
export function FeaturedProductsSection() {
  const { data, isLoading } = usePublicQuery(
    ['public', 'featured-products'],
    '/catalog/products',
    { params: { isFeatured: true, limit: 8 } },
  );
  const products = data?.data?.products ?? [];
  return <ProductGrid products={products} isLoading={isLoading} />;
}

// ✅ CORRECT — page just composes sections
// app/(public)/page.tsx
export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <CategoryGridSection />
      <FeaturedProductsSection />
    </main>
  );
}

// ❌ WRONG — page fetches and passes data down
export default async function HomePage() {
  const products = await fetchFeaturedProducts();
  return <FeaturedProductsSection products={products} />;
}
```

**Exception:** SSR/ISR pages that need server-side data for SEO (product detail, category pages) may fetch in the page and pass as props — but the section must still accept those props via its typed interface.

### Naming Conventions

| File              | Convention                                      | Example                            |
| ----------------- | ----------------------------------------------- | ---------------------------------- |
| Section folder    | `kebab-case`                                    | `featured-products/`               |
| Default variant   | `{Name}Section.tsx`                             | `FeaturedProductsSection.tsx`      |
| Alternate variant | `{Name}SectionAlt.tsx` or `{Name}SectionV2.tsx` | `FeaturedProductsSectionAlt.tsx`   |
| Types file        | `{Name}Section.types.ts`                        | `FeaturedProductsSection.types.ts` |
| Index             | `index.ts`                                      | re-exports active variant          |

### Sections Reference

| Section folder                | Default component         | Purpose                    |
| ----------------------------- | ------------------------- | -------------------------- |
| `sections/hero/`              | `HeroSection`             | Full-width banner carousel |
| `sections/featured-products/` | `FeaturedProductsSection` | Featured product grid      |
| `sections/category-grid/`     | `CategoryGridSection`     | Category cards             |
| `sections/promo-banner/`      | `PromoBannerSection`      | Promotional strip          |
| `sections/product-filters/`   | `ProductFiltersSection`   | Sidebar filters            |
| `sections/product-grid/`      | `ProductGridSection`      | Paginated product grid     |
| `sections/product-detail/`    | `ProductDetailSection`    | Full product detail        |
| `sections/reviews/`           | `ReviewsSection`          | Review list + form         |
| `sections/frequently-bought/` | `FrequentlyBoughtSection` | FBT products               |
| `sections/cart-summary/`      | `CartSummarySection`      | Cart contents + totals     |
| `sections/checkout-steps/`    | `CheckoutStepsSection`    | Multi-step checkout        |
| `sections/order-history/`     | `OrderHistorySection`     | Paginated order list       |
| `sections/order-detail/`      | `OrderDetailSection`      | Order detail + tracking    |

### Reusable Primitives (not sections)

These live in `components/public/common/` — they are stateless display components used inside sections:

```
common/
  ProductCard.tsx       — single product card (image, name, price, badges)
  ProductGrid.tsx       — responsive grid of ProductCards
  Rating.tsx            — star display
  PriceDisplay.tsx      — price with discount/bulk logic
  StockBadge.tsx        — In Stock / Out of Stock
  QuantityInput.tsx     — +/- stepper
  ProductSkeleton.tsx   — card skeleton
  PageSkeleton.tsx      — full-page skeleton
  EmptyState.tsx        — empty state with icon + CTA
  CurrencyDisplay.tsx   — formatted price with currency
```

These primitives are shared across multiple sections. A section variant can use different primitives or arrange them differently — but the primitives themselves stay in `common/`.

### Adding a New Section — Checklist

1. Create `components/public/sections/{name}/` folder
2. Create `{Name}Section.types.ts` — define the props interface first
3. Create `{Name}Section.tsx` — implement the default variant
4. Create `index.ts` — re-export the default variant
5. Import in the page via `import XSection from '@/components/public/sections/{name}'`

### Adding a Variant — Checklist

1. Create `{Name}SectionAlt.tsx` in the same folder
2. Implement using the **same props interface** from `{Name}Section.types.ts`
3. Update `index.ts` to export the new variant
4. Pages require zero changes — they import from `index.ts`

### Rules — No Exceptions

- ❌ Never import a section variant directly — always import from `index.ts`
- ❌ Never define props inline in a section component — always use the `*.types.ts` file
- ❌ Never duplicate data-fetching logic across variants — extract to a custom hook in the section folder if needed
- ❌ Never put layout components (Navbar, Footer) in `sections/` — they live in `layout/`
- ❌ Never put stateless primitives (ProductCard, Rating) in `sections/` — they live in `common/`
- ✅ All variants of a section must satisfy the same props interface
- ✅ Sections own their data fetching — pages are thin composers
- ✅ `index.ts` is the single switch point for activating a variant

---

## Quick Checklist Before Submitting Any Public Work

- [ ] Read `docs/CUSTOMER_SITE_GUIDE.md` for the relevant section before implementing
- [ ] No imports from `components/admin/`
- [ ] Section component lives in `components/public/sections/{name}/` with `index.ts`
- [ ] Props interface defined in `{Name}Section.types.ts` before writing the component
- [ ] Page imports section from `index.ts` — not from the variant file directly
- [ ] All API calls use `usePublicQuery` / `usePublicMutation` with `['public', ...]` keys
- [ ] All images use `next/image` with explicit `width` and `height`
- [ ] All strings use `t('public.section.key')` — no hardcoded English
- [ ] All 3 message files updated (`en.json`, `ar.json`, `fr.json`)
- [ ] All colours use semantic tokens — no hardcoded values
- [ ] Page has `generateMetadata()` with meaningful title and description
- [ ] Product description rendered with `<RichContent>` — not raw HTML
- [ ] Product description in metadata has HTML stripped: `.replace(/<[^>]+>/g, '')`
- [ ] Skeleton loader shown while data fetches
- [ ] Error state handled with friendly message + retry
- [ ] Currency read from config — not hardcoded
- [ ] Cart mutations use cart item `_id` — not `productId` or `variantId`
- [ ] Add to cart always sends `variantId`
- [ ] Component is under 200 lines — split if needed
- [ ] Dev server restarted after adding i18n keys
