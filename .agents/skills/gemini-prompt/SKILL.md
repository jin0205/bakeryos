---
name: gemini-prompt
description: Background knowledge for writing Gemini AI prompts consistent with BakeryOS conventions — unit normalization, Baker's percentages, structured JSON output, model selection, and error handling. Codex invokes this automatically when editing geminiService.ts or adding new AI features.
user-invocable: false
---

# Gemini Prompt Conventions for BakeryOS

Apply these rules whenever writing or editing prompts in `services/geminiService.ts` or adding new AI features.

## Unit Normalization

All recipe weights must be in grams. For any prompt that accepts user recipe text, include the `NORMALIZATION_INSTRUCTIONS` constant that already lives in `geminiService.ts`. Reference it by name — don't copy-paste it inline.

```ts
const prompt = `${NORMALIZATION_INSTRUCTIONS}\n\n[your task instructions here]`;
```

## Output Format

Request JSON-only responses to keep parsing simple:

```
Return ONLY a valid JSON object. No markdown fences, no explanation, no surrounding text.
Schema: { name: string, ingredients: { name: string, weight_g: number }[], hydration: number }
```

## Baker's Percentage Rule

- Total flour weight = 100%
- All other ingredients expressed as % of total flour
- If user provides percentages only (no absolute weights), assume **1000g total flour**

## Model Selection

| Use Case | Model |
|----------|-------|
| Image analysis (recipe photos, handwritten notes) | `gemini-2.0-flash-preview` |
| Text analysis, chat, structured extraction | `gemini-2.0-flash` |

## Streaming vs Non-Streaming

| Pattern | Method | Used In |
|---------|--------|---------|
| Chat/conversational | `generateContentStream` | `AiBakersChat.tsx` |
| Single-shot analysis | `generateContent` | `RecipeImporter`, `RecipeCost`, etc. |

## Error Handling

Always wrap Gemini calls in try/catch. Throw a user-readable string, not the raw Gemini error:

```ts
try {
  const response = await ai.models.generateContent({ ... });
  return response.text;
} catch (e) {
  throw new Error('Failed to analyze recipe. Please check your input and try again.');
}
```

## Prompt Structure Template

```
[ROLE]
You are an expert baker and bakery ERP assistant.

[TASK]
<describe the specific task clearly>

[CONSTRAINTS]
- All weights in grams
- <any domain-specific constraints>

[OUTPUT FORMAT]
Return ONLY valid JSON matching this schema:
<schema>

[INPUT]
${userInput}
```

## Grounding / Search

For prompts that need current pricing or external facts, use `GoogleSearchRetrieval` grounding (see `analyzeImage` in `geminiService.ts` for the pattern). Don't add grounding to pure recipe-parsing prompts — it adds latency unnecessarily.
