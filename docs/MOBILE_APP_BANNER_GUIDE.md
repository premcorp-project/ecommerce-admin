# Hero Banner Design Specification — ChemTech Mobile App

A complete, precise specification for designing home-screen hero banners.
Written for human designers, AI design agents (Claude, Canva AI, Midjourney),
and programmatic banner generators.

---

## 1. Canvas Specification

| Property      | Value                         | Notes                                             |
| ------------- | ----------------------------- | ------------------------------------------------- |
| Width         | **1290px**                    | 3x retina of 430pt (iPhone Pro Max logical width) |
| Height        | **738px**                     | 3x retina of 246pt                                |
| Aspect ratio  | **1.75:1**                    | Landscape                                         |
| Color space   | sRGB                          | Standard web/mobile color space                   |
| Format        | WebP (preferred), PNG, or JPG | WebP for smallest file size                       |
| Max file size | **200KB**                     | Critical for fast load on mobile networks         |
| DPI           | 72 (screen)                   | Not for print — 72 DPI is standard for mobile     |

### Scaling reference

| Scale  | Width × Height | Use                                          |
| ------ | -------------- | -------------------------------------------- |
| 1x     | 430 × 246      | Logical points (how the app measures)        |
| 2x     | 860 × 492      | Standard retina                              |
| **3x** | **1290 × 738** | **Export at this size** (covers all devices) |

---

## 2. Layout Zones (the most critical section)

The banner image is divided into **three horizontal zones**. Only the **Safe Zone**
is guaranteed visible on all devices.

### Zone map (at 3x = 1290 × 738px)

```
0px ─────────────────────────────────────────────────── TOP EDGE
│                                                      │
│              ZONE A: OVERLAY ZONE                    │
│                                                      │
│   Height: 333px (45% of image)                       │
│   Covered by: status bar + search bar                │
│   Content allowed: NONE (decorative background only) │
│                                                      │
333px ─────────────────────── SAFE LINE ───────────────
│                                                      │
│              ZONE B: SAFE CONTENT ZONE               │
│                                                      │
│   Height: 381px (52% of image)                       │
│   This is the ONLY fully visible area                │
│   ALL important content goes here                    │
│                                                      │
714px ──────────────────────────────────────────────────
│              ZONE C: STRIP OVERLAP                   │
│   Height: 24px (3% of image)                         │
│   Covered by: trust strip rounded corner overlap     │
│   Content allowed: NONE (background continuation)    │
738px ─────────────────────────────────────────────── BOTTOM EDGE
```

### Zone measurements at all scales

| Zone                       | 1x (px) | 2x (px) | 3x (px) | % of height | Visible?   |
| -------------------------- | ------- | ------- | ------- | ----------- | ---------- |
| A — Overlay (top)          | 0–111   | 0–222   | 0–333   | 0–45%       | ❌ Hidden  |
| B — Safe content           | 111–238 | 222–476 | 333–714 | 45–97%      | ✅ Visible |
| C — Strip overlap (bottom) | 238–246 | 476–492 | 714–738 | 97–100%     | ❌ Hidden  |

### Reserved corner: pagination indicator

A small translucent pill showing "1/5" (current/total) sits at the bottom-right.

| Property   | Value (3x)                                  |
| ---------- | ------------------------------------------- |
| Position   | 36px from right edge, 36px from bottom edge |
| Size       | approximately 60 × 36px                     |
| Appearance | Dark semi-transparent pill with white text  |

**Do not place content** in the bottom-right 100 × 60px area (3x).

---

## 3. Content Placement Rules

### What goes in Zone B (Safe Content — 333px to 714px at 3x)

| Content type                       | Placement guidance                                       |
| ---------------------------------- | -------------------------------------------------------- |
| **Primary headline**               | Top of Zone B (y: 333–420px). Largest text.              |
| **Subtitle / tagline**             | Below headline (y: 420–480px).                           |
| **Product images**                 | Center or right of Zone B. Top of products at y ≥ 333px. |
| **CTA button** (Shop Now)          | Lower portion of Zone B (y: 550–680px).                  |
| **Trust badges** (icons + labels)  | Mid Zone B (y: 460–560px).                               |
| **Price / discount info**          | Near the CTA or headline. Within Zone B.                 |
| **Fine print**                     | Bottom of Zone B (y: 650–700px). Small text.             |
| **Brand logo** (if needed visible) | Bottom-left of Zone B.                                   |

### What goes in Zone A (Overlay — 0 to 333px at 3x)

| Allowed                           | Not allowed                |
| --------------------------------- | -------------------------- |
| Solid color fill                  | ❌ Text of any kind        |
| Gradient (brand color fade)       | ❌ Product images          |
| Blurred decorative imagery        | ❌ Logos that need reading |
| Abstract patterns / textures      | ❌ CTA buttons             |
| Bokeh / out-of-focus elements     | ❌ QR codes                |
| Continuation of bottom background | ❌ Pricing or offers       |

### Horizontal layout

| Area                | Range (3x)              | Content                                 |
| ------------------- | ----------------------- | --------------------------------------- |
| Left third          | 0–430px                 | Text block (headline, subtitle, badges) |
| Center              | 430–860px               | Can be text or product or empty         |
| Right third         | 860–1290px              | Product images or secondary visuals     |
| Bottom-right corner | 1190–1290px × 678–738px | ⚠️ Reserved for "1/5" indicator         |

---

## 4. Typography Specifications

| Element          | Font size (3x) | Font size (1x) | Weight            | Color                         |
| ---------------- | -------------- | -------------- | ----------------- | ----------------------------- |
| Primary headline | 72–90px        | 24–30px        | Bold (700–900)    | White or dark (high contrast) |
| Subtitle         | 42–54px        | 14–18px        | Regular or Medium | White or dark                 |
| CTA button text  | 42–48px        | 14–16px        | Bold (700)        | White on colored button       |
| Badge labels     | 33–39px        | 11–13px        | Medium (500)      | White or dark                 |
| Fine print       | 27–33px        | 9–11px         | Regular           | Muted / semi-transparent      |

### Text readability rules

- **Minimum contrast ratio**: 4.5:1 (WCAG AA) between text and its immediate background
- **If text sits on a photo**: add a semi-transparent scrim/overlay behind the text area (40–60% opacity)
- **Max 2 lines** for headlines (the safe zone is only ~380px tall at 3x)
- **Max 1 line** for subtitles
- **Alignment**: left-aligned or center-aligned. Avoid right-align for LTR markets.

---

## 5. Color & Style Guidelines

### Brand colors

| Token        | Hex       | Usage                                      |
| ------------ | --------- | ------------------------------------------ |
| Primary      | `#F4511E` | Warm orange — buttons, accents, highlights |
| Primary dark | `#D84315` | Pressed states, deeper emphasis            |
| Accent       | `#0D9488` | Teal — "Buy" actions, premium feel         |
| Dark slate   | `#262B33` | Trust strip background reference           |
| White        | `#FFFFFF` | Text on dark, button text                  |
| Near black   | `#1A1A1A` | Text on light backgrounds                  |

### CTA button style

| Property         | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| Background color | `#F4511E` (primary) or `#0D9488` (accent)                   |
| Text color       | `#FFFFFF`                                                   |
| Corner radius    | 24px (at 3x) / 8px (at 1x)                                  |
| Padding          | 36px horizontal, 24px vertical (at 3x)                      |
| Border           | None, or 3px white outline for contrast on busy backgrounds |

### Background styles that work well

1. **Solid gradient**: brand color at top → white/light at bottom
2. **Subtle texture**: marble, concrete, fabric
3. **Photo with scrim**: full-photo with 40% dark overlay on text area
4. **Split layout**: left = solid color with text, right = product on neutral bg
5. **Radial gradient**: soft spotlight effect behind the product

---

## 6. Product Image Guidelines

| Property    | Specification                                                         |
| ----------- | --------------------------------------------------------------------- |
| Format      | PNG with transparent background (preferred)                           |
| Position    | Right side or center of Zone B                                        |
| Top edge    | Must be at or below **333px** from top (3x)                           |
| Bottom edge | Must be at or above **700px** from top (3x)                           |
| Max width   | 60% of canvas width (780px at 3x) if on one side                      |
| Shadow      | Subtle drop shadow (offset-y: 6–12px, blur: 20–30px, opacity: 15–25%) |
| Quantity    | 1 hero product (dominant) + 0–3 supporting products (smaller, behind) |

---

## 7. Gradient Recipes — Ready-to-Use

### Recipe 1: Brand Warmth (primary gradient)

```
Direction: 180° (top to bottom)
0%   → #D84315 (primary 700)
40%  → #F4511E (primary 500)
100% → #FFAB91 (primary 300)
```

### Recipe 2: Sunrise Fade (warm to white)

```
Direction: 180°
0%   → #F4511E
35%  → #FFCDB2
70%  → #FFFFFF
100% → #FFFFFF
```

### Recipe 3: Ocean Calm (teal)

```
Direction: 135°
0%   → #0F766E
50%  → #0D9488
100% → #80CBC4
```

### Recipe 4: Dusk Blend (orange to teal)

```
Direction: 135°
0%   → #F4511E
50%  → #FF8A65
100% → #0D9488
```

### Recipe 5: Dark Luxury (slate)

```
Direction: 160°
0%   → #1A1A1A
40%  → #262B33
100% → #3D4550
```

### Recipe 6: Frosted Glass (light/airy)

```
Direction: 180°
0%   → #F0F4FF
50%  → #FAFAFA
100% → #FFFFFF
```

### Recipe 7: Lavender Mist

```
Direction: 180°
0%   → #7C3AED
30%  → #C4B5FD
70%  → #F5F3FF
100% → #FFFFFF
```

### Recipe 8: Radial Spotlight

```
Type: Radial
Center: 65% horizontal, 70% vertical
0%   → #FFFFFF
60%  → #F5F5F5
100% → #E8E8E8
```

### Recipe 9: Gold & Warm

```
Direction: 135°
0%   → #F59E0B
40%  → #FBBF24
80%  → #FEF3C7
100% → #FFFBEB
```

### Recipe 10: Fresh Green (eco/natural)

```
Direction: 180°
0%   → #059669
35%  → #34D399
70%  → #D1FAE5
100% → #FFFFFF
```

---

## 8. Banner Types & Templates

### Type A: Product Hero (single product)

- Layout: 60/40 split (left text, right product)
- Background: Gradient 2 (Sunrise Fade) or 8 (Radial Spotlight)

### Type B: Collection (multiple products)

- Layout: 50/50 or full-width
- Background: Gradient 1 (Brand Warmth) or 5 (Dark Luxury)

### Type C: Sale/Promotion (urgency)

- Layout: Bold, full-width text
- Background: Gradient 4 (Dusk Blend) or solid primary
- Special: Use Warning (#EAB308) or Error (#DC2626) for "LIMITED TIME" badge

### Type D: Brand Story / Trust

- Layout: Split with icons
- Background: Gradient 6 (Frosted Glass) or 3 (Ocean Calm)

### Type E: New Arrival / Launch

- Layout: Product-centered
- Background: Gradient 9 (Gold & Warm) or 7 (Lavender Mist)
- Badge: "NEW" pill at top of Zone B

---

## 9. AI Agent Prompt Template

```
Create a mobile app hero banner for a professional cleaning products brand.

Canvas: 1290 × 738 pixels, landscape, sRGB.

CRITICAL LAYOUT CONSTRAINT:
- The TOP 333 pixels (45%) will be covered by a mobile app header overlay.
- ALL text, products, and buttons MUST be placed BELOW the 333px line.
- The top 333px should contain ONLY decorative background (gradient, pattern, or blurred imagery).
- The bottom 24px will also be hidden — keep as background color.

Content to include (all below 333px from top):
- Headline: "[YOUR HEADLINE]"
- Subtitle: "[YOUR SUBTITLE]"
- Product image: [DESCRIBE PRODUCT] on the right side
- CTA button: "Shop Now" in brand orange (#F4511E) with white text
- Trust badges: "UK Made", "Hospital Grade", "Bulk Supply Available"

Style: Professional, clean, modern. Brand colors: Primary #F4511E, Accent #0D9488, Dark #1A1A1A.
```

---

## 10. File Delivery

| Property      | Requirement                                            |
| ------------- | ------------------------------------------------------ |
| File name     | `banner-{product-slug}-{variant}.webp`                 |
| Dimensions    | Exactly 1290 × 738px                                   |
| File size     | ≤ 200KB                                                |
| Color profile | sRGB (embedded)                                        |
| Alt text      | Provide the headline text for accessibility            |
| Link URL      | Provide the product/collection URL the banner links to |

---

## 11. Validation Checklist

- [ ] Canvas is exactly **1290 × 738px**
- [ ] No text above the **333px** horizontal line
- [ ] No product images above the **333px** horizontal line
- [ ] No important content below the **714px** horizontal line
- [ ] No content in the bottom-right **100 × 60px** corner
- [ ] File size is ≤ **200KB**
- [ ] File format is **WebP**, PNG, or JPG
- [ ] Text passes **4.5:1 contrast ratio**
- [ ] Headline readable at **430px display width**
- [ ] CTA button clearly visible (min 120 × 48px at 3x)
- [ ] **Cover test**: cover top 45% — is the offer still understandable?

---

## 12. Device Preview Reference

| Device            | Display width | Top overlay (1x) | Visible content height |
| ----------------- | ------------- | ---------------- | ---------------------- |
| iPhone SE         | 375pt         | 72pt             | 166pt                  |
| iPhone 14/15      | 390pt         | 111pt            | 127pt                  |
| iPhone 16 Pro Max | 430pt         | 111pt            | 127pt                  |
| Pixel 7/8         | 412pt         | 76pt             | 119pt                  |
| Samsung S24       | 360pt         | 76pt             | 97pt                   |

Designed for **worst case (111pt overlay)** — works universally.

---

## 13. Quick Reference Card

```
┌─────────────────────────────────────────────┐
│     CHEMIBUILD MOBILE BANNER CHEAT SHEET     │
├─────────────────────────────────────────────┤
│ Canvas:       1290 × 738px (3x)             │
│ Safe start:   333px from top                │
│ Safe end:     714px from top                │
│ No-go corner: bottom-right 100×60px         │
│ Max file:     200KB (WebP)                  │
├─────────────────────────────────────────────┤
│ BRAND COLORS:                               │
│ Primary:  #F4511E (warm orange)             │
│ Accent:   #0D9488 (teal)                    │
│ Dark:     #1A1A1A / #262B33                 │
│ Light:    #FFFFFF / #FAFAFA                  │
├─────────────────────────────────────────────┤
│ HEADLINE: 72–90px bold, max 2 lines         │
│ SUBTITLE: 42–48px medium, 1 line            │
│ CTA BTN:  240×72px min, primary/accent fill │
├─────────────────────────────────────────────┤
│ THE RULE: Nothing readable above halfway.   │
└─────────────────────────────────────────────┘
```

---

## Summary — The Five Rules

1. **Export at 1290 × 738px** (3x retina, landscape)
2. **Top 45% = decorative background only** (behind the app header)
3. **All content in the 333–714px vertical band** (the Safe Zone)
4. **Bottom-right corner reserved** for the slide indicator
5. **File ≤ 200KB** in WebP format

> **The one rule to remember: nothing readable above the halfway line.**
