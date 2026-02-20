# Layout Redesign — Sourdough Pro AI
**Date:** 2026-02-19
**Status:** Approved

## Problem

The current app renders all content inside a floating card centered in a near-black void. On a 1658px viewport the card is ~1250px wide, leaving ~200px of wasted space on each side. Navigation tabs live inside the content card rather than at the app level, creating a "website inside a website" feel. The Recipe Management workbench fully replaces the library view, destroying context on open. Baking Lab maintains its own internal left sidebar that would conflict with any top-level nav restructure.

## Approved Design

### App Shell

Replace the floating card + tab bar with a full-viewport app shell:

- **Left sidebar** — always expanded, ~220px wide, `stone-900/950` background, fixed height, non-scrolling
- **Content area** — `flex-grow`, full height, independently scrollable, `px-8 py-6` padding, no outer card wrapper
- **Header** — slim ~48px bar showing logo/wordmark only (or removed; sidebar carries branding)
- **Dark mode toggle** — moved from header to sidebar bottom

### Sidebar Structure

```
┌─────────────────────┐
│  Sourdough Pro AI   │  logo/wordmark
├─────────────────────┤
│  Recipe Management  │  main nav items
│  Batch Planner      │
│  Inventory          │
│  Cost Analysis      │
├─────────────────────┤
│  ▼ Baking Lab       │  expandable group (expanded when active)
│    · Baker's Asst   │
│    · Crumb Analyzer │
│    · Dev & Ferment. │
│    · DDT Water Temp │
│    · Recipe Import  │
│    · Converter      │
│    · Design Themes  │
├─────────────────────┤
│  ☀ Dark mode toggle │
└─────────────────────┘
```

Active item: amber left border + amber text. Inactive: `stone-400`, hover `stone-200`.
Baking Lab group expands when any sub-item is active, collapses when navigating away.

### Recipe Management — Split Panel

Library and workbench are displayed side-by-side. No more full-view swap.

- **Library panel** — fixed 320px, always visible. Contains: search, sort dropdown, compact recipe list items (name + hydration % + date, single row), "+ New Formula" button at bottom.
- **Workbench panel** — `flex-grow`. Loads selected recipe. Empty state when no recipe selected: "Select a recipe or create a new one."
- Active recipe in library: amber left border indicator.
- No back button needed — clicking any library item switches the workbench in place.

### Batch Planner

Left column renamed **Recipe Queue**, restructured:

- **Recipe Queue (340px):** Two sections — "YOUR RECIPES" (all saved recipes with `+` inline add button) and "IN YOUR PLAN" (active recipes with `[−] N [+]` stepper for loaf count).
- **Master Production List (flex-grow):** Header row with live `kg total · $total`. Table of ingredients. "Commit & Start Bake" pinned to bottom-right. Empty state with prompt + arrow pointing left.

### Inventory Management

Form card gets a **live procurement preview line** (`0kg · $0.00/kg · $0.00 total`) rendered inside the form card rather than as a separate block. Tightens vertical space so the inventory table is visible sooner on load. Otherwise layout unchanged.

### Cost Analysis

No structural changes. Benefits automatically from shell (more horizontal space, no card). Add **sticky table header** so column labels stay visible when scrolling long recipe lists.

### Baking Lab

Internal sidebar eliminated entirely. Sub-items live in the main sidebar as a nav group (see sidebar structure above). Content renders full-width. Baker's Assistant response area gets a placeholder: "Your answer will appear here..." to avoid an empty-box appearance.

## What Does Not Change

- Data model (`types.ts`) — no changes
- `localStorage` persistence keys — no changes
- All existing component logic — only layout/structural JSX and CSS changes
- Color palette — amber accents, stone neutrals, dark mode class-based system preserved

## Files Affected

- `App.tsx` — new shell layout, sidebar component integration, tab routing refactored to sidebar active state
- `components/Header.tsx` — simplified or removed
- `components/Tabs.tsx` — replaced by sidebar nav
- `components/RecipeManagement.tsx` — split panel layout
- `components/BatchPlanner.tsx` — Recipe Queue restructure
- `components/InventoryManagement.tsx` — procurement preview inline
- `components/CostAnalysis.tsx` — sticky table header
- `components/BakingLab.tsx` — internal sidebar removed, content goes full-width
- New: `components/Sidebar.tsx` — app-level sidebar nav component
