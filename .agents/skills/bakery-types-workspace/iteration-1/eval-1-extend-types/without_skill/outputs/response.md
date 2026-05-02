**Adding `allergenTags` to Recipe Ingredients in BakeryOS**

**Where it goes in `types.ts`**

The `Ingredient` interface is the single source of truth. Add one optional field:

```ts
allergenTags?: string[];   // e.g. ['gluten', 'dairy', 'nuts']
```

Making it optional means every existing record in `localStorage` (`sourdough_recipes`) stays valid with zero migration — old objects simply won't have the key.

**Component-by-component impact**

- `RecipeCalculator.tsx` — The only place that needs active UI work. The `renderTable()` function renders ingredient rows; you add a tag-editing control there. `handleSave()` already spreads ingredient objects, so tags will survive save cycles automatically. `addItem()` needs no changes since the field is optional.
- `RecipeManagement.tsx` — Orchestrator only; no changes needed.
- `RecipeLibrary.tsx` — No changes required, but this is a good place to add an allergen badge column showing the union of tags across a recipe.
- `RecipeImporter.tsx` — No breaking change. Imported recipes won't have tags (Gemini isn't asked to extract them). If you want auto-tagging, the `parseRecipePdf`/`parseRecipeText` prompts in `geminiService.ts` would need to be extended, then the result mapped in here.
- `BatchPlanner.tsx` — Iterates ingredients for weights/costs only; no changes required.
- `RecipeCost.tsx` — Reads only `id`, `name`, `percentage`, `costPerKg`, `weight`; no changes required.
- `WorkOrders.tsx` and `CostAnalysis.tsx` — No changes required.

**Files requiring active edits**

| File | Change |
|---|---|
| `types.ts` | Add `allergenTags?: string[]` to `Ingredient` |
| `RecipeCalculator.tsx` | Add tag editing UI in `renderTable()` rows |
| `RecipeImporter.tsx` | Optional: extend Gemini prompt + map result |
