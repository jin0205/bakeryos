# Tasks

## 1. Worker and AI Auth

- [x] Add `X-Bakery-Token` header support to `services/claudeService.ts`.
- [x] Require `isAuthorized(request, env)` before `proxyToAnthropic()` in `worker.ts`.
- [x] Add tests for unauthenticated `/api/messages` returning `401`.
- [x] Add tests or route assertions that frontend AI calls send `X-Bakery-Token`.

## 2. Sales KV Sync

- [x] Add `bakeryos_distributions`, `bakeryos_square_item_map`, and `bakeryos_square_sales_cache` to Worker `VALID_DATA_KEYS`.
- [x] Add `bakeryos_square_sales_cache` to `services/storageService.ts` `ALL_KEYS`.
- [x] Verify `StorageKey`, `ALL_KEYS`, and `VALID_DATA_KEYS` stay aligned for syncable app data.
- [x] Add tests proving intended sales keys are accepted by `/api/data/*`.
- [x] Add or keep tests proving `/api/data/bakeryos_square_credentials` remains rejected.

## 3. Pending Sync Reliability

- [x] Make `syncAll()` flush pending writes when a Bakery token is configured.
- [x] Preserve offline-first behavior: local writes must still succeed even when remote sync fails.
- [x] Add a test for failed write queueing and later startup/sync retry.

## 4. Square Credential Clearing

- [x] Add a frontend-safe credential update type with an explicit `clear` flag.
- [x] Update Worker merge/delete logic so `clear: true` removes one location's saved credential.
- [x] Add a clear control in Sales Tracking settings for configured locations.
- [x] Add tests for save, status response without token, and clear-to-unconfigured behavior.

## 5. Verification and Dependency Hygiene

- [x] Add `"typecheck": "tsc --noEmit"` to `package.json`.
- [x] Run `npm audit fix` if it only applies low-risk lockfile/dependency updates.
- [x] Re-run `npm run build`, `npm run typecheck`, `npm test`, and `npm audit --audit-level=moderate`.

## 6. Documentation

- [x] Rewrite README quickstart for BakeryOS, Cloudflare Worker, Anthropic, and Bakery token setup.
- [x] Update `wrangler.jsonc` secret comments to include `ANTHROPIC_API_KEY` and `BAKERY_API_TOKEN`.
- [x] Update `CLAUDE.md` / `AGENTS.md` setup guidance where it conflicts with the current Worker secret model.
- [x] Note that historical Superpowers plans may contain superseded direct-browser Square examples.
