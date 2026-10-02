# Agent Instructions

## MANDATORY: Read Before Implementing

Before writing any code or making any changes, you MUST:

1. **Read `docs/FRONTEND_GUIDE.md`** — Contains all admin API endpoints, response formats, authentication flow, and integration patterns. Every admin API call must match the endpoints and payload structures defined here.
2. **Read `docs/CUSTOMER_SITE_GUIDE.md`** — Contains all public/customer API endpoints, data shapes, and implementation patterns. Every public API call must match what is defined here. **Required before any work under `app/(public)/` or `components/public/`.**
3. **Read `docs/BULK_BUYER_GUIDE.md`** — Contains the bulk buyer & delivery system, tiered pricing, and COD access rules. **Required before any work on delivery fees, bulk pricing, checkout, or order placement.** References `docs/DELIVERY_SYSTEM_GUIDE.md` and `docs/TIERED_PRICING_QA_GUIDE.md` for detailed specs.
4. **Read `.kiro/steering/` files** (if any) — Contains project-specific steering rules and conventions.
5. **Read `.kiro/specs/`** — Contains requirements, design documents, and task lists for features being built.
6. **Read `.kiro/skills/`** — Contains skills; must use them before creating or updating anything.
7. **Read existing similar components** before building new ones — match the established pattern exactly.

### Implementation Order

When building features that span both admin and public (e.g. delivery system, bulk pricing, tiered pricing):

- **Admin first** — build the admin management UI (settings, configuration, CRUD) before the public-facing implementation.
- **Public second** — once admin is complete and tested, implement the customer-facing side using the same data models and API contracts.

---

## Skills — MANDATORY Before Any Implementation

This project has skills installed under `.agents/skills/`. **You must consult the relevant skill(s) before creating or updating any component, page, or data-fetching logic.** Never skip this step.

| Skill                           | Location                                        | When to use                                                                                                                                                         |
| ------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadcn`                        | `.agents/skills/shadcn/`                        | Any time you use, add, or modify a shadcn/ui component — check installed components, run `npx shadcn@latest docs <component>`, follow composition and styling rules |
| `next-best-practices`           | `.agents/skills/next-best-practices/`           | Any Next.js file — RSC boundaries, async params/cookies, metadata, image optimisation, error handling, Suspense, route handlers                                     |
| `tanstack-query-best-practices` | `.agents/skills/tanstack-query-best-practices/` | Any data fetching — query keys, stale/gc time, mutations, optimistic updates, cache invalidation, error boundaries                                                  |
| `frontend-design`               | `.agents/skills/frontend-design/`               | Building new pages or components from scratch — commit to a clear aesthetic direction, avoid generic AI aesthetics                                                  |
| `ui-ux-pro-max`                 | `.agents/skills/ui-ux-pro-max/`                 | Any UI structure, visual design, interaction pattern, or UX decision — color systems, typography, spacing, accessibility, layout                                    |

### How to apply

- Before writing a component → read `shadcn/SKILL.md` + `ui-ux-pro-max/SKILL.md`
- Before writing a page → read `next-best-practices/SKILL.md` + `frontend-design/SKILL.md`
- Before writing any query or mutation → read `tanstack-query-best-practices/SKILL.md`
- When in doubt → read all relevant skills first, then implement

**Never implement first and check skills later.** Skills define the correct patterns for this project.

### ⚠️ Theme & Colour Override — Project Rules Take Precedence

Skills (especially `shadcn`, `frontend-design`, and `ui-ux-pro-max`) may suggest their own theming approaches (CSS variable presets, colour palettes, `tailwind.config.js` tokens, inline colour values, etc.). **Ignore all of that for this project.**

This project has its own theme system. For anything theme or colour related, **only follow the rules in `AGENTS.md` (Colour Tokens & Theming section) and `.kiro/steering/themes.md`**. Specifically:

- ❌ Never apply a colour palette or theme suggested by a skill
- ❌ Never add CSS variables outside of `styles/themes/{id}.css` or `styles/globals.css`
- ❌ Never use `tailwind.config.js` — this project is Tailwind v4 CSS-first
- ❌ Never use colour values from skill examples inline in JSX/TSX
- ✅ Always use semantic tokens: `bg-primary`, `text-foreground`, `bg-muted`, etc.
- ✅ New themes must follow the 5-step process in `.kiro/steering/themes.md`

---

## Tech Stack

- Next.js App Router (TypeScript)
- Tailwind CSS **v4** — dark mode via `class` strategy; config is CSS-first (`@import "tailwindcss"` in `globals.css`, no `tailwind.config.js`); all design tokens defined via `@theme inline` using CSS custom properties
- Zustand — client/UI state
- @tanstack/react-query — all server state (fetching, caching, mutations)
- Formik + Yup — all forms and validation
- next-intl — i18n (EN, AR, FR)
- next-themes — light/dark theme
- recharts — charts
- lucide-react — icons (never use any other icon library)
- Animated icons (`components/ui/animated-icons/`) — interactive SVG icons for the public website (hover-animated, powered by `motion/react`). **Public site: use animated icons first, fall back to lucide-react if no animated version exists.** Admin site: continue using lucide-react only.
- Axios — HTTP via `adminApi` instance in `lib/api/admin-api.ts`
- shadcn/ui — UI primitives in `components/ui/`

---

## Project Structure

```
app/admin/              — Admin dashboard pages (one folder per section)
app/(auth)/             — Auth pages (login, reset password)
app/(public)/           — Public website pages (customer-facing)
  page.tsx              — Homepage
  products/             — Product listing & detail
  categories/           — Category pages
  cart/                 — Shopping cart
  checkout/             — Checkout flow
  account/              — Customer dashboard (auth required)
  layout.tsx            — Public layout (navbar, footer)
components/admin/       — Admin feature components (one subfolder per section)
  {section}/            — e.g. products/, orders/, categories/
    {Feature}List.tsx   — The main list/table component for the section
    {Feature}Detail.tsx — Detail view if needed
  forms/
    {Feature}Form.tsx   — Simple forms (single file if < 200 lines)
    {feature}/          — Split folder for complex multi-step forms
      types.ts          — All interfaces and constants for this form
      schema.ts         — Yup validation schema + pure helper functions
      {SubComponent}.tsx — One file per logical section/step
      {Feature}Form.tsx — Thin orchestrator — imports steps, renders Sheet
components/public/      — Public website components (NEVER import from components/admin/)
  layout/               — Navbar, Footer, MobileMenu
  home/                 — Hero, FeaturedProducts, BannerCarousel
  products/             — ProductCard, ProductGrid, ProductFilters, ProductDetail
  cart/                 — CartItem, CartSummary, CartDrawer
  checkout/             — CheckoutForm, OrderSummary, PaymentSection
  account/              — ProfileForm, OrderHistory, AddressBook, WishlistGrid
  common/               — Public-specific reusable components (Breadcrumb, Rating, etc.)
components/shared/      — Reusable components used across BOTH admin and public
components/ui/          — shadcn primitives only — never modify these
lib/api/
  admin-api.ts          — Axios instance (admin, authenticated)
  public-api.ts         — Axios instance (public, unauthenticated + customer auth)
  admin-hooks.ts        — useAdminQuery and useAdminMutation
  public-hooks.ts       — usePublicQuery and usePublicMutation
lib/stores/             — Zustand stores
lib/utils/              — Pure utility functions
constants/              — Static reference data used across the app (presets, enums, lookup tables)
config/                 — Sidebar config, route permissions, axios config
messages/               — en.json, ar.json, fr.json
types/                  — Shared TypeScript interfaces
```

---

## API Rules

- **Admin endpoints**: always use endpoints from `docs/FRONTEND_GUIDE.md` — never guess paths.
- **Public/customer endpoints**: always use endpoints from `docs/CUSTOMER_SITE_GUIDE.md` — never guess paths.
- **Delivery & pricing endpoints**: always use `docs/BULK_BUYER_GUIDE.md` for bulk buyer access, delivery fee calculation, tiered pricing, and COD rules. See also `docs/DELIVERY_SYSTEM_GUIDE.md` and `docs/TIERED_PRICING_QA_GUIDE.md` for detailed specs.
- **Response envelope**: backend returns `{ success: true, data: { ... } }`. Access via `response.data.X` or `(result as any)?.data?.X ?? (result as any)?.X`.
- **Exact field names**: `inventory` not `stock`, `discountedPrice` not `compareAtPrice`, `expiryDate` not `endDate`.
- **Order status**: `status` (fulfillment) and `paymentStatus` (payment) are separate fields — never combine.
- **Catalog prefix**: products, categories, coupons → `/catalog/` prefix.
- **Admin orders**: use `/orders/admin` not `/orders`.
- **Pagination shape**: `{ totalCount, totalPages, currentPage, perPage, hasNextPage, hasPrevPage }`.
- **Auth**: JWT in localStorage (encrypted with CryptoJS). Zustand store hydrates on app load.
- **Mutations**: always use `useAdminMutation` from `lib/api/admin-hooks.ts` — never call `adminApi` directly inside a component for mutations unless it's a multi-step flow that requires manual async control.
- **Cache invalidation**: after every mutation, invalidate the relevant list query AND the detail query if one exists.

---

## Component Size Rules

- **Hard limit: 200 lines per file.** If a component exceeds this, split it.
- **One responsibility per file.** A file should do one thing: render a list, render a form step, define types, etc.
- **Complex forms** (multi-step, many fields) must be split into a subfolder under `components/admin/forms/{feature}/`:
  - `types.ts` — interfaces, constants
  - `schema.ts` — Yup schema, pure helpers
  - One `.tsx` file per step or logical section
  - A thin orchestrator `{Feature}Form.tsx` that only wires steps together
  - The original `{Feature}Form.tsx` in `forms/` becomes a 1-line re-export so existing imports don't break
- **Never put types inline in a component file** if they are shared across multiple files — put them in `types.ts`.

---

## File & Folder Naming

- Folders: `kebab-case` (e.g. `bulk-buyers/`, `product/`)
- Component files: `PascalCase.tsx` (e.g. `ProductList.tsx`, `StepBasicInfo.tsx`)
- Non-component files: `camelCase.ts` (e.g. `types.ts`, `schema.ts`, `adminApi.ts`)
- Constants files: `camelCase.ts` in `constants/` (e.g. `constants/presetAttributes.ts`)
- One component per file — no barrel files that re-export many components

---

## Localization (MANDATORY)

Every user-facing string MUST be localized. Never hardcode English text in components.

1. **Add keys to ALL 3 files**: `messages/en.json`, `messages/ar.json`, `messages/fr.json` — in the same commit/change.
2. **Use `useTranslations()` hook** in every component that renders text.
3. **Namespace**: `admin.{section}.{key}` for admin pages (e.g. `admin.products.form.name`).
4. **Common keys**: reuse `common.*` for shared words (save, cancel, delete, edit, search, etc.).
5. **Never skip a language** — all 3 files must be updated together.
6. **Toast messages** must also be localized via `t('...')`.

### ⚠️ Dev server cache — CRITICAL

Next.js caches message files at startup. **After adding new i18n keys, always restart the dev server.** The browser will show `MISSING_MESSAGE` errors until the server is restarted — this is not a code bug.

```
# After adding keys to messages/*.json:
# Stop the dev server → restart it → hard refresh the browser
```

### Checklist before submitting any new component or page

- [ ] Every visible string uses `t('...')` — no hardcoded English
- [ ] Keys added to `messages/en.json`, `messages/ar.json`, `messages/fr.json`
- [ ] Namespace matches the section: `admin.orders.*`, `admin.products.*`, etc.
- [ ] New keys placed inside the correct section object — not at root level
- [ ] Dev server restarted after adding keys (to clear the message cache)
- [ ] No duplicate keys in the same namespace

---

## Colour Tokens & Theming (MANDATORY — NO EXCEPTIONS)

This project has a runtime theme system. Every colour in every component **must** use a semantic Tailwind token. Hardcoded colours break all non-default themes.

> **Tailwind v4 + oklch** — This project uses Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`). All colour tokens are defined as CSS custom properties in `globals.css` using the **oklch** colour space (e.g. `oklch(0.55 0.20 200)`). Never write oklch values inline in JSX/TSX — always reference them via semantic tokens.

### Token reference — memorise this table

| ❌ FORBIDDEN                       | ✅ REQUIRED                                   |
| ---------------------------------- | --------------------------------------------- |
| `bg-white`                         | `bg-background` or `bg-card`                  |
| `bg-gray-50` / `bg-gray-100`       | `bg-muted`                                    |
| `bg-gray-200`                      | `bg-muted` or `bg-accent`                     |
| `text-black` / `text-gray-900`     | `text-foreground`                             |
| `text-gray-500` / `text-gray-400`  | `text-muted-foreground`                       |
| `border-gray-*`                    | `border-border`                               |
| `hover:bg-gray-100`                | `hover:bg-muted` or `hover:bg-accent`         |
| `bg-blue-600` / `bg-blue-500`      | `bg-primary`                                  |
| `text-blue-600` / `text-blue-500`  | `text-primary`                                |
| `bg-red-500` / `bg-red-600`        | `bg-destructive`                              |
| `text-red-500`                     | `text-destructive`                            |
| `ring-gray-*`                      | `ring-border`                                 |
| `shadow-*` with hardcoded colours  | `shadow-sm`, `shadow-md` etc. (uses CSS vars) |
| Any hex `#xxxxxx` inline           | Never — use tokens only                       |
| Any `oklch(...)` inline in JSX/TSX | Never — use tokens only                       |
| `style={{ color: '...' }}`         | Never — use Tailwind tokens                   |
| `style={{ background: '...' }}`    | Never — use Tailwind tokens                   |

### Coloured status badges — always include dark variants

```
bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400
bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400
bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400
bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400
bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400
```

These fixed palette colours (green, red, yellow, blue, purple) are acceptable for semantic status indicators only — not for general UI elements.

### Theme architecture

```
styles/globals.css          ← @imports (themes first), :root (default light), .dark (default dark), @theme inline
styles/themes/{name}.css    ← one file per theme — :root[data-theme] + :root.dark[data-theme]
constants/themes.ts         ← id, label, preview swatches ONLY
lib/utils/applyTheme.ts     ← removeAttribute('data-theme') for default, setAttribute for others
components/provider/ColorThemeProvider.tsx
components/admin/settings/ThemePicker.tsx
app/layout.tsx              ← sets data-theme server-side to prevent flash
```

### CSS specificity — CRITICAL

Theme selectors MUST use `:root[data-theme="x"]` not `[data-theme="x"]`.

`:root` has specificity `(0,1,0)`. Plain `[data-theme="x"]` also has `(0,1,0)`. Since theme files are imported before `:root` in `globals.css`, `:root` would override themes in light mode. Using `:root[data-theme="x"]` gives `(0,2,0)` which always wins.

```css
/* ✅ CORRECT */
:root[data-theme='mytheme'] {
  --primary: oklch(...);
}
:root.dark[data-theme='mytheme'] {
  --primary: oklch(...);
}

/* ❌ WRONG — overridden by :root in light mode */
[data-theme='mytheme'] {
  --primary: oklch(...);
}
```

### Adding a new theme — all 5 steps required

1. Get CSS from [tweakcn.com/community](https://tweakcn.com/community)
2. Create `styles/themes/{id}.css` — replace `:root {` → `:root[data-theme="{id}"] {` and `.dark {` → `:root.dark[data-theme="{id}"] {`
3. Add `@import "./themes/{id}.css";` to `styles/globals.css`
4. Add entry to `THEMES` in `constants/themes.ts` with `id`, `label`, and preview colour values
5. Add the new id to the valid themes array in the backend `PUT /config` handler

See `THEMES.md` for full documentation with complete examples.

### When a user pastes a tweakcn theme — agent instructions

If the user sends CSS that looks like this (a tweakcn export):

```css
:root {
  --background: oklch(...);
  --primary: oklch(...);
  ...
}
.dark {
  --background: oklch(...);
  --primary: oklch(...);
  ...
}
```

**Do all 5 steps automatically without asking.** The agent must:

**Step 1 — Determine the theme ID**

- If the user gave a name (e.g. "add this as sapphire"), use that as the id: `sapphire`
- If no name given, infer one from the primary colour hue or ask once: "What should I call this theme?"
- ID must be: lowercase, no spaces, no special chars (e.g. `midnight`, `coral`, `slate-blue`)

**Step 2 — Create `styles/themes/{id}.css`**

Transform the CSS exactly as follows:

- Replace `:root {` → `:root[data-theme="{id}"] {`
- Replace `.dark {` → `:root.dark[data-theme="{id}"] {`
- Keep every variable exactly as-is — do not modify values
- Add a comment header: `/* ── {Label} ─── */`

```css
/* ── Sapphire ──────────────────────────────────────────────── */
:root[data-theme='sapphire'] {
  /* paste all :root variables verbatim */
}

:root.dark[data-theme='sapphire'] {
  /* paste all .dark variables verbatim */
}
```

**Step 3 — Add `@import` to `styles/globals.css`**

Append one line to the existing imports block at the top:

```css
@import './themes/sapphire.css';
```

**Step 4 — Add entry to `constants/themes.ts`**

Read the `--primary`, `--background`, `--sidebar`, `--card`, `--muted`, `--border`, `--foreground`, `--muted-foreground`, and `--radius` values from the `:root` block of the pasted CSS. Use them as preview values:

```ts
{
  id: 'sapphire',
  label: 'Sapphire',
  previewPrimary: '<value of --primary from :root block>',
  previewBackground: '<value of --background from :root block>',
  previewSidebar: '<value of --sidebar from :root block>',
  previewCard: '<value of --card from :root block>',
  previewMuted: '<value of --muted from :root block>',
  previewBorder: '<value of --border from :root block>',
  previewForeground: '<value of --foreground from :root block>',
  previewMutedForeground: '<value of --muted-foreground from :root block>',
  previewRadius: '<value of --radius from :root block>',
},
```

**Step 5 — Remind about backend**

After completing steps 1–4, tell the user:

> "Add `'sapphire'` to the valid themes array in the backend `PUT /config` handler to complete the setup."

**What NOT to do when a user pastes a theme:**

- ❌ Do not ask "are you sure?" or "should I proceed?" — just do it
- ❌ Do not modify any CSS variable values — paste them verbatim
- ❌ Do not add `@layer` or wrap in any other CSS construct
- ❌ Do not skip the `constants/themes.ts` update — the picker won't show the theme without it
- ❌ Do not use `[data-theme="x"]` selectors — always `:root[data-theme="x"]`

### Theme rules — no exceptions

- ❌ Never inject CSS variables via JS (`element.style.setProperty`)
- ❌ Never add theme CSS blocks directly in `globals.css` — each theme gets its own file
- ❌ Never store colour values in `constants/themes.ts` — only metadata
- ❌ Never use hardcoded colours anywhere in JSX, TSX, or inline styles
- ❌ Never use `[data-theme="x"]` selectors — always use `:root[data-theme="x"]`
- ✅ `applyTheme('default')` removes `data-theme` entirely — `:root` applies cleanly
- ✅ `applyTheme('ocean')` sets `data-theme="ocean"` — `:root[data-theme="ocean"]` wins
- ✅ Missing variables in a theme file fall back to `:root` automatically

---

## Shared Components (Always Reuse — Never Rebuild)

Before writing any UI element, check if a shared component already exists:

| Component         | Use for                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| `AppButton`       | Every button — variants: `primary`, `secondary`, `mute`, `green`, `red`                              |
| `AppPagination`   | All paginated tables                                                                                 |
| `GlobalFilters`   | Filter bars (search input, select dropdowns, date range)                                             |
| `TableHeaderCell` | Sortable column headers                                                                              |
| `TableShimmer`    | Loading skeleton rows in tables                                                                      |
| `NoDataFound`     | Empty state for tables and lists                                                                     |
| `AppAlertDialog`  | All delete/destructive confirmations — never `window.confirm`                                        |
| `DownloadButtons` | PDF + Excel export buttons                                                                           |
| `Sheet`           | Right-side drawer for all create/edit forms                                                          |
| `Switch`          | Toggle controls                                                                                      |
| `AppRichEditor`   | Any rich-text input field (product description, etc.) — never use `<Textarea>` for long-form content |
| `RichContent`     | Rendering saved rich-text HTML — always use this, never `dangerouslySetInnerHTML` directly           |

---

## Rich Text — MANDATORY Rules

This project uses **Tiptap v3** for rich-text editing. All packages are already installed — never add another rich-text library.

### Components

| Component       | Location                                          | Purpose                                                             |
| --------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| `AppRichEditor` | `components/shared/text-editor/AppRichEditor.tsx` | Rich-text input — use in forms wherever long-form content is needed |
| `RichContent`   | `components/shared/text-editor/RichContent.tsx`   | Safe HTML renderer — use wherever saved rich-text is displayed      |

### AppRichEditor — usage

```tsx
import AppRichEditor from '@/components/shared/text-editor/AppRichEditor';

// In a Formik form — wire via setFieldValue, NOT handleChange
<AppRichEditor
  value={values.description}
  onChange={(html) => setFieldValue('description', html)}
  placeholder="Write a description…"
/>;
```

- Outputs an HTML string — store it as-is in the field value
- Emits `''` (not `'<p></p>'`) when empty — Yup `required()` validation works correctly
- Pass `disabled={isSaving}` to lock the editor during form submission
- `immediatelyRender: false` is set internally — do not override, it prevents Next.js hydration errors

### RichContent — usage

```tsx
import { RichContent } from '@/components/shared/text-editor/RichContent';

// Basic usage
<RichContent html={product.description} />

// With extra classes
<RichContent html={product.description} className="text-sm text-muted-foreground" />
```

- Sanitizes HTML with **DOMPurify** before rendering — prevents XSS
- Returns `null` when content is empty — safe to render unconditionally
- Prose styles (headings, lists, links, blockquotes) are built-in and match the editor output

### Rules — no exceptions

- ❌ **Never use `<Textarea>` for product descriptions or any long-form content** — use `AppRichEditor`
- ❌ **Never use `dangerouslySetInnerHTML` directly** for rich-text output — always use `RichContent`
- ❌ **Never install another rich-text library** — Tiptap is the standard for this project
- ❌ **Never call `DOMPurify.sanitize()` inline in a component** — use `RichContent` which handles it
- ✅ The backend stores description as a plain HTML string — no backend changes needed
- ✅ `RichContent` is safe to use in both admin and public components (`components/shared/`)
- ✅ For `generateMetadata()` on public pages, strip HTML tags before using description as meta: `description.replace(/<[^>]+>/g, '').slice(0, 160)`

### Fields that use rich text

| Field         | Form                                  | Editor          |
| ------------- | ------------------------------------- | --------------- |
| `description` | Product create/edit (`StepBasicInfo`) | `AppRichEditor` |

Add to this table whenever a new rich-text field is introduced.

---

## UI Patterns (MUST Follow)

### Admin Routing & Breadcrumb Rules — MANDATORY

The admin uses **Next.js App Router**. Follow these rules strictly for every new page:

#### List pages — single `page.tsx`

Simple sections with no drill-in stay as a single file:

```
app/admin/orders/page.tsx        ← list only
app/admin/products/page.tsx      ← list only
```

#### Detail pages — dynamic route `[id]/page.tsx`

Any time a user clicks a row to view full details, use a **dynamic route**, not client-side state swap:

```
app/admin/orders/[orderId]/page.tsx     ✅ CORRECT
app/admin/orders/page.tsx (with useState selectedOrder)  ❌ WRONG
```

**Why:** Dynamic routes give you a real URL — shareable, bookmarkable, browser back works, and the breadcrumb in `AdminHeader` auto-generates from the path.

#### Breadcrumb — automatic, no manual implementation needed

`AdminHeader` auto-generates breadcrumbs from `usePathname()`. You get this for free:

```
/admin/orders              → Admin / Orders
/admin/orders/ORD-ABC123   → Admin / Orders / ORD-ABC123
/admin/products/prod-123   → Admin / Products / prod-123
```

**Rules:**

- ❌ Never add a manual breadcrumb `<nav>` inside a page or component — the header handles it
- ❌ Never add a back button to detail pages — the breadcrumb "Orders" link is the back navigation
- ✅ Order IDs and other ID-like segments are preserved as-is (not title-cased)
- ✅ All breadcrumb segments except the last are clickable links via `router.push`

#### Detail page pattern

Every detail page (`app/admin/[section]/[id]/page.tsx`) must:

1. Use `use(params)` to unwrap the async params (Next.js 15+)
2. Fetch its own data via `useAdminQuery` with `adminQueryKeys.sectionDetail(id)`
3. Show a skeleton loader while loading
4. Show a "not found" state on 404/error
5. Invalidate both the detail key and the list key after mutations
6. No back button — breadcrumb handles navigation

```tsx
// ✅ Correct detail page pattern
export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { data, isLoading, isError } = useAdminQuery(
    adminQueryKeys.orderDetail(orderId),
    `/orders/admin/${orderId}`,
  );
  // render skeleton / error / detail
}
```

#### Adding a new detail query key

Always add to `lib/api/admin-query-keys.ts`:

```ts
productDetail: (id: string) => ['admin', 'product-detail', id] as const,
orderDetail: (id: string) => ['admin', 'order-detail', id] as const,
```

---

### Admin List Page Structure

Every admin list page follows this exact order:

```
Page Header (title + action button)
  ↓
GlobalFilters (search, select filters, date range)
  ↓
DownloadButtons (PDF + Excel export)
  ↓
Table
  └── TableHeader (TableHeaderCell per column)
  └── TableBody
        ├── TableShimmer   (while loading)
        ├── NoDataFound    (when empty)
        └── rows           (data)
  ↓
AppPagination (rows-per-page selector + page navigation)
```

### Form Pattern (Sheet Drawer)

All create/edit forms:

- Rendered inside a `Sheet` (right-side drawer)
- `Formik` for form state + `Yup` for validation schema
- `useAdminMutation` for API calls
- Toast on success and error
- `queryClient.invalidateQueries` after every successful mutation
- 422 validation errors mapped to Formik field-level errors via `setFieldError`
- Loading state on submit button via `isLoading` prop on `AppButton`

### Delete Pattern

- `AppAlertDialog` for confirmation — always show the item name in the subtitle
- `loading` prop on the dialog for spinner during deletion
- Show the backend error message on failure (not a generic string)

### Multi-Step Form Pattern

When a form has 3+ steps or 200+ lines:

- Use `StepperIndicator` component for step navigation
- Each step is a separate component file
- Steps communicate via props/callbacks — no shared global state
- In edit mode, all steps are clickable (jump navigation)
- Each step handles its own API call and cache invalidation

---

## Constants & Static Data

- All static reference data (presets, enums, lookup tables, option lists) goes in `constants/`.
- Import using the `@/constants/` alias — never relative paths like `../../../../`.
- Example: `constants/presetAttributes.ts` — attribute presets for product variants.
- Never hardcode option arrays inline inside components — extract to `constants/`.

---

## State Management Rules

- **Server state** (anything from the API): use `useAdminQuery` / `useAdminMutation` from `lib/api/admin-hooks.ts`.
- **Client/UI state** (open/close, selected tab, form dirty): use `useState` locally or Zustand if shared across routes.
- **Never use Zustand for server data** — that's what react-query cache is for.
- **Query keys**: always use the array format `['admin', 'section', id?]` — e.g. `['admin', 'products']`, `['admin', 'product-detail', productId]`.
- **After mutations**: invalidate both the list key and the detail key when both exist.

---

## Import Rules

- Always use `@/` path alias — never relative paths that go up more than one level (`../../` is acceptable inside the same feature folder, `../../../../` is not).
- Import order: external packages → internal `@/lib`, `@/hooks`, `@/types` → internal `@/components` → local `./` files.
- Never import from `components/ui/` directly in page files — wrap in a shared or feature component first.

---

## TypeScript Rules

- No `any` unless wrapping an untyped third-party response — and even then, add a comment explaining why.
- All component props must have an explicit interface (not inline type).
- Shared interfaces go in `types.ts` (feature-level) or `types/` (global).
- Never use `as unknown as X` — fix the type properly.
- API response types: define the shape, use `(result as any)?.data?.X` only for the backend envelope unwrapping pattern that is already established.

---

## Cache Invalidation Rules

After any mutation, invalidate:

- The **list query** for that resource: `['admin', 'products']`
- The **detail query** if one exists: `['admin', 'product-detail', id]`
- Any **related resource** that embeds this data (e.g. updating product images → invalidate product detail so variant image picker stays fresh)

---

## Public Website Rules (MANDATORY — applies to all app/(public)/ work)

The public website is a customer-facing storefront. It shares the root layout (theme, i18n, providers) with the admin but is completely independent in components, API hooks, and state.

### Separation of concerns — HARD RULES

- ❌ **Never import from `components/admin/`** in any public page or component
- ❌ **Never import admin API hooks** (`useAdminQuery`, `useAdminMutation`) in public code
- ❌ **Never import admin Zustand stores** in public code
- ✅ `components/shared/` — safe to use in both admin and public
- ✅ `components/ui/` (shadcn) — safe to use everywhere
- ✅ `lib/utils/` — safe to use everywhere
- ✅ `constants/` — safe to use everywhere
- ✅ `types/` — safe to use everywhere

### Component location

All public-facing components go in `components/public/` organised by feature:

```
components/public/
  layout/       — Navbar, Footer, MobileMenu, Breadcrumb
  home/         — Hero, FeaturedProducts, BannerCarousel, CategoryGrid
  products/     — ProductCard, ProductGrid, ProductFilters, ProductDetail,
                  VariantSelector, ImageGallery, ReviewList, ReviewForm
  cart/         — CartItem, CartSummary, CartDrawer, EmptyCart
  checkout/     — CheckoutForm, OrderSummary, PaymentSection, AddressSelector
  account/      — ProfileForm, OrderHistory, OrderDetail, AddressBook,
                  WishlistGrid, WishlistItem
  common/       — Rating, PriceDisplay, StockBadge, QuantityInput,
                  ProductSkeleton, EmptyState
```

### API layer

Public pages use a separate Axios instance and hooks:

- `lib/api/public-api.ts` — unauthenticated requests + customer JWT
- `lib/api/public-hooks.ts` — `usePublicQuery` and `usePublicMutation`
- Query keys use `['public', 'section', id?]` format — e.g. `['public', 'products']`, `['public', 'product', slug]`
- Never mix `['admin', ...]` and `['public', ...]` query keys

### Rendering strategy

Choose the right rendering per page type:

| Page            | Strategy                      | Why                                   |
| --------------- | ----------------------------- | ------------------------------------- |
| Homepage        | SSR or ISR (`revalidate: 60`) | SEO + fresh banners/featured products |
| Product listing | SSR or ISR                    | SEO + filters in URL                  |
| Product detail  | ISR (`revalidate: 300`)       | SEO critical, changes infrequently    |
| Category pages  | ISR (`revalidate: 300`)       | SEO                                   |
| Cart            | Client-side only              | User-specific, no SEO value           |
| Checkout        | Client-side only              | Auth required, no SEO value           |
| Account pages   | Client-side only              | Auth required, no SEO value           |

Use `next/image` for ALL product and banner images — never `<img>` tags.

### SEO requirements

Every public page MUST have:

- `generateMetadata()` or `export const metadata` with `title` and `description`
- Meaningful `title` — never leave as the default "OttimoDirect Admin"
- `og:image` for product and category pages
- Structured data (JSON-LD) for product pages

```tsx
// ✅ Every public page
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: `${product.name} | OttimoDirect`,
    description: product.description.slice(0, 160),
    openGraph: { images: [product.images[0]?.url] },
  };
}
```

### Performance requirements

- Use `next/image` with explicit `width` and `height` — never omit dimensions
- Use `loading="lazy"` on below-the-fold images (next/image does this by default)
- Use `priority` only on the hero/LCP image
- Paginate product lists — never load all products at once
- Use `Suspense` boundaries around data-fetching sections
- Skeleton loaders for all async content — never show blank space while loading

### Forms on the public site

Public forms (checkout, login, register, address, review) follow the same pattern as admin:

- `Formik` + `Yup` for form state and validation
- `usePublicMutation` for API calls
- Toast on success/error
- 422 errors mapped to field-level errors via `setFieldError`
- Loading state on submit button

### Authentication — public site

- Customer JWT stored in localStorage (same CryptoJS encryption as admin)
- Separate Zustand store: `lib/stores/customer-auth-store.ts`
- Protected routes (`/account/*`, `/checkout`) redirect to `/login` if not authenticated
- Never use admin auth store in public components

### Localization — public site

Same rules as admin — all strings must be localized:

- Namespace: `public.{section}.{key}` (e.g. `public.products.addToCart`, `public.checkout.placeOrder`)
- Add to ALL 3 message files: `en.json`, `ar.json`, `fr.json`
- RTL layout works automatically via `dir` attribute on `<html>` set in root layout

### Theme — public site

The public site inherits the theme from `GET /config` via the root layout — no extra setup needed. All the same rules apply:

- Use semantic tokens only (`bg-background`, `text-foreground`, `bg-primary`)
- Never hardcode colours
- Dark mode works automatically if enabled

### Public page patterns

**Product card:**

```tsx
// Always show: image, name, price, discounted price, stock status
// Use next/image, semantic tokens, localized strings
// Link to /products/{slug}
```

**Price display:**

```tsx
// Always show discountedPrice if present, strike through original
// Use currency from platform config (GET /config → config.currency)
// Never hardcode currency symbol
```

**Loading states:**

- Product grid loading → `ProductSkeleton` repeated N times
- Product detail loading → full-page skeleton
- Never show empty content while loading

**Error states:**

- API errors → user-friendly message with retry button
- 404 products → redirect to /products with a toast
- Never show raw error messages to customers

### Public site — What NOT to Do

- ❌ Never import from `components/admin/`
- ❌ Never use `useAdminQuery` or `useAdminMutation`
- ❌ Never use `['admin', ...]` query keys
- ❌ Never use `<img>` — always `next/image`
- ❌ Never hardcode currency symbols — read from config
- ❌ Never hardcode colours — use semantic tokens
- ❌ Never skip metadata/SEO on public pages
- ❌ Never show raw API error messages to customers
- ❌ Never load all products without pagination
- ❌ Never skip skeleton loaders — always show loading state
- ❌ Never skip localization — all strings in message files

---

## Public Website Build Rules (MANDATORY — read `docs/CUSTOMER_SITE_GUIDE.md` first)

> **Before implementing any public page or component, read `docs/CUSTOMER_SITE_GUIDE.md`.** It defines every endpoint, payload shape, and response format. Never guess.
> For delivery fees, bulk pricing, and checkout logic, also read `docs/BULK_BUYER_GUIDE.md` (references `docs/DELIVERY_SYSTEM_GUIDE.md` and `docs/TIERED_PRICING_QA_GUIDE.md`).

### Domain — Chemical Products Ecommerce

OttimoDirect is a **B2B/B2C chemical products platform** (adhesives, resins, coatings, solvents, etc.). Design and implementation must reflect this:

- Products are industrial/technical — variants are typically volume, size, or concentration
- Bulk pricing tiers are a first-class feature — always display them prominently on product detail
- Trust signals are critical: stock status, ratings, certifications, safety data in descriptions
- The site must feel **professional, precise, and trustworthy** — not generic retail
- Customers include procurement teams and bulk buyers — B2B UX patterns apply

### UX Priorities (in order)

1. Product findability — search, filters, category nav must be fast and accurate
2. Variant clarity — users must always know exactly what they are buying (SKU, volume, concentration)
3. Pricing transparency — effective price, original price, bulk tiers, currency — all visible
4. Trust — ratings, reviews, stock status, delivery estimates
5. Checkout speed — minimal friction, saved addresses, clear order summary

### Pre-Implementation Checklist

Before writing any public page or component:

- [ ] Read `docs/CUSTOMER_SITE_GUIDE.md` for the relevant section
- [ ] Read `.agents/skills/frontend-design/SKILL.md` — commit to aesthetic direction first
- [ ] Read `.agents/skills/next-best-practices/SKILL.md` — RSC, async params, Suspense, metadata
- [ ] Read `.agents/skills/tanstack-query-best-practices/SKILL.md` — query keys, stale time, mutations
- [ ] Read `.agents/skills/shadcn/SKILL.md` — check installed components before building new UI
- [ ] Read existing similar components in `components/public/` — match the established pattern

### API Endpoints — Quick Reference

> Full request/response shapes are in `docs/CUSTOMER_SITE_GUIDE.md`. This is a navigation aid only.

**Auth:** `POST /auth/register` · `POST /auth/login` · `GET /auth/google` · `POST /auth/refresh-token` · `POST /auth/logout`

**Homepage:** `GET /catalog/products?isFeatured=true&limit=8` · `GET /catalog/categories` · `GET /banners`

**Product listing:** `GET /catalog/products` — params: `page`, `limit`, `category`, `search`, `sortBy`, `minPrice`, `maxPrice`, `inStock`, `featured`, `attributes[Key]=val1,val2`

- Response includes `products[]`, `pagination`, `availableFilters` (attributes + priceRange)
- ⚠️ Never send `?includeAll=false` — omit entirely for storefront requests

**Product detail:** `GET /catalog/products/:idOrSlug` (returns `variants[]`) · `GET /catalog/products/:productId/reviews` · `POST /catalog/products/:productId/reviews`

**Cart:** `GET /orders/cart` · `POST /orders/cart` (requires `productId`, `variantId`, `quantity`) · `PUT /orders/cart/:itemId` · `DELETE /orders/cart/:itemId` · `DELETE /orders/cart`

- ⚠️ Cart PUT/DELETE use the cart item `_id` — never `productId` or `variantId`

**Wishlist (auth):** `GET /wishlist` · `POST /wishlist` (`{ productId }`) · `DELETE /wishlist/:itemId` · `GET /wishlist/check/:productId`

**Checkout:** `POST /coupons/validate` · `GET /users/addresses` · `POST /orders/delivery-fee` · `POST /orders` (`{ addressId, paymentMethod, couponCode? }`)

- ⚠️ Rate-limited to 5 req/min. On `429`: "Too many checkout attempts. Please wait a moment and try again."

**Orders:** `GET /orders` · `GET /orders/:orderId` · `GET /orders/guest/:orderId?email=...` · `POST /orders/:orderId/cancel` · `POST /orders/:orderId/reorder`

**Account (auth):** `GET /users/profile` · `PUT /users/profile` · `PUT /users/change-password` · `POST /users/addresses` · `PUT /users/addresses/:id` · `DELETE /users/addresses/:id` · `PUT /users/addresses/:id/default`

**Support (auth):** `POST /support/tickets` · `GET /support/tickets` · `GET /support/tickets/:ticketId` · `POST /support/tickets/:ticketId/messages`

**Real-time:** `GET /notifications/stream` (SSE, `withCredentials: true`) — events: `order_status_updated`, `order_delivered`, `order_cancelled`, `payment_confirmed`, `ticket_reply`, `notification`

### Query Key Reference

| Resource          | Key                                          |
| ----------------- | -------------------------------------------- |
| Featured products | `['public', 'featured-products']`            |
| Banners           | `['public', 'banners']`                      |
| Category tree     | `['public', 'categories']`                   |
| Product listing   | `['public', 'products', searchParamsString]` |
| Product detail    | `['public', 'product', slug]`                |
| Cart              | `['public', 'cart']`                         |
| Wishlist          | `['public', 'wishlist']`                     |
| Wishlist check    | `['public', 'wishlist-check', productId]`    |
| Orders list       | `['public', 'orders']`                       |
| Order detail      | `['public', 'order', orderId]`               |
| User profile      | `['public', 'profile']`                      |
| User addresses    | `['public', 'addresses']`                    |
| Reviews           | `['public', 'reviews', productId]`           |
| Support tickets   | `['public', 'tickets']`                      |
| Ticket detail     | `['public', 'ticket', ticketId]`             |
| Platform config   | `['public', 'config']`                       |

### Critical Data Model Rules

1. **All products are variant-based.** No simple products. Every add-to-cart requires a `variantId`.
2. **Price lives on the variant.** `Product` has no `price` field. Use `variant.effectivePrice` (`discountedPrice ?? price`).
3. **Cart item identity.** PUT/DELETE use the cart item `_id` — NOT `productId` or `variantId`.
4. **Wishlist is product-only.** Tracks products, not specific variants.
5. **`variants[]` only on detail endpoint.** Listing returns only `minPrice`, `inventory`, `available`.
6. **`minPrice` can be `null`** — handle gracefully on product cards.
7. **`frequentlyBoughtTogether`** is an array of raw product IDs — fetch each separately.
8. **Bulk pricing** — check `variant.bulkPricing`; apply when `quantity >= minQuantity`.
9. **`effectivePrice`** is pre-calculated by the backend — always use it, never recalculate.
10. **Response envelope** — `{ success: true, data: { ... } }`. Access via `res.data.data`.

### Page Routes

```
app/(public)/
  layout.tsx                    — Navbar, Footer, SSE listener (auth only)
  page.tsx                      — Homepage (ISR revalidate: 60)
  products/page.tsx             — Product listing (SSR, URL-driven filters)
  products/[slug]/page.tsx      — Product detail (ISR revalidate: 300)
  categories/[slug]/page.tsx    — Category page (ISR revalidate: 300)
  cart/page.tsx                 — Cart (client-side only)
  checkout/page.tsx             — Checkout (client-side only)
  orders/page.tsx               — Order history (client-side, auth required)
  orders/[orderId]/page.tsx     — Order detail (client-side)
  orders/[orderId]/confirmation/page.tsx
  account/page.tsx              — Account dashboard (client-side, auth required)
  account/profile/page.tsx
  account/addresses/page.tsx
  account/wishlist/page.tsx
  account/support/page.tsx
  account/support/[ticketId]/page.tsx
  login/page.tsx · register/page.tsx · forgot-password/page.tsx
  order-lookup/page.tsx         — Guest order lookup
```

### Component Architecture

```
components/public/
  sections/   — page sections, each in its own folder with variant support
  layout/     — Navbar, NavbarSearch, MobileMenu, Footer, Breadcrumb
  products/   — ProductCard, ProductGrid, ProductFilters, SortSelector
              ProductDetail/ (split subfolder — orchestrator + sub-components)
                index.tsx, ProductImages, ProductInfo, VariantSelector,
                PriceDisplay, AddToCartSection, BulkPricingTable,
                ReviewSection, FrequentlyBought
  cart/       CartDrawer, CartItem, CartSummary, EmptyCart
  checkout/   CheckoutLayout, CouponInput, AddressSelector, AddressForm,
              DeliveryFeeDisplay, PaymentSelector, StripePaymentForm,
              OrderSummaryPanel
  account/    AccountNav, ProfileForm, PasswordForm, OrderHistory,
              OrderDetail, AddressBook, WishlistGrid,
              SupportTicketList, SupportTicketDetail
  common/     Rating, PriceDisplay, StockBadge, QuantityInput,
              ProductSkeleton, PageSkeleton, EmptyState, CurrencyDisplay
```

### Section-Based Architecture — MANDATORY

Every page section lives in `components/public/sections/{name}/`. Each folder has:

```
sections/hero/
  HeroSection.tsx           — default variant (data fetching + UI)
  HeroSection.types.ts      — shared props interface
  HeroSectionAlt.tsx        — alternate variant (same interface, different design)
  index.ts                  — re-exports the active variant
```

**Core rules:**

- Pages import from `index.ts` only — never from a variant file directly
- All variants implement the same props interface from `*.types.ts`
- Sections own their data fetching (`usePublicQuery`) — pages are thin composers
- `index.ts` is the only place to switch variants — pages need zero changes
- Stateless primitives (ProductCard, Rating, etc.) → `common/`, not `sections/`
- Layout components (Navbar, Footer) → `layout/`, not `sections/`

```ts
// index.ts — the only switch point
export { HeroSection as default } from './HeroSection';
// To activate alternate: export { HeroSectionAlt as default } from './HeroSectionAlt';
```

```tsx
// ✅ Page is variant-agnostic
import HeroSection from '@/components/public/sections/hero';
// ❌ Never import a variant directly
import { HeroSection } from '@/components/public/sections/hero/HeroSection';
```

**Adding a new section:**

1. Create `sections/{name}/` folder
2. Write `{Name}Section.types.ts` — props interface first
3. Write `{Name}Section.tsx` — default variant
4. Write `index.ts` — re-export default

**Adding a variant:**

1. Write `{Name}SectionAlt.tsx` using the same props interface
2. Update `index.ts` to export the new variant
3. Pages need no changes

### Variant Selector Rules

- One button group per `variantAttribute` key (e.g. "Volume", "Concentration")
- Button is **disabled + strikethrough** if no available variant matches that value given current selections
- Only resolve `selectedVariant` when ALL attribute keys have a selection
- Add to Cart must be disabled when `selectedVariant === null` or `!selectedVariant.available`
- Show `variant.imageUrl` in the gallery when it has one

### Price Display Rules

```
variant.effectivePrice  → always the main displayed price
variant.price           → show with line-through ONLY when discountedPrice !== null
variant.bulkPricing     → show tier table; apply when quantity >= minQuantity
product.minPrice        → use on cards — prefix with "From"
```

- Never hardcode currency symbols — read from `GET /config → config.currency`
- Use `CurrencyDisplay` component for all price rendering

### Checkout Flow

```
Step 1: Review cart + apply coupon (optional)
Step 2: Select or add delivery address
Step 3: Review delivery fee + order summary
Step 4: Select payment method (Stripe / COD)
Step 5a (Stripe): Confirm with Stripe Elements
Step 5b (COD): Place order → redirect to confirmation
```

- After successful order: clear cart, redirect to `/orders/:orderId/confirmation`
- Stripe: use `@stripe/stripe-js` + `@stripe/react-stripe-js` only — never other payment libraries

### Authentication Rules

- Customer auth is completely separate from admin auth
- Store: `lib/stores/customer-auth-store.ts` — never use admin auth store
- Protected routes (`/account/*`, `/checkout`) → redirect to `/login?redirect=<path>` if unauthenticated
- On `401`: attempt `POST /auth/refresh-token` once → if fails, redirect to `/login?session=expired`
- Google OAuth: redirect to `GET /auth/google` — no frontend token handling needed

### Real-time (SSE) Rules

- Connect to `GET /notifications/stream` only when authenticated
- Use `EventSource` with `withCredentials: true`; reconnect after 5 seconds on error
- Disconnect on logout
- Show toast for: `order_status_updated`, `order_delivered`, `order_cancelled`, `payment_confirmed`, `ticket_reply`
- Invalidate relevant react-query caches on order/ticket events

### SEO — Product JSON-LD

Always add to product detail pages:

```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description.replace(/<[^>]+>/g, ''),
  image: product.images.map((img) => img.url),
  brand: { '@type': 'Brand', name: 'OttimoDirect' },
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
    priceCurrency: config.currency,
    availability: product.available
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  },
};
```

### Public Build — What NOT to Do

- ❌ Never add to cart without a `variantId` — returns 400
- ❌ Never use `productId` or `variantId` for cart PUT/DELETE — use cart item `_id`
- ❌ Never hardcode prices — use `variant.effectivePrice` or `product.minPrice`
- ❌ Never show raw API errors to customers — always friendly messages
- ❌ Never install a payment library other than `@stripe/stripe-js` + `@stripe/react-stripe-js`
- ❌ Never send `?includeAll=false` on storefront product requests
- ❌ Never use admin auth store in public components
- ❌ Never connect SSE stream for unauthenticated users

### Public Build — Submission Checklist

- [ ] Read `docs/CUSTOMER_SITE_GUIDE.md` for the relevant section before implementing
- [ ] No imports from `components/admin/`
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

---

## What NOT to Do

- ❌ Never hardcode English strings in JSX — always `t('key')`
- ❌ Never use `bg-white`, `text-black`, `border-gray-*` — use semantic tokens
- ❌ Never use any hardcoded colour (`bg-blue-600`, `#1e40af`, `oklch(...)` inline) — use `bg-primary`, `text-foreground` etc.
- ❌ Never use `window.confirm` — use `AppAlertDialog`
- ❌ Never build a component longer than 200 lines — split it
- ❌ Never put shared types inline in a component — use `types.ts`
- ❌ Never use relative imports that go up 3+ levels — use `@/` alias
- ❌ Never add a new icon library — use `lucide-react` only
- ❌ Never store server data in Zustand — use react-query cache
- ❌ Never skip dark mode variants on coloured status badges
- ❌ Never skip a language file — all 3 must be updated together
- ❌ Never guess API endpoints — always check `docs/FRONTEND_GUIDE.md`
- ❌ Never hardcode option arrays inside components — put them in `constants/`
- ❌ Never fire-and-forget mutations — always `await` refetch/invalidation so UI updates atomically
- ❌ **Never call `mutateAsync` without a `try/catch`.** `mutateAsync` always re-throws on error even when `onError` is defined — an unhandled rejection will crash the app. Always wrap in try/catch. The `onError` callback handles the toast; the catch block handles the rejection. State resets (closing dialogs, clearing IDs) go inside the `try` after the await, not after it unconditionally.

```ts
// ✅ CORRECT
const handleDelete = async () => {
  try {
    await deleteMutation({ id });
    setDeletingItem(null); // only on success
  } catch {
    // onError callback already showed the toast — just swallow the rejection
  }
};

// ❌ WRONG — unhandled rejection crashes the app when the request fails
const handleDelete = async () => {
  await deleteMutation({ id });
  setDeletingItem(null);
};
```

- ❌ Never inject CSS variables via JS — only `setAttribute('data-theme', id)` is allowed
- ❌ Never add theme CSS blocks to `globals.css` — each theme gets its own file in `styles/themes/`
- ❌ Never use `style={{ color: '...' }}` or `style={{ background: '...' }}` — use Tailwind tokens
- ❌ **Never modify existing theme files (`styles/themes/*.css`) without explicit user permission.** If a visual issue is caused by a theme's CSS variable values, explain the root cause and the exact change needed, then wait for the user to confirm before editing any theme file. The only exception is when the user explicitly asks to edit a theme file or pastes new theme CSS to be applied.
- ❌ Never import `components/admin/` from public pages or components
- ❌ Never use `<img>` in public pages — always `next/image`
- ❌ Never skip SEO metadata on public pages
- ❌ Never hardcode currency symbols — read from platform config
