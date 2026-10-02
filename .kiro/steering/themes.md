---
inclusion: always
---

# Colour & Styling Rules

This project uses a single theme defined via CSS custom properties in `styles/globals.css` (`:root` for light, `.dark` for dark mode). There is **no dynamic theme system** — no theme picker, no `data-theme` attribute, no runtime theme switching.

> **Stack:** Tailwind CSS **v4** (CSS-first config, no `tailwind.config.js`). All colour tokens are CSS custom properties defined in `globals.css` via `@theme inline`. The colour space is **oklch**.

---

## Critical Rules — NO EXCEPTIONS

### Never hardcode colours

- ❌ `bg-white`, `bg-black`, `text-gray-900`, `text-gray-500`
- ❌ `bg-blue-600`, `bg-red-500`, `text-green-700`
- ❌ Any hex value: `#ffffff`, `#1e40af`, `#000`
- ❌ Any oklch/hsl/rgb inline: `oklch(0.5 0.2 260)`, `hsl(220, 50%, 50%)`
- ❌ `style={{ color: '...' }}` or `style={{ background: '...' }}`
- ❌ `element.style.setProperty('--anything', '...')`

### Always use semantic tokens

- ✅ `bg-background`, `bg-card`, `bg-muted`, `bg-accent`
- ✅ `text-foreground`, `text-muted-foreground`
- ✅ `bg-primary`, `text-primary`, `bg-primary-foreground`
- ✅ `bg-destructive`, `text-destructive`
- ✅ `border-border`, `ring-ring`
- ✅ `bg-secondary`, `text-secondary-foreground`
- ✅ `bg-popover`, `text-popover-foreground`

### Token reference

| ❌ FORBIDDEN | ✅ REQUIRED |
|---|---|
| `bg-white` | `bg-background` or `bg-card` |
| `bg-gray-50` / `bg-gray-100` | `bg-muted` |
| `text-black` / `text-gray-900` | `text-foreground` |
| `text-gray-500` / `text-gray-400` | `text-muted-foreground` |
| `border-gray-*` | `border-border` |
| `hover:bg-gray-100` | `hover:bg-muted` or `hover:bg-accent` |
| `bg-blue-600` | `bg-primary` |
| `text-blue-600` | `text-primary` |
| `bg-red-500` | `bg-destructive` |
| `text-red-500` | `text-destructive` |
| Any hex inline | Never — use tokens only |
| Any `oklch(...)` inline in JSX | Never — use tokens only |
| `style={{ color: '...' }}` | Never — use Tailwind tokens |

### Status badges — the ONLY exception for palette colours

These fixed palette colours are acceptable **only** for semantic status indicators:

```
bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400
bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400
bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400
bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400
bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400
```

Always include dark mode variants for status badges.

---

## How the theme works

```
styles/globals.css
  :root { --primary: oklch(...); --background: oklch(...); ... }
  .dark { --primary: oklch(...); --background: oklch(...); ... }
  @theme inline { --color-primary: var(--primary); ... }
```

- Light/dark mode is toggled via `next-themes` (adds `.dark` class to `<html>`)
- All components use semantic tokens that resolve to CSS variables
- To change the site's look, edit `:root` and `.dark` in `globals.css` — nothing else

---

## What NOT to do

- ❌ Never create a `styles/themes/` directory or theme CSS files
- ❌ Never add `data-theme` attributes to any element
- ❌ Never create a theme picker or theme switching UI
- ❌ Never inject CSS variables via JavaScript
- ❌ Never use inline styles for colours
- ❌ Never use `tailwind.config.js` — this project is Tailwind v4 CSS-first
- ❌ Never apply colour palettes or themes suggested by skills
- ❌ Never hardcode colours in components — always use semantic tokens

---

## Skills override

Any theming or colour guidance from installed skills (`shadcn`, `frontend-design`, `ui-ux-pro-max`, etc.) is **superseded** by the rules in this file. Only the `:root` / `.dark` variables in `globals.css` define the site's colours.
