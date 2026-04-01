# Gemini → Claude API Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Google Gemini AI integration with the Anthropic Claude API, add a per-feature model settings tab, and remove the ingredient cost auto-suggestion feature.

**Architecture:** Delete `geminiService.ts` and replace it with `claudeService.ts` that exports identical function signatures — components only change their import path. A new `AiSettings.tsx` tab lets the user choose Haiku/Sonnet/Opus per feature; `claudeService.ts` reads this config from `localStorage` on each call.

**Tech Stack:** `@anthropic-ai/sdk`, React 19, TypeScript 5.8, Vite 6, Tailwind CSS, localStorage

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `services/claudeService.ts` | All Claude API calls; reads `bakeryos_ai_settings` from localStorage |
| Create | `components/AiSettings.tsx` | Settings UI — three model dropdowns, persists to localStorage |
| Delete | `services/geminiService.ts` | Replaced by claudeService.ts |
| Modify | `package.json` | Swap `@google/genai` → `@anthropic-ai/sdk` |
| Modify | `vite.config.ts` | Expose `ANTHROPIC_API_KEY` as `process.env.ANTHROPIC_API_KEY` |
| Modify | `types.ts` | Remove `GeminiGroundedResponse`, `GroundingChunk`, `GroundingMetadata` |
| Modify | `components/RecipeCost.tsx` | Remove sparkle button + cost suggestion state |
| Modify | `components/AiBakersChat.tsx` | Import path only |
| Modify | `components/FermentationEngine.tsx` | Import path only |
| Modify | `components/RecipeImporter.tsx` | Import path only |
| Modify | `components/Sidebar.tsx` | Add `'settings'` to Tab type; add AI Settings nav item |
| Modify | `App.tsx` | Add `'settings'` to Tab type; import + render AiSettings |
| Modify | `CLAUDE.md` | Update tech stack, service path, skill references |

---

## Task 1: Swap package dependencies and environment config

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Note: `.env.local` — manual step, not edited by script

- [ ] **Step 1: Update package.json**

Replace the `@google/genai` dependency with `@anthropic-ai/sdk`:

```json
{
  "name": "sourdough-pro-ai",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.0"
  }
}
```

- [ ] **Step 2: Update vite.config.ts**

Replace the Gemini `define` entries with the Anthropic API key:

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```

- [ ] **Step 3: Update .env.local**

Open `.env.local` and rename the key:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```
(Remove any `GEMINI_API_KEY` line — it is no longer used.)

- [ ] **Step 4: Install dependencies**

```bash
cd /Users/kevin/sourdough-pro-ai && npm install
```

Expected: `@anthropic-ai/sdk` installed, `@google/genai` removed from `node_modules`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "chore: swap @google/genai for @anthropic-ai/sdk"
```

---

## Task 2: Create services/claudeService.ts

**Files:**
- Create: `services/claudeService.ts`

- [ ] **Step 1: Create the file**

```typescript
import Anthropic from '@anthropic-ai/sdk';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, dangerouslyAllowBrowser: true });

interface AISettings {
  chat: string;
  fermentation: string;
  import: string;
}

const DEFAULTS: AISettings = {
  chat: 'claude-haiku-4-5-20251001',
  fermentation: 'claude-sonnet-4-6',
  import: 'claude-haiku-4-5-20251001',
};

const getSettings = (): AISettings => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('bakeryos_ai_settings') || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
};

// SHARED NORMALIZATION PROMPT FRAGMENT
const NORMALIZATION_INSTRUCTIONS = `
### CRITICAL: UNIT NORMALIZATION HEURISTICS:
The app requires all weights in **GRAMS (g)**. Use the following conversion logic for less structured or non-metric text:

#### A. Standard Mass Conversions:
- 1 kg = 1000g
- 1 lb = 453.6g
- 1 oz = 28.35g
- 1 stone = 6350g

#### B. Volume-to-Weight (Density-Aware):
If an ingredient is given in cups, spoons, or milliliters, use these specific densities:
- **Liquids (Water, Milk, Cider, Beer)**: 1 cup ≈ 240g | 1 tbsp ≈ 15g | 1 tsp ≈ 5g | 1 ml ≈ 1g
- **Flours (All types)**: 1 cup ≈ 125g | 1 tbsp ≈ 8g
- **Sugars**: 1 cup Granulated ≈ 200g | 1 cup Brown (Packed) ≈ 215g | 1 tbsp ≈ 12g
- **Fats**: 1 cup Butter ≈ 227g | 1 stick Butter ≈ 113g | 1 cup Oil ≈ 218g
- **Honey/Syrups**: 1 cup ≈ 340g | 1 tbsp ≈ 21g
- **Salt (Fine)**: 1 tsp ≈ 6g | 1 tbsp ≈ 18g
- **Yeast (Instant/Dry)**: 1 tsp ≈ 3g | 1 tbsp ≈ 9g

#### C. Informal/Culinary Units:
- **"Pinch" or "Dash"**: 1g
- **"Smidgen"**: 0.5g
- **"Large Egg"**: 50g (shelled)
- **"Clove of Garlic"**: 5g
- **"Medium Onion"**: 150g
- **"Half a bag/packet"**: Estimate based on standard retail sizes.

#### D. Percentage-Only Recipes:
- If only Baker's Percentages are provided, assume a Total Flour Weight of 1000g.
`;

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const parseRecipePdf = async (pdfFile: File): Promise<string> => {
  try {
    const base64 = await fileToBase64(pdfFile);
    const prompt = `You are a highly precise data extraction assistant for a professional bakery application.
Extract the recipe details from this PDF.

{
  "name": "string",
  "numberOfLoaves": number,
  "weightPerLoaf": number,
  "ingredients": [
    { "name": "string", "weight": number }
  ]
}

${NORMALIZATION_INSTRUCTIONS}
Return ONLY valid JSON. No markdown fences.`;

    const response = await client.messages.create({
      model: getSettings().import,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: prompt },
        ],
      }],
    });

    const block = response.content.find(b => b.type === 'text');
    return block?.type === 'text' ? block.text : '{}';
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF.');
  }
};

export const parseRecipeText = async (text: string): Promise<string> => {
  try {
    const prompt = `Extract recipe details from the following raw text or CSV data (likely from a Google Sheet or clipboard):

INPUT DATA:
"""
${text}
"""

OUTPUT FORMAT:
{
  "name": "string",
  "numberOfLoaves": number,
  "weightPerLoaf": number,
  "ingredients": [
    { "name": "string", "weight": number }
  ]
}

${NORMALIZATION_INSTRUCTIONS}
Return ONLY valid JSON. No markdown fences.`;

    const response = await client.messages.create({
      model: getSettings().import,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content.find(b => b.type === 'text');
    return block?.type === 'text' ? block.text : '{}';
  } catch (error) {
    console.error('Error parsing text:', error);
    throw new Error('Failed to parse input data.');
  }
};

export const getComplexResponse = async (prompt: string): Promise<string> => {
  try {
    const model = getSettings().fermentation;
    const supportsThinking = !model.includes('haiku');

    const response = await client.messages.create({
      model,
      max_tokens: supportsThinking ? 16000 : 4096,
      ...(supportsThinking ? { thinking: { type: 'enabled' as const, budget_tokens: 8000 } } : {}),
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content.find(b => b.type === 'text');
    return block?.type === 'text' ? block.text : 'No response generated.';
  } catch (error) {
    console.error('Error getting complex response:', error);
    return 'Sorry, I encountered an issue with the advanced query. Please try again.';
  }
};

type ChatTurn = { role: 'user' | 'model'; parts: [{ text: string }] };

export async function getChatResponse(
  history: ChatTurn[],
  systemInstruction: string
): Promise<string> {
  try {
    const messages = history.map(turn => ({
      role: (turn.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: turn.parts[0].text,
    }));

    const response = await client.messages.create({
      model: getSettings().chat,
      max_tokens: 2048,
      system: systemInstruction,
      messages,
    });

    const block = response.content.find(b => b.type === 'text');
    return block?.type === 'text' ? block.text : 'No response generated.';
  } catch (error) {
    console.error('Error getting chat response:', error);
    return "Sorry, I couldn't get a response. Please try again.";
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kevin/sourdough-pro-ai && npm run build 2>&1 | head -40
```

Expected: Build may fail because `geminiService` imports still exist in components — that is fine at this step. What must NOT appear: errors inside `claudeService.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add services/claudeService.ts
git commit -m "feat: add claudeService.ts with Anthropic SDK"
```

---

## Task 3: Clean up types.ts

**Files:**
- Modify: `types.ts`

- [ ] **Step 1: Remove the three Gemini-specific interfaces**

Open `types.ts`. Delete lines 11–25 (the `GroundingChunk`, `GroundingMetadata`, and `GeminiGroundedResponse` interfaces). The file should start with `export interface Ingredient` and contain no Gemini references. The final file:

```typescript
export interface Ingredient {
  id: number;
  name: string;
  percentage: number;
  costPerKg?: number;
  inventoryId?: string;
  weight?: number;
}

export interface RecipeSnapshot {
  numberOfLoaves: number;
  weightPerLoaf: number;
  targetLoafWeight: number;
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

export interface PlannerItem {
  uniqueId: string;
  recipe: SavedRecipe;
  count: number;
}

export type UnitOfMeasure = 'g' | 'kg' | 'lb' | 'oz' | 'ml';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  costPerKg?: number;
  lastUpdated: string;
  packageWeight?: number;
  packageUnit?: UnitOfMeasure;
  itemsPerPackage?: number;
  costPerPackage?: number;
}

export type WorkOrderStatus = 'draft' | 'scheduled' | 'in-production' | 'complete';

export interface WorkOrderLineItem {
  recipeId: string;
  recipeName: string;
  recipeVersion: number;
  count: number;
  weightPerUnit: number;
  ingredientRequirements: Record<string, number>;
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

- [ ] **Step 2: Commit**

```bash
git add types.ts
git commit -m "chore: remove Gemini-specific types from types.ts"
```

---

## Task 4: Update RecipeCost.tsx — remove cost suggestion feature

**Files:**
- Modify: `components/RecipeCost.tsx`

- [ ] **Step 1: Rewrite RecipeCost.tsx**

Replace the entire file with the version below. Changes: removed `suggestIngredientCost` import, `Spinner` import, `SparklesIcon` import, `loadingSuggestion` state, `suggestions` state, `handleSuggestCost` function, `applySuggestion` function, and the sparkle button + suggestion chip from the price cell JSX.

```typescript
import React, { useMemo } from 'react';
import { Ingredient, InventoryItem } from '../types';
import { BoxIcon } from './icons/BoxIcon';

interface RecipeCostProps {
  ingredients: Ingredient[];
  totalFlour: number;
  numberOfLoaves: number;
  onUpdateIngredientCost: (id: number, value: string) => void;
  inventory: InventoryItem[];
}

const RecipeCost: React.FC<RecipeCostProps> = ({
  ingredients,
  totalFlour,
  numberOfLoaves,
  onUpdateIngredientCost,
  inventory
}) => {
  const getInventoryCost = (name: string): number | undefined => {
      const match = inventory.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
      return match ? match.costPerKg : undefined;
  };

  const calculation = useMemo(() => {
      let totalRecipeCost = 0;
      const breakdown = ingredients.map(ing => {
          const weight = (totalFlour * (ing.percentage || 0)) / 100;
          const invCost = getInventoryCost(ing.name);
          const effectiveCostPerKg = invCost !== undefined ? invCost : (ing.costPerKg || 0);
          const cost = (weight / 1000) * effectiveCostPerKg;
          totalRecipeCost += cost;
          return {
              ...ing,
              weight,
              cost,
              costPerKg: effectiveCostPerKg,
              usingInventory: invCost !== undefined
          };
      });
      const costPerLoaf = numberOfLoaves > 0 ? totalRecipeCost / numberOfLoaves : 0;
      return { breakdown, totalRecipeCost, costPerLoaf };
  }, [totalFlour, ingredients, numberOfLoaves, inventory]);

  if (totalFlour <= 0) return null;

  return (
    <div className="bg-white dark:bg-stone-900/40 rounded-2xl border border-stone-200 dark:border-stone-800/60 p-8 shadow-sm transition-colors animate-fade-in mb-20">
      <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-stone-800 dark:text-stone-100 tracking-tight">
            Cost Analysis
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 border border-stone-200 dark:border-stone-700 px-2.5 py-1 rounded-md bg-stone-50 dark:bg-stone-950">
            Prices per kg
          </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-stone-50/50 dark:bg-stone-800/20">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest">Ingredient</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">Weight</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">Price ($/kg)</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-800/40">
            {calculation.breakdown.map(item => (
                <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/20 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-stone-800 dark:text-stone-200">
                        {item.name || 'Unnamed'}
                        {item.usingInventory && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 uppercase tracking-tighter">
                                <BoxIcon className="w-2.5 h-2.5 mr-1" /> Inv
                            </span>
                        )}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-stone-500 dark:text-stone-400 text-right">{item.weight.toFixed(0)}g</td>
                    <td className="px-4 py-4 text-right">
                        {item.usingInventory ? (
                            <span className="text-sm font-bold text-stone-800 dark:text-stone-100">${item.costPerKg?.toFixed(2)}</span>
                        ) : (
                            <div className="relative rounded-lg shadow-sm w-28 ml-auto">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <span className="text-stone-400 dark:text-stone-600 text-[11px] font-bold">$</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={item.costPerKg || ''}
                                    onChange={(e) => onUpdateIngredientCost(item.id, e.target.value)}
                                    className="bg-stone-100/50 dark:bg-stone-950/50 border-none block w-full text-[11px] font-black rounded-lg pl-6 py-2 text-right focus:ring-2 focus:ring-amber-500/20 dark:text-stone-100"
                                    placeholder="0.00"
                                />
                            </div>
                        )}
                    </td>
                    <td className="px-4 py-4 text-sm text-stone-800 dark:text-stone-200 text-right font-bold">
                        ${item.cost.toFixed(2)}
                    </td>
                </tr>
            ))}

            <tr className="bg-amber-50/50 dark:bg-amber-900/10 transition-colors">
                <td className="px-6 py-5 text-stone-800 dark:text-stone-100 text-base font-black tracking-tight">Total Batch Cost</td>
                <td className="px-4 py-5"></td>
                <td className="px-4 py-5 text-right">
                    <span className="block font-black text-amber-700 dark:text-amber-500 text-sm tracking-tight">${calculation.costPerLoaf.toFixed(2)} / loaf</span>
                </td>
                <td className="px-6 py-5 text-right text-amber-700 dark:text-amber-500 font-black text-2xl tracking-tighter">
                    ${calculation.totalRecipeCost.toFixed(2)}
                </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecipeCost;
```

- [ ] **Step 2: Commit**

```bash
git add components/RecipeCost.tsx
git commit -m "feat: remove AI cost suggestion from RecipeCost"
```

---

## Task 5: Update import paths in AiBakersChat, FermentationEngine, RecipeImporter

**Files:**
- Modify: `components/AiBakersChat.tsx` line 2
- Modify: `components/FermentationEngine.tsx` line 2
- Modify: `components/RecipeImporter.tsx` line 2

- [ ] **Step 1: Update AiBakersChat.tsx**

Change line 2 from:
```typescript
import { getChatResponse } from '../services/geminiService';
```
to:
```typescript
import { getChatResponse } from '../services/claudeService';
```

- [ ] **Step 2: Update FermentationEngine.tsx**

Change line 2 from:
```typescript
import { getComplexResponse } from '../services/geminiService';
```
to:
```typescript
import { getComplexResponse } from '../services/claudeService';
```

- [ ] **Step 3: Update RecipeImporter.tsx**

Change line 2 from:
```typescript
import { parseRecipePdf, parseRecipeText } from '../services/geminiService';
```
to:
```typescript
import { parseRecipePdf, parseRecipeText } from '../services/claudeService';
```

- [ ] **Step 4: Verify build passes**

```bash
cd /Users/kevin/sourdough-pro-ai && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no errors. (The only remaining geminiService reference at this point should be in geminiService.ts itself.)

- [ ] **Step 5: Commit**

```bash
git add components/AiBakersChat.tsx components/FermentationEngine.tsx components/RecipeImporter.tsx
git commit -m "chore: update AI imports from geminiService to claudeService"
```

---

## Task 6: Delete geminiService.ts

**Files:**
- Delete: `services/geminiService.ts`

- [ ] **Step 1: Delete the file**

```bash
rm /Users/kevin/sourdough-pro-ai/services/geminiService.ts
```

- [ ] **Step 2: Verify build still passes**

```bash
cd /Users/kevin/sourdough-pro-ai && npm run build 2>&1 | tail -20
```

Expected: Build succeeds. No references to geminiService remain.

- [ ] **Step 3: Commit**

```bash
git add -A services/geminiService.ts
git commit -m "chore: delete geminiService.ts"
```

---

## Task 7: Create components/AiSettings.tsx

**Files:**
- Create: `components/AiSettings.tsx`

- [ ] **Step 1: Create the file**

```typescript
import React, { useState } from 'react';

interface AISettings {
  chat: string;
  fermentation: string;
  import: string;
}

const DEFAULTS: AISettings = {
  chat: 'claude-haiku-4-5-20251001',
  fermentation: 'claude-sonnet-4-6',
  import: 'claude-haiku-4-5-20251001',
};

const MODEL_OPTIONS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Fast — Haiku' },
  { value: 'claude-sonnet-4-6', label: 'Balanced — Sonnet' },
  { value: 'claude-opus-4-6', label: 'Powerful — Opus' },
];

const features: { key: keyof AISettings; label: string; description: string }[] = [
  {
    key: 'chat',
    label: "Baker's Assistant",
    description: 'Conversational chat about recipes, inventory, and baking science.',
  },
  {
    key: 'fermentation',
    label: 'Fermentation Engine',
    description: 'Complex fermentation modeling with extended reasoning (Sonnet/Opus only).',
  },
  {
    key: 'import',
    label: 'Recipe Importer',
    description: 'PDF and spreadsheet recipe extraction.',
  },
];

const AiSettings: React.FC = () => {
  const [settings, setSettings] = useState<AISettings>(() => {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('bakeryos_ai_settings') || '{}') };
    } catch {
      return { ...DEFAULTS };
    }
  });

  const handleChange = (key: keyof AISettings, value: string) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('bakeryos_ai_settings', JSON.stringify(updated));
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-50">AI Settings</h2>
        <p className="text-stone-600 dark:text-stone-300 mt-1">
          Choose which Claude model each feature uses. Changes take effect on the next request.
        </p>
      </div>

      <div className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-200 dark:divide-stone-700">
        {features.map(({ key, label, description }) => (
          <div key={key} className="p-6 flex items-center justify-between gap-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-50">{label}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{description}</p>
            </div>
            <select
              value={settings[key]}
              onChange={e => handleChange(key, e.target.value)}
              className="flex-shrink-0 px-3 py-2 text-sm bg-white dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-stone-100"
            >
              {MODEL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <p className="text-xs text-stone-400 dark:text-stone-500">
        Note: Extended thinking in the Fermentation Engine requires Sonnet or Opus. Haiku will still work but without deep reasoning.
      </p>
    </div>
  );
};

export default AiSettings;
```

- [ ] **Step 2: Commit**

```bash
git add components/AiSettings.tsx
git commit -m "feat: add AiSettings component with per-feature model selection"
```

---

## Task 8: Register AiSettings in Sidebar.tsx and App.tsx

**Files:**
- Modify: `components/Sidebar.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Update Sidebar.tsx**

Make three changes:

**a) Add `'settings'` to the Tab type (line 12):**
```typescript
type Tab = 'formulas' | 'production' | 'inventory' | 'cost' | 'lab' | 'settings';
```

**b) Add a `SettingsIcon` inline component after the existing `DDTIcon` definition (after line 29):**
```typescript
const SettingsIcon: React.ComponentType<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
```

**c) Add `settings` to the `mainNavItems` array (append as last item):**
```typescript
const mainNavItems: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'formulas',  label: 'Formula Library', Icon: ClipboardIcon },
  { id: 'production', label: 'Production',     Icon: ClipboardIcon },
  { id: 'inventory', label: 'Inventory',        Icon: BoxIcon },
  { id: 'cost',      label: 'Cost & Margin',    Icon: CalculatorIcon },
  { id: 'lab',       label: 'R&D Lab',          Icon: LabIcon },
  { id: 'settings',  label: 'AI Settings',      Icon: SettingsIcon },
];
```

- [ ] **Step 2: Update App.tsx**

Make three changes:

**a) Add `'settings'` to the Tab type (line 13):**
```typescript
type Tab = 'formulas' | 'production' | 'inventory' | 'cost' | 'lab' | 'settings';
```

**b) Add the import for AiSettings after the existing imports (after line 9):**
```typescript
import AiSettings from './components/AiSettings';
```

**c) Add the `settings` case to `renderContent` (before the `default` case):**
```typescript
case 'settings':   return <AiSettings />;
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/kevin/sourdough-pro-ai && npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add components/Sidebar.tsx App.tsx
git commit -m "feat: register AI Settings tab in sidebar and app router"
```

---

## Task 9: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Tech Stack section**

Change:
```
- **Google Gemini** (`@google/genai`) — all AI calls in `services/geminiService.ts`
```
to:
```
- **Anthropic Claude** (`@anthropic-ai/sdk`) — all AI calls in `services/claudeService.ts`
```

- [ ] **Step 2: Update the Project Structure section**

Change:
```
  geminiService.ts   # All Gemini API calls, prompt templates
```
to:
```
  claudeService.ts   # All Claude API calls, prompt templates; reads bakeryos_ai_settings
```

- [ ] **Step 3: Update the Gemini Prompt Conventions section**

Replace the entire section:
```markdown
## Claude Prompt Conventions
- All weights must be in **grams** — include `NORMALIZATION_INSTRUCTIONS` from `claudeService.ts`
- Use Baker's Percentages (flour = 100%, default 1000g total flour if only % given)
- Structured JSON output preferred — no markdown fences in response
- Text tasks: default model from `bakeryos_ai_settings` (Haiku for import/chat, Sonnet for fermentation)
- Extended thinking enabled for `getComplexResponse` when model is Sonnet or Opus
- All calls non-streaming
```

- [ ] **Step 4: Update the Available Skills section**

Change:
```
- `gemini-prompt` — Claude-invoked background knowledge for AI features (not user-invocable)
```
to:
```
- `claude-prompt` — Claude-invoked background knowledge for AI features (not user-invocable)
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Claude API migration"
```

---

## Task 10: Final verification

- [ ] **Step 1: Clean build**

```bash
cd /Users/kevin/sourdough-pro-ai && npm run build 2>&1
```

Expected: `✓ built in` with no errors and no warnings about missing modules.

- [ ] **Step 2: Confirm no Gemini references remain in source**

```bash
grep -r "gemini\|@google/genai\|GoogleGenAI\|GeminiGroundedResponse\|GroundingChunk\|GroundingMetadata" \
  /Users/kevin/sourdough-pro-ai \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=docs
```

Expected: No output (zero matches).

- [ ] **Step 3: Confirm claudeService exports are all consumed**

```bash
grep -r "claudeService" /Users/kevin/sourdough-pro-ai/components --include="*.tsx"
```

Expected: Three matches — one each in `AiBakersChat.tsx`, `FermentationEngine.tsx`, `RecipeImporter.tsx`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Gemini → Claude migration complete"
```
