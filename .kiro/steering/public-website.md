---
inclusion: always
---

# Public Website Rules

These rules apply to all work under `app/(public)/` and `components/public/`. Read `AGENTS.md` for the full rule set.

---

## Hard Separation from Admin

- ❌ Never import from `components/admin/` in any public component or page
- ❌ Never use `useAdminQuery`, `useAdminMutation`, or `adminApi` in public code
- ❌ Never use `['admin', ...]` react-query keys in public code
- ❌ Never use admin Zustand stores in public code
- ✅ `components/shared/`, `components/ui/`, `lib/utils/`, `constants/`, `types/` — safe everywhere

---

## Component Location

```
components/public/
  sections/   — page sections, each in its own folder with variants support
  layout/     — Navbar, Footer, MobileMenu, Breadcrumb
  products/   — ProductCard, ProductGrid, VariantSelector, ImageGallery, ReviewList, ReviewForm
  cart/       — CartItem, CartSummary, CartDrawer, EmptyCart
  checkout/   — CheckoutForm, OrderSummary, PaymentSection, AddressSelector
  account/    — ProfileForm, OrderHistory, OrderDetail, AddressBook,
                WishlistGrid, WishlistItem
  common/     — stateless primitives: Rating, PriceDisplay, StockBadge, QuantityInput,
                ProductSkeleton, EmptyState, CurrencyDisplay
```

### Section-Based Architecture (MANDATORY)

Every page section lives in `components/public/sections/{name}/` with this structure:

```
sections/hero/
  HeroSection.tsx           — default variant
  HeroSection.types.ts      — shared props interface (all variants must satisfy this)
  HeroSectionAlt.tsx        — alternate variant (same props, different design)
  index.ts                  — re-exports the active variant
```

**Rules:**

- Pages always import from `index.ts` — never directly from a variant file
- All variants of a section must implement the same props interface from `*.types.ts`
- Sections own their data fetching via `usePublicQuery` — pages are thin composers
- `index.ts` is the single switch point to activate a different variant — pages need zero changes
- Stateless primitives (ProductCard, Rating, etc.) live in `common/` — not in sections
- Layout components (Navbar, Footer) live in `layout/` — not in sections

```ts
// index.ts — switch variants here, pages are unaffected
export { HeroSection as default } from './HeroSection';
// export { HeroSectionAlt as default } from './HeroSectionAlt';
```

```tsx
// ✅ Page imports from index — variant-agnostic
import HeroSection from '@/components/public/sections/hero';
// ❌ Never import a variant directly
import { HeroSection } from '@/components/public/sections/hero/HeroSection';
```

---

## API Layer

- Use `lib/api/public-api.ts` — separate Axios instance for public/customer requests
- Use `lib/api/public-hooks.ts` — `usePublicQuery` and `usePublicMutation`
- Query keys: `['public', 'section', id?]` — e.g. `['public', 'products']`, `['public', 'product', slug]`

---

## Rendering Strategy

| Page            | Strategy                      |
| --------------- | ----------------------------- |
| Homepage        | SSR or ISR (`revalidate: 60`) |
| Product listing | SSR or ISR                    |
| Product detail  | ISR (`revalidate: 300`)       |
| Category pages  | ISR (`revalidate: 300`)       |
| Cart            | Client-side only              |
| Checkout        | Client-side only              |
| Account pages   | Client-side only              |

---

## SEO — Every Public Page Must Have

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: `${product.name} | OttimoDirect`,
    // Strip HTML tags from rich-text description before using as meta
    description: product.description.replace(/<[^>]+>/g, '').slice(0, 160),
    openGraph: { images: [product.images[0]?.url] },
  };
}
```

- `title` and `description` on every page — never leave as default
- `og:image` on product and category pages
- JSON-LD structured data on product pages
- **Product `description` is HTML** — always strip tags with `.replace(/<[^>]+>/g, '')` before using in metadata or plain-text contexts

---

## Rich Text — Product Description

Product descriptions are stored as HTML strings (output of `AppRichEditor`).

- ✅ **Always use `RichContent`** to render them — never `dangerouslySetInnerHTML` directly
- ✅ `RichContent` sanitizes with DOMPurify automatically — no extra sanitization needed
- ❌ Never render `product.description` as plain text — it will show raw HTML tags

```tsx
import { RichContent } from '@/components/shared/text-editor/RichContent';

// In ProductDetail, ProductCard description preview, etc.
<RichContent
  html={product.description}
  className="text-sm text-muted-foreground"
/>;
```

---

## Images

- Always use `next/image` — never `<img>`
- Always provide `width` and `height` — never omit
- Use `priority` only on the hero/LCP image
- All other images use default lazy loading

---

## Icons — Animated First, Lucide Fallback

The public website uses **animated icons** from `components/ui/animated-icons/` as the primary icon source. These are interactive SVG icons powered by `motion/react` that animate on hover.

### Rules

1. **Always check `components/ui/animated-icons/` first.** If an animated version exists, use it.
2. **Fallback to `lucide-react`** only when no animated version is available.
3. **Never install another icon library** — only animated-icons and lucide-react are allowed.

### Import pattern

```tsx
// ✅ Animated icon available — use it

// ✅ No animated version — fall back to lucide-react
import { ChevronDown, FlaskConical } from 'lucide-react';
import { HeartIcon } from '@/components/ui/animated-icons/heart-icon';
import { SearchIcon } from '@/components/ui/animated-icons/search-icon';
import { ShoppingCartIcon } from '@/components/ui/animated-icons/shopping-cart-icon';
```

### Usage

```tsx
// Default — animates on hover automatically
<ShoppingCartIcon size={20} className="text-muted-foreground" />

// Static (decorative, no interaction) — disable animation
<MapPinIcon size={12} className="text-muted-foreground" isAnimated={false} />

// Parent-triggered animation (icon inside a wider button with text)
const ref = useRef<{ startAnimation: () => void; stopAnimation: () => void }>(null);
<button onMouseEnter={() => ref.current?.startAnimation()} onMouseLeave={() => ref.current?.stopAnimation()}>
  <MenuIcon ref={ref} size={16} isAnimated={false} />
  <span>Label</span>
</button>
```

### When to use which approach

| Scenario                             | Approach                                 |
| ------------------------------------ | ---------------------------------------- |
| Icon-only button (`size="icon"`)     | Default — icon self-animates on hover    |
| Icon inside a wider button with text | Ref approach — trigger from button hover |
| Purely decorative (no interaction)   | `isAnimated={false}`                     |
| No animated version exists           | Use `lucide-react`                       |

### Available animated icons

All files in `components/ui/animated-icons/` follow the naming pattern `{name}-icon.tsx` and export `{Name}Icon` + `{Name}IconHandle`.

---

## Theme & Colours

Same rules as admin — the public site inherits the theme from `GET /config` via the root layout automatically.

> **Tailwind v4 + oklch** — All colour tokens are CSS custom properties using the oklch colour space. Never write oklch values inline.

- Use semantic tokens only: `bg-background`, `text-foreground`, `bg-primary`, `border-border`
- Never hardcode colours: no `bg-white`, `text-gray-900`, `#hex`, `oklch(...)` inline
- Dark mode works automatically — no extra setup needed

---

## Localization

Same rules as admin:

- Namespace: `public.{section}.{key}` (e.g. `public.products.addToCart`)
- Add to ALL 3 files: `messages/en.json`, `messages/ar.json`, `messages/fr.json`
- Never hardcode English strings in JSX

---

## Currency

- Never hardcode currency symbols (`£`, `$`, `€`)
- Read currency from platform config: `GET /config → config.currency`
- Use a shared `useCurrency()` hook or pass currency as a prop

---

## Forms

Same pattern as admin:

- `Formik` + `Yup` for state and validation
- `usePublicMutation` for API calls
- Toast on success/error
- 422 errors → `setFieldError` for field-level display
- Loading state on submit button

---

## Loading & Error States

- Always show skeleton loaders while data is loading — never blank space
- Use `Suspense` boundaries around data-fetching sections
- API errors → user-friendly message + retry button
- Never show raw error messages or stack traces to customers
- 404 products → redirect to `/products` with a toast

---

## Authentication

- Customer JWT in localStorage (same CryptoJS encryption as admin)
- Separate store: `lib/stores/customer-auth-store.ts`
- Protected routes (`/account/*`, `/checkout`) redirect to `/login` if unauthenticated
- Never use admin auth store in public components

---

## Component Size

Same 200-line limit as admin. Split complex components into subfolders:

```
components/public/products/
  ProductDetail.tsx      — thin orchestrator
  ProductImages.tsx      — image gallery
  ProductInfo.tsx        — name, price, variants
  ProductReviews.tsx     — review list + form
  types.ts               — shared interfaces
```

---

## Quick Checklist Before Submitting Public Work

- [ ] No imports from `components/admin/`
- [ ] All images use `next/image` with dimensions
- [ ] All strings use `t('public.section.key')`
- [ ] All 3 message files updated
- [ ] All colours use semantic tokens
- [ ] Page has `generateMetadata()` or `export const metadata`
- [ ] Product description rendered with `<RichContent>`, not raw `dangerouslySetInnerHTML`
- [ ] Product description in metadata has HTML tags stripped: `.replace(/<[^>]+>/g, '')`
- [ ] Loading skeleton shown while data fetches
- [ ] Error state handled gracefully
- [ ] Currency read from config, not hardcoded
- [ ] Query keys use `['public', ...]` prefix
