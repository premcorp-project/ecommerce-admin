This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

---

## Colour Theme System

This project uses a **CSS custom property theme system** — multiple themes selectable by the admin at runtime, with no build step required.

### How it works

- Themes are defined as CSS files in `styles/themes/` — one file per theme
- Switching themes sets `data-theme="x"` on `<html>` — the browser's CSS cascade does the rest
- The active theme is saved to the backend (`PUT /config`) and restored on every page load (`GET /config`)
- Dark mode works automatically — no JS re-apply needed

### Available themes

| ID | Label | Character |
|---|---|---|
| `default` | Default | Blue, soft shadows, rounded |
| `ocean` | Ocean | Teal-blue, dark sidebar |
| `rose` | Rose | Pink-red, very rounded |
| `emerald` | Emerald | Green, dark sidebar |
| `violet` | Violet | Purple, dark sidebar |
| `amber` | Amber | Warm yellow-orange |
| `forest` | Forest | Green + orange accent, hard shadows, Montserrat font |

### Adding a new theme (5 steps)

1. Get CSS from [tweakcn.com/community](https://tweakcn.com/community)
2. Create `styles/themes/{id}.css` — replace `:root {` → `:root[data-theme="{id}"] {` and `.dark {` → `:root.dark[data-theme="{id}"] {`
3. Add `@import "./themes/{id}.css";` to `styles/globals.css`
4. Add entry to `THEMES` in `constants/themes.ts` with both light (`preview*`) and dark (`darkPreview*`) colour values from the CSS file — light values from the `:root[data-theme]` block, dark values from the `:root.dark[data-theme]` block
5. Add the new id to the valid themes array in the backend `PUT /config` handler

> See [`THEMES.md`](./THEMES.md) for full documentation, complete CSS examples, and troubleshooting.

> The ThemePicker mini UI preview automatically shows light or dark colours based on the admin's current mode (`useTheme().resolvedTheme`).

### Why `:root[data-theme="x"]` — the specificity rule

Theme selectors must use `:root[data-theme="x"]` not `[data-theme="x"]`. Both have the same CSS specificity `(0,1,0)`, but since theme files are imported before `:root` in `globals.css`, plain `[data-theme]` would be overridden by `:root` in light mode. Adding `:root` to the selector bumps specificity to `(0,2,0)` which always wins.

### MANDATORY — Always use theme tokens, never hardcode colours

Every colour in every component **must** use a semantic Tailwind token that maps to a CSS variable. This ensures all themes work correctly.

| ❌ Never write | ✅ Always write |
|---|---|
| `bg-white` | `bg-background` or `bg-card` |
| `bg-gray-50`, `bg-gray-100` | `bg-muted` |
| `text-black`, `text-gray-900` | `text-foreground` |
| `text-gray-500`, `text-gray-400` | `text-muted-foreground` |
| `border-gray-200`, `border-gray-300` | `border-border` |
| `hover:bg-gray-100` | `hover:bg-muted` or `hover:bg-accent` |
| `bg-blue-600`, `bg-blue-500` | `bg-primary` |
| `text-blue-600` | `text-primary` |
| `bg-red-500` | `bg-destructive` |
| `ring-gray-300` | `ring-border` |
| `#1e40af`, `oklch(...)` inline | Never — use tokens only |

Coloured status badges must always include dark mode variants:
```
bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400
bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400
bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400
bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400
```

---

## Internationalization (i18n)

This project uses [next-intl](https://next-intl.dev/) for internationalization support.

- **Default Language**: English (en)
- **Supported Languages**: English, Spanish, French, German
- **Storage**: Language preference stored in cookies
- **Translated Components**: Sidebar navigation, common UI elements

### Using Translations

```tsx
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('common');
  return <div>{t('welcome')}</div>;
}
```

Translation files are located in `messages/` directory. The LanguageSelector component in the header allows users to switch languages.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
