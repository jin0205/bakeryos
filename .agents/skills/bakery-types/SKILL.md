---
name: bakery-types
description: Background knowledge for BakeryOS TypeScript types and localStorage schema. Codex invokes this automatically when adding new components, reading or writing localStorage, extending types.ts, or wiring a new feature to existing bakery data (recipes, inventory, planner, work orders). Use this skill any time you're about to touch data persistence or shared types — don't guess at field names or key strings.
user-invocable: false
---

# BakeryOS Types & Storage Reference

Apply this reference whenever working with shared data in `types.ts` or reading/writing `localStorage`.

## TypeScript Types

These live in `types.ts` — import from there, never redefine locally.

### Recipe Data

```ts
export interface Ingredient {
  id: number;
  name: string;
  percentage: number;    // Baker's percentage (flour = 100)
  costPerKg?: number;
  inventoryId?: string;  // Links to InventoryItem.id
  weight?: number;       // Computed in grams
}

export interface RecipeSnapshot {
  numberOfLoaves: number;       // Acts as batch multiplier
  weightPerLoaf: number;        // Display/historical weight
  targetLoafWeight: number;     // Independent target weight
  flours: Ingredient[];
  ingredients: Ingredient[];
  date: string;
  version: number;
  baseFlourName?: string;
  baseFlourInventoryId?: string;
  baseFlourCostPerKg?: number;
}

export interface SavedRecipe extends RecipeSnapshot {
  id: string;
  name: string;
  history: RecipeSnapshot[];
}
```

### Production Planning

```ts
export interface PlannerItem {
  uniqueId: string;
  recipe: SavedRecipe;
  count: number;
}

export type WorkOrderStatus = 'draft' | 'scheduled' | 'in-production' | 'complete';

export interface WorkOrderLineItem {
  recipeId: string;
  recipeName: string;
  recipeVersion: number;
  count: number;
  weightPerUnit: number;
  ingredientRequirements: Record<string, number>; // ingredientName → grams
}

export interface WorkOrder {
  id: string;
  woNumber: number;
  status: WorkOrderStatus;
  createdAt: string;
  scheduledDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lineItems: WorkOrderLineItem[];
  totalDoughKg: number;
  estimatedCost: number;
  inventoryDeducted: boolean;
  notes: string;
}
```

### Inventory

```ts
export type UnitOfMeasure = 'g' | 'kg' | 'lb' | 'oz' | 'ml';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;        // Always in grams
  costPerKg?: number;
  lastUpdated: string;
  packageWeight?: number;
  packageUnit?: UnitOfMeasure;
  itemsPerPackage?: number;
  costPerPackage?: number;
}
```

### Gemini Response Types

```ts
export interface GeminiGroundedResponse {
  text: string;
  metadata?: GroundingMetadata;
}
// (GroundingChunk, GroundingMetadata also in types.ts — use if grounding is enabled)
```

## localStorage Schema

| Key | Type | Notes |
|-----|------|-------|
| `sourdough_recipes` | `SavedRecipe[]` | Legacy prefix — do NOT rename, breaks existing data |
| `sourdough_inventory` | `InventoryItem[]` | Legacy prefix — do NOT rename |
| `sourdough_planner_items` | `PlannerItem[]` | Legacy prefix — do NOT rename |
| `bakeryos_work_orders` | `WorkOrder[]` | New convention prefix |

> **Prefix note:** AGENTS.md specifies `bakeryos_<feature>` as the convention, but the first three keys predate it and must stay as-is to avoid wiping user data. New features should use `bakeryos_<feature>`.

### Reading pattern

```ts
const recipes: SavedRecipe[] = JSON.parse(localStorage.getItem('sourdough_recipes') || '[]');
```

### Writing pattern

```ts
localStorage.setItem('sourdough_recipes', JSON.stringify(updated));
```

## Key Invariants

- `InventoryItem.quantity` is **always in grams** — convert before display, store as grams
- `Ingredient.percentage` is a Baker's Percentage — flour sums to 100, others relative to flour
- `RecipeSnapshot.numberOfLoaves` doubles as the batch multiplier (not just a loaf count)
- `WorkOrder.inventoryDeducted` is a one-way flag — once true, inventory has been consumed
- `WorkOrderLineItem.ingredientRequirements` maps ingredient names to grams needed for the full batch
- `SavedRecipe.id` and `InventoryItem.id` are strings (use `crypto.randomUUID()` or similar when creating)
