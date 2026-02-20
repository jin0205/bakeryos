# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run preview  # Preview production build
```

No lint or test scripts are configured. TypeScript type checking is the only static analysis (`tsc --noEmit`).

**Environment:** Copy `.env.local` and set `GEMINI_API_KEY` for AI features to work.

## Architecture

Single-page React app with no backend — all state is persisted to `localStorage`.

**Entry points:**
- `index.html` → `index.tsx` → `App.tsx` (tab router)
- `App.tsx` manages 5 top-level tabs: Recipe Management, Batch Planner, Inventory, Cost Analysis, Baking Lab

**Path alias:** `@/` resolves to project root (configured in `vite.config.ts` and `tsconfig.json`).

**State persistence keys:**
- `sourdough_recipes` — `SavedRecipe[]`
- `sourdough_planner_items` — `PlannerItem[]`
- `sourdough_inventory` — `InventoryItem[]`
- `sourdough_theme` — `"dark" | "light"`

## Key Data Model (`types.ts`)

- **`Ingredient`** — has `percentage` (baker's %) and optional `weight` (grams), `costPerKg`, `inventoryId`
- **`RecipeSnapshot`** — the core calculation state: `flours[]`, `ingredients[]`, `numberOfLoaves`, `targetLoafWeight`
- **`SavedRecipe extends RecipeSnapshot`** — adds `id`, `name`, and `history: RecipeSnapshot[]` for version tracking
- **`InventoryItem`** — tracks quantity in grams with package-level purchasing info
- **`PlannerItem`** — pairs a `SavedRecipe` with a `count` (batch multiplier)

## AI Integration (`services/geminiService.ts`)

Uses `@google/genai` SDK with two Gemini models:
- `gemini-3-flash-preview` — image analysis, PDF/text parsing, grounded search, recipe suggestions
- `gemini-3-pro-preview` with extended thinking (1024 token budget) — complex baking science queries

All prompts that parse recipes include a `NORMALIZATION_INSTRUCTIONS` fragment that handles unit conversion heuristics (volume→weight, informal units, percentage-only recipes → assumes 1000g flour base).

## Styling

Tailwind CSS loaded via CDN in `index.html` (not installed as a package). Dark mode is class-based (`document.documentElement.classList`). Color palette: `amber-*` accents, `stone-*` neutrals.

## Key Calculations

All recipe math is baker's percentage based:
- Flour weight = `(targetLoafWeight × numberOfLoaves) / (sum of all percentages / 100)`
- Ingredient weight = `flourWeight × (ingredient.percentage / 100)`
- Batch scaling supports two modes: percentage multiplier and target dough weight
