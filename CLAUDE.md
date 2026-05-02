---
description: 
alwaysApply: true
---

# BakeryOS — Claude Project Memory

## Quick Start

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # required — app throws at load without it
npm install
npm run dev        # Vite dev server on port 3000
npm run build      # production build
```

**E2E tests** (`e2e/` dir, Chromium):
```bash
npm test                  # headless
npm run test:headed       # visible browser
npm run test:ui           # Playwright UI mode
npm run test:report       # view last HTML report
```

> **Note:** Playwright auto-starts the dev server on port 3001 via `webServer` in `playwright.config.ts`. No manual server needed for `npm test`.

## What This Is
BakeryOS is a sourdough/artisan bakery ERP web app for commercial baker Kevin. It manages formulas (recipes), production scheduling, inventory, cost analysis, and R&D. AI features use Anthropic Claude.

## Tech Stack
- **Primary languages:** TypeScript (frontend), Markdown (docs)
- **AI service:** Anthropic Claude — frontend calls `/api/messages` via `fetch`; the Cloudflare Worker (`worker.ts`) holds the `@anthropic-ai/sdk` dependency. No Anthropic imports belong in frontend files.
- **React 19** + **TypeScript 5.8** + **Vite 6**
- **Tailwind CSS** — dark mode via `dark:` prefix; amber/stone color palette
- **Anthropic Claude** — all AI calls in `services/claudeService.ts` via `fetch` to `/api/messages`
- **Cloudflare Workers** — `worker.ts` proxies `/api/messages` → Anthropic; `ANTHROPIC_API_KEY` stored as a Cloudflare secret
- **localStorage** — all data persistence (no backend, no database); use `storageService.load<T>(key)` / `storageService.save(key, data)` — not raw `localStorage`. Data is wrapped in a versioned envelope `{ data: T[], updatedAt: string }`.
- **Playwright** — E2E tests in `e2e/` (navigation, formula library, dark mode)

## Project Structure
```
App.tsx              # Root: tab routing, dark mode state, top-level layout
components/          # All UI — one file per feature, React.FC pattern
  Sidebar.tsx        # Nav: registers all top-level tabs + sub-tabs
  Dashboard.tsx      # Home tab: KPIs, today's schedule, quick nav
  ContextPanel.tsx   # Slide-in panel for quick recipe/inventory/order views
services/
  claudeService.ts   # All Claude API calls, prompt templates
  storageService.ts  # Typed localStorage wrapper (load/save with versioned envelopes)
types.ts             # Shared TypeScript types (Recipe, WorkOrder, etc.)
```

## UI Conventions
- Components are `React.FC` with explicit prop interfaces
- Dark mode classes always paired: `bg-white dark:bg-stone-900`
- **Theme system:** Two modes — `'light'` and `'amoled'` (no generic `'dark'` mode). The `dark:` Tailwind prefix works via a `@custom-variant` alias in `index.css` that maps it to `.theme-amoled`. Do not introduce a `'dark'` ThemeMode value.
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

## Context Panel Conventions
- Table row clicks open `ContextPanel` for quick viewing (panel payload: `{ type, id, data }`)
- Edit/action buttons open the full workbench view (navigates to the component)
- Pass `onOpenPanel: (p: PanelPayload) => void` prop to components that support panels

## How to Add a New Top-Level Feature Tab
1. Create `components/MyFeature.tsx` as `React.FC`
2. Add tab ID to the `Tab` union type in `Sidebar.tsx`
3. Add entry to `mainNavItems` array in `Sidebar.tsx` (id, label, Icon)
4. Update `SidebarProps` if sub-tabs are needed
5. Import and render in `App.tsx` tab switcher

Use skill: `/new-component MyFeature my-feature "My Feature Label"`

## AI Prompt Conventions
- All weights must be in **grams** — include `NORMALIZATION_INSTRUCTIONS` from `claudeService.ts`
- Use Baker's Percentages (flour = 100%, default 1000g total flour if only % given)
- Structured JSON output preferred — no markdown fences in response
- Vision/text tasks: `claude-sonnet-4-6`; fast/cheap tasks: `claude-haiku-4-5-20251001`
- Streaming for chat, non-streaming for single-shot analysis

## Available Skills
- `/new-component <Name> <tab-id> <Label>` — scaffold a new bakery component with correct patterns
- `gemini-prompt` — Claude-invoked background knowledge for AI prompt patterns (not user-invocable)
- `bakery-types` — Claude-invoked background knowledge for shared TypeScript types and localStorage schema (not user-invocable)
- `bakery-domain` — Claude-invoked background knowledge for baking science and math: baker's percentages, hydration, DDT, bake loss, scaling, levain ratios (not user-invocable)

## Deployment
- This project deploys to **Cloudflare Workers**, NOT Vercel
- Do not add Vercel-specific dependencies or configuration
- Static SPA with Cloudflare Workers for API proxy

Deploys to **Cloudflare Workers** (static SPA + API proxy in one Worker):

```bash
# One-time: store the API key as a Cloudflare secret
wrangler secret put ANTHROPIC_API_KEY

# Deploy
npm run deploy   # vite build && wrangler deploy
```

Local dev requires two terminals:
```bash
npm run dev          # Vite on :3000
npm run dev:worker   # Wrangler on :8787
```

## AI Service
- AI backend uses **Anthropic Claude SDK** (not Google Gemini)
- Environment variable: `ANTHROPIC_API_KEY` in `.env.local`
- Do not reference or add `@google/genai` dependencies

## Development Workflow
- Always run `npm run dev` after making dependency or environment variable changes to verify the app loads without blank pages or missing module errors.
- Always verify `.env.local` exists with required API keys before starting dev server
- Check that all dependencies are installed (`npm install`) before launching

## Git & Dependencies
- Before `git pull`, always check for unstaged changes and commit or stash them first
- When resolving merge conflicts or dependency issues, always revert to a clean state (HEAD) first rather than trying to merge both versions.
- When resolving merge conflicts in `package.json`, prefer HEAD versions and regenerate lockfile
- Regenerate lockfiles after any dependency changes (`npm install`).

## Available Agents
- `ui-reviewer` — reviews components for dark mode coverage, Tailwind consistency, and accessibility
  - Trigger: "run the ui-reviewer on [ComponentName]"
- `worker-security-reviewer` — reviews Worker routes, API boundaries, secrets, tokens, auth, CORS, and KV private/public data separation
  - Trigger after editing `worker.ts`, `wrangler.jsonc`, `/api/*` services, Square/Anthropic integrations, or token handling
- `storage-sync-reviewer` — reviews storageService, StorageKey, localStorage envelopes, Worker data keys, pending sync, and persistence tests
  - Trigger after editing persistence or sync behavior
- `claude-prompt-reviewer` — reviews Claude prompts and AI service changes for grams, Baker's %, JSON schemas, model choice, and Worker proxy usage
  - Trigger after editing `services/claudeService.ts` or `/api/messages`
- `bakery-math-reviewer` — reviews formula scaling, hydration, DDT, levain, inventory deduction, unit conversion, cost, sales quantity, and work order totals
  - Trigger after editing bakery calculation logic
