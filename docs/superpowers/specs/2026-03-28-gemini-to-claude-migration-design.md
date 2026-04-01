# Design: Gemini → Claude API Migration

**Date:** 2026-03-28
**Project:** BakeryOS (sourdough-pro-ai)
**Status:** Approved

---

## Summary

Replace the Google Gemini AI integration with the Anthropic Claude API. Add a settings tab with per-feature model selection. Remove the ingredient cost auto-suggestion feature (which relied on Gemini's Google Search grounding).

---

## Architecture

Approach: **Direct service swap with localStorage config** — same exported function signatures, components only change their import path. Matches the existing codebase pattern of localStorage-everything with no new abstractions.

---

## 1. Service Layer

**Delete:** `services/geminiService.ts`
**Create:** `services/claudeService.ts`

Dependencies:
- Remove `@google/genai` from `package.json`
- Add `@anthropic-ai/sdk` to `package.json`
- Env var: `API_KEY` → `ANTHROPIC_API_KEY`

### Function mapping

| Old (Gemini) | New (Claude) | Default Model |
|---|---|---|
| `getChatResponse(history, systemInstruction)` | Claude Messages API. Map role `'model'` → `'assistant'` in history. | `claude-haiku-4-5-20251001` |
| `getComplexResponse(prompt)` | Claude Messages API with extended thinking (`budget_tokens: 8000`). | `claude-sonnet-4-6` |
| `parseRecipePdf(pdfFile)` | Claude Messages API with base64 `document` content block (PDF natively supported). | `claude-haiku-4-5-20251001` |
| `parseRecipeText(text)` | Claude Messages API, simple text prompt. | `claude-haiku-4-5-20251001` |
| `suggestIngredientCost` | **Deleted** — relied on Gemini Google Search grounding, no Claude equivalent. |  |
| `analyzeImage` | **Deleted** — unused. |  |
| `getGroundedResponse` | **Deleted** — unused. |  |
| `getRecipeSuggestions` | **Deleted** — unused. |  |

### Settings integration

Each exported function reads `localStorage.getItem('bakeryos_ai_settings')` on call and uses the configured model ID for its feature key. Falls back to the default model if no setting is saved.

Settings shape:
```ts
interface AISettings {
  chat: string;       // default: 'claude-haiku-4-5-20251001'
  fermentation: string; // default: 'claude-sonnet-4-6'
  import: string;     // default: 'claude-haiku-4-5-20251001'
}
```

---

## 2. AI Settings Tab

**Create:** `components/AiSettings.tsx`

A new top-level sidebar tab. Displays three model dropdowns, one per AI feature:

| Feature | Label | Default |
|---|---|---|
| `chat` | Baker's Assistant | Fast — Haiku |
| `fermentation` | Fermentation Engine | Balanced — Sonnet |
| `import` | Recipe Importer | Fast — Haiku |

Model options (all three dropdowns show the same three choices):
- **Fast** — `claude-haiku-4-5-20251001`
- **Balanced** — `claude-sonnet-4-6`
- **Powerful** — `claude-opus-4-6`

Persisted to `localStorage` under `bakeryos_ai_settings`. Changes take effect immediately on next AI call.

---

## 3. Component Changes

### `RecipeCost.tsx`
- Remove import of `suggestIngredientCost`
- Remove `loadingSuggestion` and `suggestions` state
- Remove `handleSuggestCost` and `applySuggestion` functions
- Remove the sparkle button (✨) from each ingredient row
- Remove the "Est: $X.XX ← Apply" suggestion link
- Remove `SparklesIcon` import
- Cost input field remains — users enter prices manually

### `AiBakersChat.tsx`
- Update import: `geminiService` → `claudeService`

### `FermentationEngine.tsx`
- Update import: `geminiService` → `claudeService`

### `RecipeImporter.tsx`
- Update import: `geminiService` → `claudeService`

---

## 4. Types Cleanup

**Remove from `types.ts`:**
- `GeminiGroundedResponse` interface
- `GroundingChunk` interface
- `GroundingMetadata` interface

---

## 5. CLAUDE.md Updates

- Tech stack: replace `@google/genai` with `@anthropic-ai/sdk`
- Service file reference: `geminiService.ts` → `claudeService.ts`
- Gemini-specific prompt conventions section: update to reflect Claude API patterns (Messages API, model IDs, extended thinking)
- Available skills: update the `gemini-prompt` skill name and content to reflect Claude API conventions (rename to `claude-prompt`); update `bakery-types` if any Gemini-specific type references exist in that skill

---

## Out of Scope

- No streaming for chat (current implementation is non-streaming; keep as-is)
- No changes to non-AI components
- No backend added — stays client-side only
- No migration of existing localStorage data (AI settings are new keys)
