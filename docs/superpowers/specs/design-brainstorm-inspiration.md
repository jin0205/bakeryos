# Design Brainstorm Inspiration

## Project

- Product: `sourdough-pro-ai`
- Document type: Design brainstorm and inspiration
- Goal: Define a clear visual direction and UX priorities for upcoming UI work

## Core Direction

Primary concept: **Warm Artisan Glass**

This direction combines modern glassmorphism with handcrafted bakery warmth. The interface should feel clean and premium while staying grounded in earthy, artisan tones that match sourdough and production workflows.

### Why this direction

- Preserves a modern SaaS-level polish
- Avoids generic cold dashboard aesthetics
- Aligns with artisan baking brand language
- Supports both storytelling surfaces and operational dashboards

## Alternate Inspiration Tracks

### 1) Nature Distilled Editorial

- Muted earthy colors, subtle textures, calmer motion
- Best for premium brand storytelling and product narrative
- Strong fit for marketing/landing sections

### 2) Executive Ops Dashboard

- KPI-forward, compact, data-dense layouts
- Best for production, inventory, and workflow oversight
- Prioritizes scannability and speed over decorative effects

## Recommended Design System

### Color Palette

- Terracotta: `#C67B5C`
- Sand Beige: `#D4C4A8`
- Warm Clay: `#B5651D`
- Soft Cream: `#F5F0E1`
- Olive Accent: `#6B7B3C`

Use warm neutrals as base surfaces and apply accents intentionally for state, focus, and action emphasis.

### Typography

- Primary heading font: `Plus Jakarta Sans`
- Primary body font: `Plus Jakarta Sans`
- Tone: friendly, modern, approachable, operationally clear

### Visual Effects

- Backdrop blur on elevated surfaces: ~10-20px
- Soft shadows and subtle borders for hierarchy
- Smooth, restrained transitions: 150-300ms
- Avoid heavy motion and large-scale transforms

### AMOLED Dark Mode (Required Variant)

Design an explicit AMOLED theme for low-light usage and OLED battery efficiency.

#### AMOLED Palette

- App background: `#000000`
- Elevated surface: `#0A0A0A`
- Border/subtle divider: `#1A1A1A`
- Primary accent (warm): `#D97706`
- Secondary accent: `#F59E0B`
- Positive state: `#22C55E`
- Warning state: `#F59E0B`
- Error state: `#EF4444`
- Primary text: `#FAFAFA`
- Muted text: `#A3A3A3`

#### AMOLED Interaction and Readability Rules

- Keep primary surfaces true black (`#000000`) for OLED benefit.
- Use cards at `#0A0A0A` to preserve hierarchy without gray haze.
- Keep border contrast subtle but visible (`#1A1A1A` minimum).
- Avoid large blur/glass effects in AMOLED; prefer solid layers.
- Maintain WCAG-friendly contrast for all text and interactive states.

#### Theme Parity Expectations

- All interactive states (hover, focus, disabled, error, success) must exist in both light and AMOLED themes.
- KPI cards, tables, filters, modals, and form controls must have explicit dark tokens (no implicit browser defaults).
- Charts should use accessible dark-safe palettes and avoid low-contrast grid/axis colors.

### Tailwind Token Map (Light + AMOLED)

Use semantic tokens so components do not hardcode theme-specific values.

```css
/* Light Theme (default) */
:root,
:root.theme-light {
  --bg-app: #FEF3C7;
  --bg-surface: #F5F0E1;
  --bg-elevated: #FFFFFF;
  --border-default: #E7D9BF;
  --text-primary: #78350F;
  --text-secondary: #92400E;
  --text-muted: #A16207;
  --accent-primary: #B5651D;
  --accent-secondary: #C67B5C;
  --state-success: #15803D;
  --state-warning: #B45309;
  --state-danger: #B91C1C;
  --focus-ring: #D97706;
}

/* AMOLED Theme */
:root.theme-amoled {
  --bg-app: #000000;
  --bg-surface: #0A0A0A;
  --bg-elevated: #111111;
  --border-default: #1A1A1A;
  --text-primary: #FAFAFA;
  --text-secondary: #E5E5E5;
  --text-muted: #A3A3A3;
  --accent-primary: #D97706;
  --accent-secondary: #F59E0B;
  --state-success: #22C55E;
  --state-warning: #F59E0B;
  --state-danger: #EF4444;
  --focus-ring: #F59E0B;
}
```

```js
// tailwind.config.js (semantic token mapping pattern)
export default {
  theme: {
    extend: {
      colors: {
        app: "var(--bg-app)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        border: "var(--border-default)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)"
        },
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)"
        },
        state: {
          success: "var(--state-success)",
          warning: "var(--state-warning)",
          danger: "var(--state-danger)"
        },
        focus: "var(--focus-ring)"
      }
    }
  }
};
```

#### Component-Level Usage Expectations

- App shell: `bg-app text-text-primary`
- Cards/panels: `bg-surface border border-border`
- Primary CTA: `bg-accent-primary text-black` (light) and `text-black` or `text-neutral-950` (amoled)
- Secondary actions: `bg-elevated border border-border text-text-secondary`
- Focus ring: `focus-visible:ring-2 focus-visible:ring-focus`

## UX and Accessibility Priorities

### Must-have behaviors

- Show loading feedback for async operations over ~300ms
- Disable action buttons while async submissions are in progress
- Use inline/on-blur validation for forms
- Ensure visible keyboard focus states on all interactive controls
- Keep text contrast at WCAG-friendly levels (target 4.5:1 for body text)

### Performance-minded UI

- Lazy-load below-the-fold assets where appropriate
- Prevent content jumping by reserving space for async blocks
- Use stable hover/focus effects that do not shift layout

## Layout Inspiration

### Marketing/Home shell

- Hero
- Feature highlights
- Primary call-to-action block

### App dashboard shell

- KPI row (high-signal metrics)
- Production and inventory cards
- Sortable/filterable operational table

### Card conventions

- Consistent spacing and padding (`p-6`, `space-y-4`)
- Rounded corners and elevated hover feedback on interactive cards
- Explicit `cursor-pointer` on clickable cards

## Anti-Patterns to Avoid

- Emoji-based UI icons (use SVG icon sets)
- Weak light-mode text contrast
- Excessive animation or motion-heavy interactions
- Inconsistent card styles and spacing across sections
- Clickable elements without pointer cursor or hover feedback

## Practical Next Step

Convert this direction into a concrete UI spec:

- Component inventory (cards, tables, filters, forms, nav)
- Tailwind token map (color, spacing, radius, shadow, motion)
- Per-page section wireframes (landing, dashboard, inventory/workflow)
