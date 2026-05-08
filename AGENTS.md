# Codex Guide for BakeryOS

This file is the Codex-facing project guide. Use `CLAUDE.md` as the broader
project memory when details differ or more context is needed.

## Session Startup

1. Read the active system/developer instructions first.
2. Read `~/.Codex/memory/MEMORY.md` if it exists and note its desk-file index.
   Do not bulk-load desk files.
3. Read `~/.Codex/memory/projects/sourdough-pro-ai/MEMORY.md` if it exists.
4. Read this file and then `CLAUDE.md`.
5. Check `git status --short --branch` before editing.

If memory index files are absent, continue normally and mention that only if it
matters to the task.

## Project Summary

BakeryOS is a sourdough/artisan bakery ERP web app for commercial baker Kevin.
It manages formulas, production scheduling, inventory, cost analysis, sales, and
R&D. AI features use Anthropic Claude through a Cloudflare Worker API proxy.

## Stack

- React 19, TypeScript 5.8, Vite 6
- Tailwind CSS only
- Cloudflare Workers for deployment and `/api/messages`
- Anthropic Claude via `services/claudeService.ts` and `worker.ts`
- `BAKERY_API_TOKEN` / `VITE_BAKERY_API_TOKEN` shared-token auth for Worker `/api/*`
- localStorage persistence through `services/storageService.ts`
- Playwright E2E tests in `e2e/`

Do not add Vercel configuration or Google Gemini dependencies.

## Common Commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm test
npm run test:headed
npm run test:ui
npm run test:report
npm run deploy
```

Playwright starts its own Vite server on port 3001 via `playwright.config.ts`.

## Repo Map

- `App.tsx`: root layout, tab routing, theme state
- `components/`: feature UI components, one file per major feature
- `components/Sidebar.tsx`: top-level tab registry and sub-tabs
- `components/ContextPanel.tsx`: quick-view slide-in panel
- `services/claudeService.ts`: AI calls and prompt templates
- `services/storageService.ts`: versioned localStorage wrapper
- `worker.ts`: Cloudflare Worker API proxy to Anthropic
- `types.ts`: shared domain and storage types
- `e2e/`: Playwright specs

## Implementation Rules

- Prefer existing patterns over new abstractions.
- Keep changes narrowly scoped to the requested behavior.
- Use `storageService.load<T>(key)` and `storageService.save(key, data)` for
  persistence; do not call raw `localStorage` in feature code.
- Prefix localStorage keys with `bakeryos_`.
- No frontend imports from Anthropic SDKs; frontend calls `/api/messages`.
- Preserve user changes in the working tree. Never reset or checkout files
  unless the user explicitly requests it.
- Use `rg` or `rg --files` for searches.
- Use `apply_patch` for hand edits.

## UI Rules

- Components should use `React.FC` with explicit prop interfaces.
- Tailwind dark mode classes must be paired, for example
  `bg-white dark:bg-stone-900`.
- The theme modes are `light` and `amoled`; do not introduce a generic `dark`
  `ThemeMode` value.
- Use amber for active/brand states and stone for neutral chrome.
- Keep the interface work-focused: dense, scannable, restrained, and efficient.
- When adding top-level features, update the component, `Sidebar.tsx`, and
  `App.tsx` together.

## Context Panel Pattern

- Table row clicks should open `ContextPanel` for quick viewing.
- Edit or action buttons should navigate to the full workbench view.
- Components that support panels should accept
  `onOpenPanel: (p: PanelPayload) => void`.

## AI Prompt Rules

- All weights must be normalized to grams.
- Use Baker's percentages where formulas are involved.
- Prefer structured JSON output without markdown fences.
- Use the model guidance in `CLAUDE.md` and `services/claudeService.ts`.

## Verification

- Run `npm run build` for general code changes.
- Run `npm run typecheck` after TypeScript or shared type changes.
- Run focused Playwright tests for affected user flows.
- Use browser or screenshot verification for meaningful UI changes.
- Report commands run and any skipped verification in the final response.

## Skills and Agents

Use project skills when they match the task:

- `bakery-domain`: formula math, DDT, hydration, levain, bake loss, scaling
- `bakery-types`: `types.ts` and storage schema changes
- `gemini-prompt`: historical name, currently used for BakeryOS AI prompt conventions
- `new-component`: top-level feature scaffolding
- `ui-reviewer`: UI review for dark mode, Tailwind consistency, accessibility
- `update`: pulls, dependency updates, and upstream sync

Use the Superpowers skills when their trigger applies, especially for
brainstorming, TDD, debugging, code review, and verification.

Use project reviewer agents when a change touches their domain:

- `worker-security-reviewer`: Worker routes, API boundaries, secrets, tokens,
  auth, CORS, KV private/public data separation
- `storage-sync-reviewer`: `storageService`, `StorageKey`, localStorage
  envelopes, Worker data keys, pending sync, persistence tests
- `claude-prompt-reviewer`: `claudeService`, `/api/messages`, prompt schemas,
  model choice, grams/Baker's percentage conventions
- `bakery-math-reviewer`: formula scaling, hydration, DDT, levain, inventory
  deduction, unit conversion, cost, sales quantity, work order totals
- `ui-reviewer`: UI components, dark mode, Tailwind consistency,
  accessibility

## Known Notes

- Current setup uses Anthropic and Bakery token Worker auth. If a historical
  plan mentions Gemini, `GEMINI_API_KEY`, direct browser Square calls, or
  `bakeryos_square_credentials` generic sync, treat it as superseded.
- Untracked local tooling directories such as `.agents/` and `.codex/` may be
  present. Do not delete them unless asked.
