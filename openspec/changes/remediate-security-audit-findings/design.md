# Design

## Current Shape

```text
Browser
  │
  ├── /api/messages          no Bakery token today
  ├── /api/data/*            X-Bakery-Token
  └── /api/square/*          X-Bakery-Token

Cloudflare Worker
  ├── /api/messages ───────▶ Anthropic
  ├── /api/data/* ─────────▶ KV
  └── /api/square/* ───────▶ Square + KV private credentials
```

The target shape is one consistent API boundary:

```text
Browser
  │
  │ X-Bakery-Token
  ▼
Cloudflare Worker
  ├── /api/messages ───────▶ Anthropic
  ├── /api/data/* ─────────▶ KV app data
  └── /api/square/* ───────▶ Square using private KV credentials
```

## Auth Boundary

All Worker routes that touch private resources or paid upstream services should use the existing shared-token model:

- Browser reads `VITE_BAKERY_API_TOKEN`.
- Browser sends `X-Bakery-Token`.
- Worker compares it to `BAKERY_API_TOKEN` using the existing timing-safe comparison helper.

This includes `/api/messages`, because it spends `ANTHROPIC_API_KEY`.

## Storage Key Alignment

There are three categories of persisted data:

| Category | Examples | Sync Path |
| --- | --- | --- |
| Core app data | recipes, inventory, planner items, work orders | `/api/data/*` |
| Sales app data | distributions, Square item mappings, sales cache | `/api/data/*` |
| Private Square credentials | access tokens, Square location IDs | `/api/square/credentials` only |

`StorageKey`, `storageService.ALL_KEYS`, and Worker `VALID_DATA_KEYS` should agree for all core and sales app data. `bakeryos_square_credentials` must remain excluded everywhere except legacy cleanup tests.

## Pending Sync

The current queue only flushes when the browser fires `online`. This misses the common case where the user closes the app after a failed write and later opens it while already online.

The safer behavior:

1. `save()` still writes localStorage immediately and attempts a background push.
2. Failed pushes still queue keys in `bakeryos_pending_sync`.
3. `syncAll()` flushes pending keys as part of startup/sync flow.
4. Successful retries remove keys from the pending queue.

## Square Credential Clearing

Current merge behavior preserves existing server-side secrets when incoming token/location fields are blank. That protects against accidental erasure, but makes intentional deletion impossible.

Use explicit deletion semantics rather than guessing:

```ts
type SquareCredentialUpdate = {
  location_id: SquareLocationId;
  access_token: string;
  square_location_id: string;
  clear?: boolean;
};
```

Rules:

- `clear: true` deletes the stored credential for that location.
- Non-empty `access_token` and `square_location_id` save/update that location.
- Blank fields without `clear` preserve the existing secret.
- `GET /api/square/credentials` still returns only safe status, never tokens.

## Verification

Expected verification after implementation:

```bash
npm run build
npm run typecheck
npm test
npm audit --audit-level=moderate
```

Tests should cover:

- `/api/messages` rejects unauthenticated calls.
- Frontend AI requests include `X-Bakery-Token` when configured.
- Sales keys are accepted by `/api/data/*`.
- `bakeryos_square_credentials` is rejected by `/api/data/*`.
- Pending sync retries on startup/sync.
- Square credential clear operation changes status to `configured: false`.

