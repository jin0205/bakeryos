# BakeryOS — Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/bakeryos/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** BakeryOS  
**Type:** Artisan Bakery ERP (Dashboard / Data App)  
**Stack:** React 19 + TypeScript + Tailwind CSS v4 + Vite  
**Theme Modes:** `light` (warm amber/stone) and `amoled` (pure black + amber)  
**Generated:** 2026-05-17

---

## Themes

BakeryOS has exactly **two** theme modes. Never add a third.

| Mode | Class | Description |
|------|-------|-------------|
| Light | `.theme-light` (default) | Warm parchment / amber bakery feel |
| AMOLED | `.theme-amoled` | Pure-black OLED, amber accent |

The `dark:` Tailwind prefix is aliased via `@custom-variant` to `.theme-amoled` in `index.css`.  
Always pair light + dark classes: `bg-white dark:bg-stone-900`.

---

## Color Palette

### CSS Custom Properties (from `index.css`)

| Token | Light | AMOLED | Usage |
|-------|-------|--------|-------|
| `--bg-app` | `#fef3c7` | `#000000` | App shell background |
| `--bg-surface` | `#f5f0e1` | `#0a0a0a` | Sidebar, secondary surface |
| `--bg-elevated` | `#ffffff` | `#111111` | Cards, modals |
| `--border-default` | `#e7d9bf` | `#1a1a1a` | Dividers, card borders |
| `--text-primary` | `#78350f` | `#fafafa` | Headings, primary labels |
| `--text-secondary` | `#92400e` | `#e5e5e5` | Body text |
| `--text-muted` | `#a16207` | `#a3a3a3` | Captions, placeholders |
| `--accent-primary` | `#b5651d` | `#d97706` | Brand amber, primary action |
| `--accent-secondary` | `#c67b5c` | `#f59e0b` | Secondary amber, highlights |
| `--state-success` | `#15803d` | `#22c55e` | Positive values, in-stock |
| `--state-warning` | `#b45309` | `#f59e0b` | Alerts, low inventory |
| `--state-danger` | `#b91c1c` | `#ef4444` | Errors, deficits |
| `--focus-ring` | `#d97706` | `#f59e0b` | Keyboard focus outline |

### Tailwind Palette Conventions (from CLAUDE.md)

| Use | Classes |
|-----|---------|
| Brand / active | `text-amber-600`, `bg-amber-600`, `bg-amber-50 dark:bg-amber-900/20` |
| Neutral / chrome | `text-stone-600 dark:text-stone-400` |
| Borders | `border-stone-200 dark:border-stone-700` |
| Body text | `text-stone-600 dark:text-stone-300` |
| Headings | `text-stone-900 dark:text-stone-50` |

---

## Typography

BakeryOS uses the system font stack (no custom Google Fonts imported).  
Do not add external font imports unless explicitly instructed.

| Element | Classes |
|---------|---------|
| Page heading | `text-2xl font-bold text-stone-900 dark:text-stone-50` |
| Section heading | `text-lg font-semibold text-stone-900 dark:text-stone-50` |
| Body text | `text-sm text-stone-600 dark:text-stone-300` |
| Muted / caption | `text-xs text-stone-500 dark:text-stone-400` |
| Numeric / metric | `text-2xl font-bold tabular-nums` |

**Body line-height:** `leading-relaxed` (≈ 1.625)  
**Minimum font size:** `text-sm` (14px) — `text-xs` only for secondary metadata.

---

## Spacing System

Use Tailwind spacing. Standard page rhythm:

| Context | Value |
|---------|-------|
| Page wrapper | `p-6` |
| Vertical stack between sections | `space-y-6` |
| Card internal padding | `p-6` |
| Compact card padding | `p-4` |
| Inline icon gap | `gap-2` |
| Form field gap | `space-y-4` |

---

## Component Patterns

### Section Card
```tsx
<div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
```

### Page Wrapper
```tsx
<div className="p-6 space-y-6">
```

### Primary Button
```tsx
<button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium cursor-pointer">
```

### Ghost / Secondary Button
```tsx
<button className="px-4 py-2 text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm cursor-pointer">
```

### Danger Button
```tsx
<button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium cursor-pointer">
```

### Table Container
```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-stone-200 dark:border-stone-700">
      <th className="text-left py-3 px-4 text-stone-500 dark:text-stone-400 font-medium">
```
Use `divide-y divide-stone-200 dark:divide-stone-700` on `<tbody>`.

### Form Input
```tsx
<input className="w-full px-3 py-2 text-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 text-stone-900 dark:text-stone-50" />
```

### Badge / Status Chip
```tsx
// Success
<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
// Warning
<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
// Danger
<span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
```

### Modal Overlay
```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
  <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-6 w-full max-w-lg shadow-xl">
```

### KPI / Metric Card
```tsx
<div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6">
  <p className="text-sm text-stone-500 dark:text-stone-400">Label</p>
  <p className="text-3xl font-bold text-stone-900 dark:text-stone-50 mt-1 tabular-nums">Value</p>
  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Subtext</p>
</div>
```

---

## Shadows

| Level | Tailwind | Usage |
|-------|----------|-------|
| Subtle | `shadow-sm` | Hover lift on rows |
| Standard | `shadow-md` | Floating panels |
| Heavy | `shadow-xl` | Modals, dialogs |

---

## Animation / Transitions

| Rule | Value |
|------|-------|
| Micro-interaction duration | `transition-colors duration-150` |
| Card hover lift | `hover:shadow-md transition-shadow duration-200` |
| Loading spinner | `animate-spin` |
| Skeleton pulse | `animate-pulse bg-stone-200 dark:bg-stone-700 rounded` |
| Continuous animation | Loading indicators only — never decorative |
| Reduced motion | Respect `prefers-reduced-motion` via Tailwind `motion-safe:` |

---

## Icons

- Use **Lucide React** (already available in the project)
- Standard size: `w-4 h-4` for inline, `w-5 h-5` for buttons, `w-6 h-6` for nav
- Always `aria-hidden="true"` on decorative icons
- Never use emojis as UI icons

---

## Accessibility

| Rule | Implementation |
|------|----------------|
| Contrast | 4.5:1 minimum (WCAG AA). Stone-600 on white passes. |
| Focus rings | `focus:ring-2 focus:ring-amber-500` on all interactive elements |
| Keyboard nav | Tab order matches visual order; no skip-link gaps |
| Icon buttons | `aria-label` on every icon-only button |
| Form labels | `<label htmlFor>` on every input |
| Touch targets | Minimum `min-h-[44px] min-w-[44px]` on mobile actions |
| `cursor-pointer` | On **every** clickable element (button, tr, card) |

---

## Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| Base | `z-0` | Normal content |
| Dropdown | `z-10` | Inline menus |
| Sticky header | `z-20` | Sticky table headers |
| Sidebar | `z-30` | Side navigation |
| Modal overlay | `z-50` | Dialogs |
| Toasts | `z-[60]` | Notifications above modals |

---

## Layout Architecture

```
App.tsx
├── Sidebar (fixed left, w-64)
└── Main content area (ml-64, full height scroll)
    └── Component page (p-6 space-y-6)
        ├── Page header (title + actions)
        ├── KPI row (grid grid-cols-2 lg:grid-cols-4 gap-4)
        └── Content cards
```

Sidebar is always visible on desktop. No mobile hamburger yet — mobile is not the primary target.

---

## Anti-Patterns (FORBIDDEN)

- ❌ Emojis as icons — use Lucide SVG
- ❌ Missing `cursor-pointer` on any clickable element
- ❌ Layout-shifting hover (scale transforms that move siblings)
- ❌ Low-contrast text (stone-400 on white fails — use stone-600 minimum)
- ❌ Instant state changes — always `transition-colors duration-150` or faster
- ❌ Invisible focus states
- ❌ Introducing a `'dark'` ThemeMode value — only `'light'` and `'amoled'` exist
- ❌ Raw `localStorage` calls — use `storageService.load / storageService.save`
- ❌ Importing `@anthropic-ai/sdk` in frontend files — AI calls go through `claudeService.ts`
- ❌ Adding Vercel config — project deploys to Cloudflare Workers

---

## Pre-Delivery Checklist

- [ ] All Tailwind classes paired: `bg-white dark:bg-stone-800`
- [ ] No emojis as icons (Lucide only)
- [ ] `cursor-pointer` on every clickable element
- [ ] Hover states use `transition-colors duration-150` or `transition-shadow duration-200`
- [ ] Focus rings: `focus:ring-2 focus:ring-amber-500`
- [ ] Form inputs have `<label htmlFor>`
- [ ] Icon-only buttons have `aria-label`
- [ ] Tables wrapped in `overflow-x-auto` for mobile
- [ ] No horizontal scroll at 375px viewport
- [ ] `motion-safe:` prefix on non-essential animations
