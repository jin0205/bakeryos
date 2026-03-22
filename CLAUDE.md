# BakeryOS — Claude Project Memory

## What This Is
BakeryOS is a sourdough/artisan bakery ERP web app for commercial baker Kevin. It manages formulas (recipes), production scheduling, inventory, cost analysis, and R&D. AI features use Google Gemini.

## Tech Stack
- **React 19** + **TypeScript 5.8** + **Vite 6**
- **Tailwind CSS** — dark mode via `dark:` prefix; amber/stone color palette
- **Google Gemini** (`@google/genai`) — all AI calls in `services/geminiService.ts`
- **localStorage** — all data persistence (no backend, no database)
- No test suite

## Project Structure
```
components/          # All UI — one file per feature, React.FC pattern
  Sidebar.tsx        # Nav: registers all top-level tabs + sub-tabs
  App.tsx (root)     # Tab routing, dark mode state, top-level layout
services/
  geminiService.ts   # All Gemini API calls, prompt templates
types.ts             # Shared TypeScript types (Recipe, WorkOrder, etc.)
```

## UI Conventions
- Components are `React.FC` with explicit prop interfaces
- Dark mode classes always paired: `bg-white dark:bg-stone-900`
- **Amber** palette for active/brand: `text-amber-600`, `bg-amber-50 dark:bg-amber-900/20`
- **Stone** palette for neutral/chrome: `text-stone-600 dark:text-stone-400`
- localStorage keys prefixed: `bakeryos_<feature>`
- No CSS modules — Tailwind only

### Common Class Patterns
| Element | Classes |
|---------|---------|
| Section card | `bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-6` |
| Page wrapper | `p-6 space-y-6` |
| Primary button | `px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium` |
| Ghost button | `px-4 py-2 text-stone-600 dark:text-stone-400 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm` |
| Page heading | `text-2xl font-bold text-stone-900 dark:text-stone-50` |
| Body text | `text-stone-600 dark:text-stone-300` |
| Table dividers | `divide-y divide-stone-200 dark:divide-stone-700` |

## How to Add a New Top-Level Feature Tab
1. Create `components/MyFeature.tsx` as `React.FC`
2. Add tab ID to the `Tab` union type in `Sidebar.tsx`
3. Add entry to `mainNavItems` array in `Sidebar.tsx` (id, label, Icon)
4. Update `SidebarProps` if sub-tabs are needed
5. Import and render in `App.tsx` tab switcher

Use skill: `/new-component MyFeature my-feature "My Feature Label"`

## Gemini Prompt Conventions
- All weights must be in **grams** — include `NORMALIZATION_INSTRUCTIONS` from `geminiService.ts`
- Use Baker's Percentages (flour = 100%, default 1000g total flour if only % given)
- Structured JSON output preferred — no markdown fences in response
- Vision tasks: `gemini-2.0-flash-preview`; text tasks: `gemini-2.0-flash`
- Streaming for chat (`AiBakersChat`), non-streaming for single-shot analysis

## Available Skills
- `/new-component <Name> <tab-id> <Label>` — scaffold a new bakery component with correct patterns
- `gemini-prompt` — Claude-invoked background knowledge for AI features (not user-invocable)

## Available Agents
- `ui-reviewer` — reviews components for dark mode coverage, Tailwind consistency, and accessibility
  - Trigger: "run the ui-reviewer on [ComponentName]"
