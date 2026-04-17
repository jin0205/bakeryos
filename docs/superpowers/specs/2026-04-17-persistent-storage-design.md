# Persistent Storage: Cloudflare KV + localStorage Sync

**Date:** 2026-04-17  
**Status:** Approved  
**Replaces:** Direct `localStorage` calls scattered across ~12 components

---

## Problem

All BakeryOS data (recipes, inventory, planner items, work orders) is stored exclusively in `localStorage`. This means:
- Data is lost if the user clears browser storage
- No cross-device sync (laptop ↔ phone in the bakery)
- Inconsistent key naming (`sourdough_*` vs `bakeryos_*`)

---

## Solution

Cloudflare KV as the persistent source of truth, with `localStorage` as a local write-through cache. A single `storageService.ts` module replaces all direct `localStorage` access across the app.

---

## Architecture

### Three Layers

**1. Cloudflare KV (`BAKERY_DATA` namespace)**  
Stores each data collection as a timestamped JSON envelope under a fixed key:
```
bakeryos_recipes          → { data: SavedRecipe[], updatedAt: string }
bakeryos_inventory        → { data: InventoryItem[], updatedAt: string }
bakeryos_planner_items    → { data: PlannerItem[], updatedAt: string }
bakeryos_work_orders      → { data: WorkOrder[], updatedAt: string }
```

**2. Worker API (additions to `worker.ts`)**  
Two new authenticated routes:
- `GET /api/data/:key` — reads envelope from KV, returns JSON
- `PUT /api/data/:key` — writes envelope to KV, returns 204

Both require header `X-Bakery-Token: <secret>` matching the `BAKERY_API_TOKEN` Cloudflare secret (set once via `wrangler secret put BAKERY_API_TOKEN`).

**3. `services/storageService.ts` (frontend)**  
Single module all components import. Exposes a synchronous-feeling API backed by async KV sync.

---

## Storage Service API

```ts
type StorageKey =
  | 'bakeryos_recipes'
  | 'bakeryos_inventory'
  | 'bakeryos_planner_items'
  | 'bakeryos_work_orders';

storageService.load<T>(key: StorageKey): T[]
// Purely synchronous. Returns localStorage value instantly (empty array if missing).
// No network call — sync happens only via syncAll().

storageService.save<T>(key: StorageKey, data: T[]): void
// Writes to localStorage immediately with fresh updatedAt timestamp.
// Fires background PUT to KV.
// If offline: queues the write in bakeryos_pending_sync for later.

storageService.syncAll(): Promise<void>
// Fetches all 4 keys from KV in parallel, updates localStorage where KV is newer.
// Returns when all fetches settle (success or failure).
// Called once in App.tsx before first render.
```

**Internal localStorage keys managed by the service:**
- `bakeryos_recipes`, `bakeryos_inventory`, `bakeryos_planner_items`, `bakeryos_work_orders` — data envelopes `{ data, updatedAt }`
- `bakeryos_pending_sync` — array of `{ key, updatedAt }` for offline writes not yet pushed to KV

---

## Sync Strategy

### Conflict Resolution
Last-write-wins by `updatedAt` timestamp (ISO 8601). Sufficient for a single user who will not write on two devices simultaneously.

### Sync-Down (on load)
1. `App.tsx` calls `storageService.syncAll()` before rendering main content.
2. If localStorage is empty (new device): show a brief loading spinner, await `syncAll()`, then render — ensures components initialize from KV-populated localStorage, not empty arrays.
3. If localStorage has data (returning device): render immediately using local data; `syncAll()` runs in background and updates localStorage silently (components get fresh data on next interaction).
4. For each of the 4 keys, fetch KV envelope in parallel. Compare KV `updatedAt` vs local `updatedAt`. If KV is newer: replace localStorage data.

### Sync-Up (on every save)
1. Write to localStorage immediately → UI updates without waiting for network.
2. Background `PUT /api/data/:key` to worker.
3. On failure (offline or network error): push `{ key, updatedAt }` to `bakeryos_pending_sync`.

### Offline Recovery
- `window.addEventListener('online', flushPendingSync)` drains the pending queue when connectivity returns.
- Each pending item replays a `PUT` with its stored data from localStorage.

### Cross-Device Scenario
Device B comes online after Device A made changes → `syncAll()` on load sees Device A's newer KV timestamp → overwrites Device B's stale localStorage before any edits occur. No data loss since Device B hadn't made conflicting edits while offline.

---

## Component Migration

### Key Normalization
One-time migration on first load: if `sourdough_recipes` exists but `bakeryos_recipes` doesn't, copy and delete. Same for `sourdough_inventory` and `sourdough_planner_items`. Preserves existing data on the user's current device.

### Before / After Pattern

**Before:**
```ts
const data = JSON.parse(localStorage.getItem('sourdough_recipes') || '[]');
localStorage.setItem('sourdough_recipes', JSON.stringify(updated));
```

**After:**
```ts
const data = storageService.load<SavedRecipe>('bakeryos_recipes');
storageService.save('bakeryos_recipes', updated);
```

### Files to Migrate
| Component | Old Key(s) |
|-----------|-----------|
| `RecipeManagement.tsx` | `sourdough_recipes` |
| `RecipeLibrary.tsx` | `sourdough_recipes`, `sourdough_planner_items` |
| `RecipeCalculator.tsx` | `sourdough_recipes`, `sourdough_inventory` |
| `RecipeBrainstormer.tsx` | `sourdough_recipes` |
| `RecipeImporter.tsx` | `sourdough_recipes` |
| `InventoryManagement.tsx` | `sourdough_inventory`, `sourdough_planner_items` |
| `BatchPlanner.tsx` | `sourdough_recipes`, `sourdough_planner_items`, `sourdough_inventory` |
| `CostAnalysis.tsx` | `sourdough_recipes`, `sourdough_inventory` |
| `WorkOrders.tsx` | `bakeryos_work_orders` |
| `ProductionSchedule.tsx` | `bakeryos_work_orders` |
| `AiBakersChat.tsx` | `sourdough_recipes`, `sourdough_inventory`, `sourdough_planner_items` |
| `Dashboard.tsx` | `bakeryos_work_orders` |
| `App.tsx` | `bakeryos_work_orders` (+ add `syncAll` call) |

---

## Security

- `BAKERY_API_TOKEN` stored as a Cloudflare secret (never in code or `.env` committed to git)
- Frontend reads token from `import.meta.env.VITE_BAKERY_API_TOKEN` (in `.env.local`, gitignored)
- Worker validates header on every `/api/data/*` request; returns 401 if missing or wrong
- This is a personal tool — a shared secret is sufficient; no OAuth/JWT needed

---

## Infrastructure Changes

**`wrangler.jsonc`** — add KV binding:
```jsonc
"kv_namespaces": [
  { "binding": "BAKERY_DATA", "id": "<kv-namespace-id>" }
]
```

**`worker.ts`** — add `BAKERY_DATA` and `BAKERY_API_TOKEN` to `Env` interface; add routing for `GET /api/data/:key` and `PUT /api/data/:key`.

**One-time setup:**
```bash
wrangler kv namespace create BAKERY_DATA   # copy the id into wrangler.jsonc
wrangler secret put BAKERY_API_TOKEN       # set a strong random token
echo "VITE_BAKERY_API_TOKEN=<same-token>" >> .env.local
```

---

## What This Does Not Change

- No changes to `types.ts` data shapes
- No changes to how components manage React state (they still call load on mount, save on change)
- No new npm dependencies
- Existing E2E tests remain valid (they use localStorage directly in test setup; storageService falls back to localStorage gracefully)
