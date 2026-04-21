# Adding `allergenTags` to Recipe Ingredients

## 1. Where It Goes in `types.ts`

The field belongs on the `Ingredient` interface in `/Users/kevin/sourdough-pro-ai/types.ts`. `Ingredient` is shared by both `flours` and `ingredients` arrays inside every `RecipeSnapshot` (and `SavedRecipe`), so one change covers both arrays everywhere.

```ts
export interface Ingredient {
  id: number;
  name: string;
  percentage: number;
  costPerKg?: number;
  inventoryId?: string;
  weight?: number;
  allergenTags?: string[]; // e.g. ['gluten', 'dairy', 'nuts']
}
```

Make it optional (`?`) so existing persisted data loads without error — no migration required.

For tighter typing, you can add a canonical union to `types.ts`:

```ts
export const ALLERGEN_TAGS = ['gluten', 'dairy', 'eggs', 'nuts', 'peanuts', 'soy', 'sesame', 'fish', 'shellfish'] as const;
export type AllergenTag = typeof ALLERGEN_TAGS[number];
// then: allergenTags?: AllergenTag[];
```

**Do not** add this to `RecipeSnapshot` or `SavedRecipe` directly — allergens are a per-ingredient concern, not a batch-level one.

---

## 2. localStorage Impact

Recipes are stored under `sourdough_recipes` as `SavedRecipe[]`. Because `allergenTags` is optional, existing records load fine — the missing field reads as `undefined`. Use `ingredient.allergenTags ?? []` wherever you iterate tags. No migration needed, and `sourdough_recipes` must not be renamed (legacy key per the skill reference).

---

## 3. Components That Read `sourdough_recipes` — Impact Per File

| File | Impact |
|------|--------|
| `RecipeManagement.tsx` | Loads and routes recipes; no direct ingredient rendering. No change needed. |
| `RecipeCalculator.tsx` | **Primary edit surface — requires changes.** Holds `flours` and `ingredients` in state, renders each row. Add allergen tag UI to `renderTable`. Carry `allergenTags` through when building `finalFlours`/`finalIngredients` before save. |
| `RecipeLibrary.tsx` | Reads ingredients for weight stats only. No breaking change. Good optional location to show a recipe-level allergen badge. |
| `RecipeImporter.tsx` | Builds `Ingredient` objects from AI-parsed imports. Pass `allergenTags: []` in the final mapping so imported recipes start clean. |
| `RecipeCost.tsx` / `CostAnalysis.tsx` | Iterate ingredient names/weights/costPerKg for cost math only. No change needed. |
| `BatchPlanner.tsx` / `WorkOrders.tsx` | Work orders denormalize ingredients into `ingredientRequirements: Record<string, number>`. Tags are not copied in. No breaking change. |
| `FermentationEngine.tsx` / `AiBakersChat.tsx` | Reference `SavedRecipe` for AI prompts. Tags won't appear in Gemini prompts unless deliberately included. No breaking change. |

---

## 4. Key Implementation Notes

- In `RecipeCalculator.tsx`, spreading the full ingredient object when initializing state automatically carries `allergenTags` through — no extra mapping step needed.
- The `RecipeImporter.tsx` Gemini vision path returns `{ name, weight }` objects; the model has no allergen awareness from the image. Tags will always need to be added manually post-import.
- Both `flours` and `ingredients` arrays on `RecipeSnapshot` contain `Ingredient` objects, so allergen tags will flow through both flour entries and non-flour ingredients.
