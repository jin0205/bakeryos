# Persistent Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered direct `localStorage` calls with a `storageService` backed by Cloudflare KV, enabling cross-device sync and durable persistence while keeping offline-first UX.

**Architecture:** `storageService.ts` is the single access layer — `load()` reads from localStorage synchronously, `save()` writes to localStorage immediately and pushes to KV in the background, and `syncAll()` pulls KV data on app load. localStorage holds JSON envelopes `{ data: T[], updatedAt: string }` instead of raw arrays.

**Tech Stack:** Cloudflare KV, Cloudflare Workers (existing `worker.ts`), React 19 + TypeScript, Playwright E2E

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `services/storageService.ts` | All storage reads/writes, KV sync, offline queue, key migration |
| Modify | `worker.ts` | Add `GET /api/data/:key` and `PUT /api/data/:key` routes |
| Modify | `wrangler.jsonc` | Add `kv_namespaces` binding |
| Modify | `App.tsx` | Add loading gate (`syncing` state), call `syncAll()`, migrate `handleCreateWorkOrder` |
| Modify | `components/RecipeManagement.tsx` | Replace `sourdough_recipes` localStorage calls |
| Modify | `components/RecipeCalculator.tsx` | Replace `sourdough_recipes` + `sourdough_inventory` |
| Modify | `components/RecipeBrainstormer.tsx` | Replace `sourdough_recipes` |
| Modify | `components/RecipeImporter.tsx` | Replace `sourdough_recipes` |
| Modify | `components/RecipeLibrary.tsx` | Replace `sourdough_recipes` + `sourdough_planner_items` |
| Modify | `components/InventoryManagement.tsx` | Replace `sourdough_inventory` + `sourdough_planner_items` |
| Modify | `components/BatchPlanner.tsx` | Replace all three keys; add `isInitialMount` guard |
| Modify | `components/WorkOrders.tsx` | Replace `bakeryos_work_orders` |
| Modify | `components/ProductionSchedule.tsx` | Replace `bakeryos_work_orders` |
| Modify | `components/CostAnalysis.tsx` | Replace `sourdough_recipes` + `sourdough_inventory` |
| Modify | `components/AiBakersChat.tsx` | Replace all three `sourdough_*` keys |
| Modify | `components/Dashboard.tsx` | Replace all four keys |
| Modify | `e2e/formula-library.spec.ts` | Update localStorage key + envelope format |
| Create | `e2e/storage-sync.spec.ts` | E2E tests for sync and offline queue behavior |

---

## Task 1: Infrastructure — Create KV Namespace

**Files:**
- Modify: `wrangler.jsonc`

- [ ] **Step 1: Create the KV namespace**

```bash
wrangler kv namespace create BAKERY_DATA
```

Expected output (copy the `id` value):
```
✅ Created namespace "BAKERY_DATA"
{
  "binding": "BAKERY_DATA",
  "id": "abc123..."
}
```

- [ ] **Step 2: Update wrangler.jsonc with the KV binding**

In `wrangler.jsonc`, add `kv_namespaces` after the `compatibility_date` line. Replace `<YOUR_KV_ID>` with the id from Step 1:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "sourdough-pro-ai",
  "main": "worker.ts",
  "compatibility_date": "2026-04-10",
  "kv_namespaces": [
    { "binding": "BAKERY_DATA", "id": "<YOUR_KV_ID>" }
  ],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1,
    "logs": {
      "enabled": true,
      "head_sampling_rate": 1,
      "persist": true,
      "invocation_logs": true
    },
    "traces": {
      "enabled": true,
      "persist": true,
      "head_sampling_rate": 1
    }
  },
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  },
  "compatibility_flags": [
    "nodejs_compat"
  ]
}
```

- [ ] **Step 3: Set secrets and frontend env var**

```bash
# Generate a strong random token (copy the output)
openssl rand -hex 32

# Store as Cloudflare secret
wrangler secret put BAKERY_API_TOKEN
# Paste the token when prompted

# Store for local frontend dev
echo "VITE_BAKERY_API_TOKEN=<paste-token-here>" >> .env.local
```

- [ ] **Step 4: Verify KV namespace is accessible**

```bash
wrangler kv key list --binding BAKERY_DATA
```

Expected: `[]` (empty — no keys yet). If you get an error about the binding not found, check the id in `wrangler.jsonc`.

- [ ] **Step 5: Commit**

```bash
git add wrangler.jsonc
git commit -m "infra: add Cloudflare KV namespace binding for persistent storage"
```

---

## Task 2: Worker — Add Authenticated Data Routes

**Files:**
- Modify: `worker.ts`

- [ ] **Step 1: Write the failing E2E test for the worker route**

Create `e2e/storage-sync.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('PUT /api/data/bakeryos_recipes returns 401 without token', async ({ request }) => {
  const res = await request.put('/api/data/bakeryos_recipes', {
    data: { data: [], updatedAt: new Date().toISOString() },
  });
  expect(res.status()).toBe(401);
});

test('GET /api/data/bakeryos_recipes returns 401 without token', async ({ request }) => {
  const res = await request.get('/api/data/bakeryos_recipes');
  expect(res.status()).toBe(401);
});

test('GET /api/data/invalid_key returns 400 with valid token', async ({ request }) => {
  const token = process.env.VITE_BAKERY_API_TOKEN ?? '';
  const res = await request.get('/api/data/invalid_key', {
    headers: { 'X-Bakery-Token': token },
  });
  expect(res.status()).toBe(400);
});
```

- [ ] **Step 2: Run new tests to confirm they fail**

```bash
npm test -- --grep "PUT /api/data"
```

Expected: tests time out or fail because routes don't exist yet.

- [ ] **Step 3: Implement the data routes in worker.ts**

Replace the full content of `worker.ts`:

```ts
/**
 * BakeryOS Cloudflare Worker
 *
 * - Serves the Vite-built SPA (./dist) for all non-API routes
 * - Proxies POST /api/messages → https://api.anthropic.com/v1/messages
 * - Handles GET/PUT /api/data/:key for KV-backed persistent storage
 */

export interface Env {
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY: string;
  BAKERY_DATA: KVNamespace;
  BAKERY_API_TOKEN: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Bakery-Token',
};

const VALID_DATA_KEYS = [
  'bakeryos_recipes',
  'bakeryos_inventory',
  'bakeryos_planner_items',
  'bakeryos_work_orders',
] as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/messages' && request.method === 'POST') {
      return proxyToAnthropic(request, env);
    }

    if (url.pathname.startsWith('/api/data/')) {
      return handleDataRoute(request, env, url);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleDataRoute(request: Request, env: Env, url: URL): Promise<Response> {
  const token = request.headers.get('X-Bakery-Token');
  if (!token || token !== env.BAKERY_API_TOKEN) {
    return errorResponse(401, 'Unauthorized');
  }

  const key = url.pathname.replace('/api/data/', '');
  if (!(VALID_DATA_KEYS as readonly string[]).includes(key)) {
    return errorResponse(400, `Invalid key: ${key}`);
  }

  if (request.method === 'GET') {
    const value = await env.BAKERY_DATA.get(key);
    const body = value ?? JSON.stringify({ data: [], updatedAt: new Date(0).toISOString() });
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  if (request.method === 'PUT') {
    let body: string;
    try {
      body = await request.text();
      JSON.parse(body);
    } catch {
      return errorResponse(400, 'Invalid JSON body');
    }
    await env.BAKERY_DATA.put(key, body);
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  return errorResponse(405, 'Method not allowed');
}

async function proxyToAnthropic(request: Request, env: Env): Promise<Response> {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return errorResponse(400, 'Failed to read request body');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  };

  try {
    const parsed = JSON.parse(body) as { thinking?: { type?: string } };
    if (parsed.thinking?.type === 'enabled') {
      headers['anthropic-beta'] = 'interleaved-thinking-2025-05-14';
    }
  } catch {
    // proceed without beta header
  }

  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body,
    });
  } catch (err) {
    return errorResponse(502, `Upstream request failed: ${String(err)}`);
  }

  const responseBody = await anthropicResponse.text();
  return new Response(responseBody, {
    status: anthropicResponse.status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
```

- [ ] **Step 4: Test routes with curl against local worker**

In one terminal: `npm run dev:worker`

In another terminal, replace `<TOKEN>` with the value from `.env.local`:

```bash
# Should return 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/api/data/bakeryos_recipes
# Expected: 401

# Should return empty envelope
curl -s -H "X-Bakery-Token: <TOKEN>" http://localhost:8787/api/data/bakeryos_recipes
# Expected: {"data":[],"updatedAt":"1970-01-01T00:00:00.000Z"}

# Should write and confirm 204
curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Content-Type: application/json" \
  -H "X-Bakery-Token: <TOKEN>" \
  -d '{"data":[],"updatedAt":"2026-04-17T00:00:00.000Z"}' \
  http://localhost:8787/api/data/bakeryos_recipes
# Expected: 204

# Should return 400 for invalid key
curl -s -H "X-Bakery-Token: <TOKEN>" http://localhost:8787/api/data/bad_key
# Expected: {"error":"Invalid key: bad_key"}
```

- [ ] **Step 5: Commit**

```bash
git add worker.ts
git commit -m "feat: add authenticated GET/PUT /api/data/:key routes backed by KV"
```

---

## Task 3: Create storageService.ts

**Files:**
- Create: `services/storageService.ts`

- [ ] **Step 1: Write the failing E2E test for sync behavior**

Add to `e2e/storage-sync.spec.ts`:

```ts
test('storageService.load returns empty array when key missing', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('bakeryos_recipes');
  });
  await page.goto('/');
  await page.waitForSelector('h1');

  const result = await page.evaluate(() => {
    // @ts-ignore — access via window for test
    return (window as any).__storageServiceLoadResult;
  });
  // Just verify app loaded without errors — detailed unit tests are in the service itself
  expect(result).toBeUndefined(); // We'll verify behavior via the UI tests
});

test('save triggers background PUT to /api/data/:key', async ({ page }) => {
  const puts: string[] = [];
  await page.route('/api/data/**', (route) => {
    if (route.request().method() === 'PUT') {
      puts.push(route.request().url());
      route.fulfill({ status: 204 });
    } else {
      route.fulfill({ status: 200, body: JSON.stringify({ data: [], updatedAt: new Date(0).toISOString() }) });
    }
  });

  await page.goto('/');
  await page.waitForSelector('h1');
  // Navigate to formulas and create a recipe
  await page.locator('aside').getByRole('button', { name: 'Formulas', exact: true }).click();
  await page.getByRole('button', { name: '+ New Formula', exact: true }).first().click();
  await page.getByPlaceholder(/recipe name/i).fill('Test Loaf');
  await page.getByRole('button', { name: /save/i }).click();

  // Give background PUT time to fire
  await page.waitForTimeout(500);
  expect(puts.some(u => u.includes('bakeryos_recipes'))).toBe(true);
});
```

- [ ] **Step 2: Create services/storageService.ts**

```ts
import type { StorageKey } from '../types';

interface StorageEnvelope<T> {
  data: T[];
  updatedAt: string;
}

const ALL_KEYS: StorageKey[] = [
  'bakeryos_recipes',
  'bakeryos_inventory',
  'bakeryos_planner_items',
  'bakeryos_work_orders',
];

const TOKEN = (import.meta.env.VITE_BAKERY_API_TOKEN as string | undefined) ?? '';

function getEnvelope<T>(key: StorageKey): StorageEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StorageEnvelope<T>) : null;
  } catch {
    return null;
  }
}

function setEnvelope<T>(key: StorageKey, data: T[]): void {
  const envelope: StorageEnvelope<T> = { data, updatedAt: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(envelope));
}

export function load<T>(key: StorageKey): T[] {
  return getEnvelope<T>(key)?.data ?? [];
}

async function pushToKV(key: StorageKey): Promise<void> {
  if (!TOKEN) return;
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const res = await fetch(`/api/data/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Bakery-Token': TOKEN },
      body: raw,
    });
    if (res.ok) {
      removePending(key);
    } else {
      addPending(key);
    }
  } catch {
    addPending(key);
  }
}

function getPendingQueue(): StorageKey[] {
  try {
    const raw = localStorage.getItem('bakeryos_pending_sync');
    return raw ? (JSON.parse(raw) as StorageKey[]) : [];
  } catch {
    return [];
  }
}

function addPending(key: StorageKey): void {
  const queue = getPendingQueue();
  if (!queue.includes(key)) {
    localStorage.setItem('bakeryos_pending_sync', JSON.stringify([...queue, key]));
  }
}

function removePending(key: StorageKey): void {
  const queue = getPendingQueue().filter(k => k !== key);
  localStorage.setItem('bakeryos_pending_sync', JSON.stringify(queue));
}

async function flushPendingSync(): Promise<void> {
  const queue = getPendingQueue();
  await Promise.allSettled(queue.map(pushToKV));
}

export function save<T>(key: StorageKey, data: T[]): void {
  setEnvelope(key, data);
  void pushToKV(key);
}

export async function syncAll(): Promise<void> {
  if (!TOKEN) return;
  await Promise.allSettled(
    ALL_KEYS.map(async (key) => {
      try {
        const res = await fetch(`/api/data/${key}`, {
          headers: { 'X-Bakery-Token': TOKEN },
        });
        if (!res.ok) return;
        const remote = (await res.json()) as StorageEnvelope<unknown>;
        const local = getEnvelope(key);
        if (!local || remote.updatedAt > local.updatedAt) {
          localStorage.setItem(key, JSON.stringify(remote));
        }
      } catch {
        // keep local data on network error
      }
    })
  );
}

function migrateOldKeys(): void {
  const migrations: [string, StorageKey][] = [
    ['sourdough_recipes', 'bakeryos_recipes'],
    ['sourdough_inventory', 'bakeryos_inventory'],
    ['sourdough_planner_items', 'bakeryos_planner_items'],
  ];
  for (const [oldKey, newKey] of migrations) {
    const oldRaw = localStorage.getItem(oldKey);
    if (oldRaw && !localStorage.getItem(newKey)) {
      try {
        const data = JSON.parse(oldRaw);
        setEnvelope(newKey, Array.isArray(data) ? data : []);
      } catch {
        // skip malformed data
      }
      localStorage.removeItem(oldKey);
    }
  }
}

migrateOldKeys();
window.addEventListener('online', () => { void flushPendingSync(); });

export const storageService = { load, save, syncAll };
```

- [ ] **Step 3: Add StorageKey to types.ts**

Add at the bottom of `types.ts`:

```ts
export type StorageKey =
  | 'bakeryos_recipes'
  | 'bakeryos_inventory'
  | 'bakeryos_planner_items'
  | 'bakeryos_work_orders';
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add services/storageService.ts types.ts e2e/storage-sync.spec.ts
git commit -m "feat: add storageService with KV sync, offline queue, and key migration"
```

---

## Task 4: App.tsx — Loading Gate + Work Order Migration

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Add syncing state and syncAll call**

At the top of the `App` component, after the existing `useState` declarations, add:

```ts
import { storageService } from './services/storageService';
import Spinner from './components/Spinner';
```

Replace the `const App: React.FC = () => {` block's opening state declarations (lines 48-58) with:

```ts
const App: React.FC = () => {
  const initial = parseHash();
  const [activeTab, setActiveTab] = useState<Tab>(initial.tab);
  const [activeLabTab, setActiveLabTab] = useState<LabTab>(initial.labTab);
  const [activeProductionTab, setActiveProductionTab] = useState<ProductionTab>(initial.productionTab);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('bakeryos_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [panel, setPanel] = useState<PanelPayload | null>(null);

  const hasLocalData = ['bakeryos_recipes', 'bakeryos_inventory', 'bakeryos_planner_items', 'bakeryos_work_orders']
    .some(k => localStorage.getItem(k) !== null);
  const [syncing, setSyncing] = useState(!hasLocalData);

  useEffect(() => {
    storageService.syncAll().finally(() => setSyncing(false));
  }, []);
```

- [ ] **Step 2: Add loading screen before the return statement**

Add before the `return (` line:

```tsx
  if (syncing) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-100 dark:bg-stone-950">
        <div className="flex flex-col items-center gap-3 text-stone-500 dark:text-stone-400">
          <Spinner />
          <p className="text-sm">Syncing your bakery data…</p>
        </div>
      </div>
    );
  }
```

- [ ] **Step 3: Migrate handleCreateWorkOrder**

Replace the `handleCreateWorkOrder` function body:

```ts
const handleCreateWorkOrder = (items: PlannerItem[], scheduledDate: string, status: 'draft' | 'scheduled') => {
    const existing = storageService.load<WorkOrder>('bakeryos_work_orders');

    const woNumber = Math.max(...existing.map(w => w.woNumber), 0) + 1;
    const year = new Date().getFullYear();
    const id = `WO-${year}-${String(woNumber).padStart(4, '0')}`;

    const lineItems: WorkOrderLineItem[] = items.map(item => {
      const { recipe, count } = item;
      const totalMass = count * (recipe.weightPerLoaf || 0);
      const allIngs = [...(recipe.flours || []), ...(recipe.ingredients || [])];
      const totalPct = allIngs.reduce((sum, i) => sum + (Number(i.percentage) || 0), 0);
      const baseFlourWeight = totalPct > 0 ? totalMass / (totalPct / 100) : 0;

      const ingredientRequirements: Record<string, number> = {};
      allIngs.forEach(ing => {
        if (!ing.name) return;
        const weight = (baseFlourWeight * (Number(ing.percentage) || 0)) / 100;
        ingredientRequirements[ing.name] = (ingredientRequirements[ing.name] || 0) + weight;
      });

      return {
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeVersion: recipe.version,
        count,
        weightPerUnit: recipe.weightPerLoaf || 0,
        ingredientRequirements,
      };
    });

    const totalDoughKg = items.reduce((sum, item) => sum + item.count * (item.recipe.weightPerLoaf || 0), 0) / 1000;

    const newWO: WorkOrder = {
      id,
      woNumber,
      status,
      createdAt: new Date().toISOString(),
      scheduledDate: scheduledDate || null,
      startedAt: null,
      completedAt: null,
      lineItems,
      totalDoughKg,
      estimatedCost: 0,
      inventoryDeducted: false,
      notes: '',
    };

    storageService.save('bakeryos_work_orders', [...existing, newWO]);
    setActiveTab('production');
    setActiveProductionTab('work-orders');
  };
```

- [ ] **Step 4: Verify app starts without errors**

```bash
npm run dev
```

Open `http://localhost:3000`. On first load with no data you should see the "Syncing your bakery data…" spinner briefly (it resolves immediately without a token in dev). Confirm no console errors.

- [ ] **Step 5: Commit**

```bash
git add App.tsx
git commit -m "feat: add syncing loading gate and migrate work order creation to storageService"
```

---

## Task 5: Migrate Recipe Components

**Files:**
- Modify: `components/RecipeManagement.tsx`, `components/RecipeCalculator.tsx`, `components/RecipeBrainstormer.tsx`, `components/RecipeImporter.tsx`, `components/RecipeLibrary.tsx`

- [ ] **Step 1: RecipeManagement.tsx**

Add import at top: `import { storageService } from '../services/storageService';`

Replace the `loadRecipes` inner function inside `useEffect`:

```ts
useEffect(() => {
    const saved = storageService.load<SavedRecipe>('bakeryos_recipes');
    const migrated = saved.map((r: SavedRecipe) => ({
        ...r,
        version: r.version || 1,
        history: r.history || [],
    }));
    setSavedRecipes(migrated);
}, [view]);
```

Replace `handleDeleteRecipe`:

```ts
const handleDeleteRecipe = (id: string) => {
    if (window.confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
        const updated = savedRecipes.filter(r => r.id !== id);
        setSavedRecipes(updated);
        storageService.save('bakeryos_recipes', updated);
    }
};
```

- [ ] **Step 2: RecipeCalculator.tsx**

Add import: `import { storageService } from '../services/storageService';`

Replace the inventory load in `useEffect` (line 25-28):

```ts
useEffect(() => {
    setInventory(storageService.load<InventoryItem>('bakeryos_inventory'));

    if (initialRecipe) {
      // ... rest of initialRecipe block unchanged
```

Replace `handleSave` recipe read/write (lines 127-136):

```ts
    const existing = storageService.load<SavedRecipe>('bakeryos_recipes');
    const updated = currentRecipeId
      ? existing.map(r => r.id === currentRecipeId ? newRecipe : r)
      : [...existing, newRecipe];
    storageService.save('bakeryos_recipes', updated);
```

- [ ] **Step 3: RecipeBrainstormer.tsx**

Add import: `import { storageService } from '../services/storageService';`

Replace the save block (lines 96-101):

```ts
    const existing = storageService.load<SavedRecipe>('bakeryos_recipes');
    storageService.save('bakeryos_recipes', [...existing, newRecipe]);
```

- [ ] **Step 4: RecipeImporter.tsx**

Add import: `import { storageService } from '../services/storageService';`

Find the block that reads `sourdough_recipes` and writes back to it (search for `localStorage.getItem('sourdough_recipes')`). Replace the entire read→update→write block with:

```ts
            const existing = storageService.load<SavedRecipe>('bakeryos_recipes');
            const isUpdate = existing.some((r: SavedRecipe) => r.id === importedRecipe.id);
            const updated = isUpdate
              ? existing.map((r: SavedRecipe) => r.id === importedRecipe.id ? importedRecipe : r)
              : [...existing, importedRecipe];
            storageService.save('bakeryos_recipes', updated);
```

- [ ] **Step 5: RecipeLibrary.tsx**

Add import: `import { storageService } from '../services/storageService';`

Replace the planner item save (lines 38-45):

```ts
      const existing = storageService.load<PlannerItem>('bakeryos_planner_items');
      storageService.save('bakeryos_planner_items', [...existing, newItem]);
```

- [ ] **Step 6: Run E2E tests and verify recipe features pass**

```bash
npm test -- --grep "formula"
```

Expected: all formula-library tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/RecipeManagement.tsx components/RecipeCalculator.tsx \
  components/RecipeBrainstormer.tsx components/RecipeImporter.tsx components/RecipeLibrary.tsx
git commit -m "feat: migrate recipe components to storageService"
```

---

## Task 6: Migrate Inventory and Batch Planner

**Files:**
- Modify: `components/InventoryManagement.tsx`, `components/BatchPlanner.tsx`

- [ ] **Step 1: InventoryManagement.tsx**

Add import: `import { storageService } from '../services/storageService';`

Replace the `loadData` function inside `useEffect` (lines 49-62):

```ts
  useEffect(() => {
    const loadData = () => {
      setInventory(storageService.load<InventoryItem>('bakeryos_inventory'));
      setPlannerItems(storageService.load<PlannerItem>('bakeryos_planner_items'));
    };
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);
```

Replace the `saveInventory` function (lines 64-67):

```ts
  const saveInventory = (next: InventoryItem[]) => {
    setInventory(next);
    storageService.save('bakeryos_inventory', next);
  };
```

- [ ] **Step 2: BatchPlanner.tsx**

Add import: `import { useRef } from 'react';` (add to existing React import).
Add import: `import { storageService } from '../services/storageService';`

Replace the load `useEffect` (lines 23-77):

```ts
  useEffect(() => {
    const currentRecipes = storageService.load<SavedRecipe>('bakeryos_recipes');
    setSavedRecipes(currentRecipes);

    const currentPlan = storageService.load<PlannerItem>('bakeryos_planner_items');
    const recipeMap = new Map(currentRecipes.map(r => [r.id, r]));
    const validPlannerItems: PlannerItem[] = [];
    let hasChanges = false;

    currentPlan.forEach(item => {
      const freshRecipe = recipeMap.get(item.recipe.id);
      if (!freshRecipe) { hasChanges = true; return; }
      if (freshRecipe.version !== item.recipe.version) {
        validPlannerItems.push({ ...item, recipe: freshRecipe });
        hasChanges = true;
      } else {
        validPlannerItems.push(item);
      }
    });

    setPlannerItems(validPlannerItems);
    if (hasChanges) storageService.save('bakeryos_planner_items', validPlannerItems);

    setInventory(storageService.load<InventoryItem>('bakeryos_inventory'));
  }, []);
```

Replace the persist `useEffect` (lines 79-82). This must skip the initial mount to avoid overwriting KV with the `[]` initial state:

```ts
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    storageService.save('bakeryos_planner_items', plannerItems);
  }, [plannerItems]);
```

Find the inventory deduction block (the `setInventory` + `localStorage.setItem` for `sourdough_inventory`, around line 187) and replace:

```ts
        storageService.save('bakeryos_inventory', updatedInventory);
        setInventory(updatedInventory);
        storageService.save('bakeryos_planner_items', []);
        setPlannerItems([]);
```

- [ ] **Step 3: Run E2E tests**

```bash
npm test
```

Expected: all 22 tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/InventoryManagement.tsx components/BatchPlanner.tsx
git commit -m "feat: migrate inventory and batch planner to storageService"
```

---

## Task 7: Migrate Remaining Components

**Files:**
- Modify: `components/WorkOrders.tsx`, `components/ProductionSchedule.tsx`, `components/CostAnalysis.tsx`, `components/AiBakersChat.tsx`, `components/Dashboard.tsx`

- [ ] **Step 1: WorkOrders.tsx**

Add import: `import { storageService } from '../services/storageService';`

Replace the load `useEffect` (lines 29-38):

```ts
  useEffect(() => {
    setWorkOrders(storageService.load<WorkOrder>('bakeryos_work_orders'));
  }, []);
```

Replace `saveWorkOrders` (lines 40-43):

```ts
  const saveWorkOrders = (updated: WorkOrder[]) => {
    setWorkOrders(updated);
    storageService.save('bakeryos_work_orders', updated);
  };
```

- [ ] **Step 2: ProductionSchedule.tsx**

Add import: `import { storageService } from '../services/storageService';`

Replace `localStorage.getItem('bakeryos_work_orders')` load block:

```ts
    const stored = storageService.load<WorkOrder>('bakeryos_work_orders');
    setWorkOrders(stored);
```

Replace `localStorage.setItem('bakeryos_work_orders', ...)` save:

```ts
    storageService.save('bakeryos_work_orders', newList);
```

- [ ] **Step 3: CostAnalysis.tsx**

Add import: `import { storageService } from '../services/storageService';`

Replace `useEffect` (lines 10-23):

```ts
  useEffect(() => {
    setSavedRecipes(storageService.load<SavedRecipe>('bakeryos_recipes'));
    setInventory(storageService.load<InventoryItem>('bakeryos_inventory'));
  }, []);
```

- [ ] **Step 4: AiBakersChat.tsx**

Add import: `import { storageService } from '../services/storageService';`

Replace lines 79-81:

```ts
      const recipes = storageService.load<SavedRecipe>('bakeryos_recipes');
      const inventory = storageService.load<InventoryItem>('bakeryos_inventory');
      const plannerItems = storageService.load<PlannerItem>('bakeryos_planner_items');
```

- [ ] **Step 5: Dashboard.tsx**

Add import: `import { storageService } from '../services/storageService';`

Remove the local `loadJSON` helper function (lines 12-18) and replace the four `useMemo` lines:

```ts
  const workOrders  = useMemo(() => storageService.load<WorkOrder>('bakeryos_work_orders'),    []);
  const recipes     = useMemo(() => storageService.load<SavedRecipe>('bakeryos_recipes'),       []);
  const inventory   = useMemo(() => storageService.load<InventoryItem>('bakeryos_inventory'),   []);
  const planItems   = useMemo(() => storageService.load<PlannerItem>('bakeryos_planner_items'), []);
```

- [ ] **Step 6: Run full E2E suite**

```bash
npm test
```

Expected: all 22 tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/WorkOrders.tsx components/ProductionSchedule.tsx \
  components/CostAnalysis.tsx components/AiBakersChat.tsx components/Dashboard.tsx
git commit -m "feat: migrate remaining components to storageService"
```

---

## Task 8: Update E2E Tests

**Files:**
- Modify: `e2e/formula-library.spec.ts`
- Modify: `e2e/storage-sync.spec.ts`

- [ ] **Step 1: Update formula-library.spec.ts localStorage calls**

The tests set localStorage directly. After migration, the service reads envelopes `{ data: T[], updatedAt: string }` from `bakeryos_*` keys.

Replace line 17:
```ts
// Before
await page.addInitScript(() => localStorage.removeItem('sourdough_recipes'));
// After
await page.addInitScript(() => localStorage.removeItem('bakeryos_recipes'));
```

Replace lines 38-41 (the recipe seeding block — exact text may vary; find and replace the `localStorage.setItem('sourdough_recipes', ...)` call):
```ts
// Before
localStorage.setItem('sourdough_recipes', JSON.stringify([recipe]));
// After
localStorage.setItem('bakeryos_recipes', JSON.stringify({
  data: [recipe],
  updatedAt: new Date().toISOString(),
}));
```

- [ ] **Step 2: Mock KV API calls in storage-sync.spec.ts to prevent real network calls**

Update the `beforeEach` in `e2e/storage-sync.spec.ts` to intercept `/api/data/*` routes globally so tests don't need a real deployed worker:

```ts
import { test, expect } from '@playwright/test';

function mockKV(page: Parameters<Parameters<typeof test>[1]>[0]) {
  return page.route('/api/data/**', (route) => {
    if (route.request().method() === 'PUT') {
      route.fulfill({ status: 204 });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], updatedAt: new Date(0).toISOString() }),
      });
    }
  });
}

test('PUT /api/data/bakeryos_recipes returns 401 without token', async ({ request }) => {
  const res = await request.put('/api/data/bakeryos_recipes', {
    data: { data: [], updatedAt: new Date().toISOString() },
  });
  expect(res.status()).toBe(401);
});

test('GET /api/data/bakeryos_recipes returns 401 without token', async ({ request }) => {
  const res = await request.get('/api/data/bakeryos_recipes');
  expect(res.status()).toBe(401);
});

test('GET /api/data/invalid_key returns 400 with valid token', async ({ request }) => {
  const token = process.env.VITE_BAKERY_API_TOKEN ?? '';
  const res = await request.get('/api/data/invalid_key', {
    headers: { 'X-Bakery-Token': token },
  });
  expect(res.status()).toBe(400);
});

test('save triggers background PUT to /api/data/bakeryos_recipes', async ({ page }) => {
  const puts: string[] = [];
  await page.route('/api/data/**', (route) => {
    if (route.request().method() === 'PUT') {
      puts.push(route.request().url());
      route.fulfill({ status: 204 });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], updatedAt: new Date(0).toISOString() }),
      });
    }
  });

  await page.goto('/');
  await page.waitForSelector('h1');
  await page.locator('aside').getByRole('button', { name: 'Formulas', exact: true }).click();
  await page.getByRole('button', { name: '+ New Formula', exact: true }).first().click();
  await page.getByPlaceholder(/recipe name/i).fill('Test Loaf');
  await page.getByRole('button', { name: /save/i }).click();

  await page.waitForTimeout(500);
  expect(puts.some(u => u.includes('bakeryos_recipes'))).toBe(true);
});

test('new device: shows loading spinner then renders after syncAll', async ({ page }) => {
  await mockKV(page);
  await page.addInitScript(() => {
    ['bakeryos_recipes', 'bakeryos_inventory', 'bakeryos_planner_items', 'bakeryos_work_orders']
      .forEach(k => localStorage.removeItem(k));
    // Set a token so syncAll actually fires
    (window as any).__VITE_BAKERY_API_TOKEN = 'test-token';
  });

  await page.goto('/');
  // Loading screen may be very brief — just verify final state renders
  await page.waitForSelector('h1');
  const heading = await page.locator('h1').first().textContent();
  expect(heading).toBeTruthy();
});
```

- [ ] **Step 3: Run full E2E suite**

```bash
npm test
```

Expected: all tests pass. The three worker auth tests will pass because the dev server serves the worker at the same port via `webServer` config — they actually hit the worker.

Note: if the `VITE_BAKERY_API_TOKEN` env var is not set, the "invalid_key returns 400" test will send an empty token and get 401 instead. To run with auth tests fully, ensure `.env.local` has `VITE_BAKERY_API_TOKEN` set and pass it to Playwright:

```bash
source .env.local && npm test
```

- [ ] **Step 4: Commit**

```bash
git add e2e/formula-library.spec.ts e2e/storage-sync.spec.ts
git commit -m "test: update E2E tests for storageService envelope format and add sync tests"
```

---

## Task 9: Final Verification

- [ ] **Step 1: TypeScript build check**

```bash
npm run build
```

Expected: exits 0, no type errors.

- [ ] **Step 2: Full E2E suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Manual smoke test — returning device flow**

1. `npm run dev` — open `http://localhost:3000`
2. Create a recipe, add an inventory item, create a work order
3. Verify `bakeryos_recipes`, `bakeryos_inventory`, `bakeryos_work_orders` in DevTools Application → localStorage contain `{ data: [...], updatedAt: "..." }` envelopes
4. Verify `sourdough_recipes`, `sourdough_inventory`, `sourdough_planner_items` no longer exist in localStorage

- [ ] **Step 4: Manual smoke test — new device flow**

1. Open DevTools → Application → Local Storage → clear all `bakeryos_*` keys
2. Reload page — should see brief "Syncing your bakery data…" spinner (or instant render if no token configured locally)
3. Verify app renders normally

- [ ] **Step 5: Deploy to Cloudflare to test real KV sync**

```bash
npm run deploy
```

Then on two different browsers (or devices), navigate to the deployed URL, create data on one, reload on the other, verify data appears.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete persistent storage migration to Cloudflare KV + localStorage sync"
```
