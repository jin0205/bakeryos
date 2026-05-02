# BakeryOS System-Wide Security Audit

Date: 2026-05-01
Workspace: `/Users/kevin/sourdough-pro-ai`
Branch: `main`
Commit: `47238ad`
Node: `v25.5.0`
npm: `11.8.0`
Dependencies installed: yes

## Scope

This audit covers the current dirty workspace, including the uncommitted Square credential security changes and newly added reviewer-agent configuration. It focuses on secrets handling, Cloudflare Worker API boundaries, browser storage, KV sync, dependency supply chain, frontend/browser attack surface, AI proxy behavior, deployment documentation, and bakery/sales data integrity.

## Worktree State

```text
## main...origin/main
 D .claude/agents/gemini-prompt-reviewer.md
 M AGENTS.md
 M CLAUDE.md
 M components/ContextPanel.tsx
 M components/SalesTracking.tsx
 M e2e/sales-tracking.spec.ts
 M e2e/storage-sync.spec.ts
 M services/squareService.ts
 M types.ts
 M worker.ts
?? .agents/
?? .claude/agents/bakery-math-reviewer.md
?? .claude/agents/claude-prompt-reviewer.md
?? .claude/agents/storage-sync-reviewer.md
?? .claude/agents/worker-security-reviewer.md
?? .codex/
?? .cursor/hooks/state/continual-learning-index.json
?? docs/superpowers/plans/2026-05-01-system-wide-security-audit.md
```

## Protected Assets

- Anthropic API key.
- Bakery API token.
- Square access tokens and location IDs.
- Cloudflare KV application data.
- Browser `localStorage` data.
- Uploaded/imported recipe and sales files.
- AI prompt and response payloads.

## Severity Scale

- `P0`: exploitable credential leak, unauthenticated write/read of private data, or data-loss path with no workaround.
- `P1`: serious exposure, broken auth boundary, durable secret mishandling, or sync failure that silently loses important behavior.
- `P2`: important reliability/security gap, missing verification, stale docs that lead to insecure setup, or moderate dependency risk.
- `P3`: hardening, clarity, or future-risk item.

## Findings

| ID | Severity | Status | Area | Summary |
| --- | --- | --- | --- | --- |
| SEC-001 | P1 | Open | Worker / AI proxy | `/api/messages` is unauthenticated and can spend the Anthropic API key. |
| SEC-002 | P1 | Open | Worker / KV sync | Worker rejects sales data keys that the client saves through `storageService`. |
| SEC-003 | P2 | Open | Storage sync | Pending sync queue only flushes on browser `online` events, not app startup. |
| SEC-004 | P2 | Open | Square credentials | Saved Square credentials cannot be cleared from the UI/API because blank values preserve existing secrets. |
| SEC-005 | P2 | Open | Dependencies | `npm audit` reports vulnerable `postcss <8.5.10`. |
| SEC-006 | P2 | Open | Verification | `package.json` lacks a normal `typecheck` script. |
| SEC-007 | P2 | Open | Documentation/deploy | README and Worker config docs are stale or incomplete for current secret setup. |
| SEC-008 | P3 | Open | Browser import | PDF import has MIME checking but no size bound before base64 upload to the AI proxy. |
| SEC-009 | P3 | Open | Data integrity | Committing a bake can drive inventory quantities below zero. |
| SEC-010 | P3 | Open | Worker hardening | Worker accepts any valid JSON for generic KV data without envelope/schema validation. |

## Audit Pass Notes

### Secrets and Worker API Boundaries

Search performed:

```bash
rg -n "API_KEY|TOKEN|secret|Authorization|Bearer|access_token|localStorage|sessionStorage|connect\\.squareup|anthropic|X-Bakery-Token" -g '!node_modules' -g '!dist'
```

Evidence:

- `worker.ts:43-44` routes `POST /api/messages` directly to `proxyToAnthropic()` without `isAuthorized()`.
- `worker.ts:59-62` authenticates `/api/data/*`, and `worker.ts:93-96` authenticates `/api/square/*`.
- `worker.ts:346-349` adds `ANTHROPIC_API_KEY` to the upstream Anthropic request.
- `services/claudeService.ts:67-72` calls `/api/messages` with only `Content-Type`, no `X-Bakery-Token`.
- `services/squareService.ts:3-8` and `services/storageService.ts:17,42-45,93-95` do send `X-Bakery-Token` when configured.
- `worker.ts:100-108` returns Square credential status with `configured` and `square_location_id`, but not `access_token`.
- `components/SalesTracking.tsx:92,122` removes legacy `bakeryos_square_credentials` from browser storage.
- `types.ts:121-128` does not include `bakeryos_square_credentials` in `StorageKey`.

Finding SEC-001: `/api/messages` is unauthenticated and can spend the Anthropic API key.

- Severity: P1.
- Affected files: `worker.ts:43-44`, `services/claudeService.ts:67-72`.
- Plain-English impact: anyone who can reach the deployed Worker can send prompts through the app's Anthropic account, causing cost and quota abuse.
- Technical cause: the Worker auth check is applied to data and Square routes but not the AI proxy route, and the frontend AI service does not send `X-Bakery-Token`.
- Recommended fix: require `isAuthorized(request, env)` before `proxyToAnthropic()`, update `services/claudeService.ts` to send `VITE_BAKERY_API_TOKEN`, and add tests for unauthenticated `401` and authenticated success path.
- Verification: Worker/API test for `POST /api/messages` without token returning `401`; E2E/route assertion that AI requests include `X-Bakery-Token`.

Finding SEC-004: saved Square credentials cannot be cleared.

- Severity: P2.
- Affected file: `worker.ts:195-202`.
- Plain-English impact: if the user saves the wrong Square token or wants to revoke a location, blanking fields in the UI will not remove the old server-side secret.
- Technical cause: `mergeSquareCredentials()` uses `next?.access_token.trim() || current?.access_token || ''` and the same preserve-old behavior for Square location ID.
- Recommended fix: make credential PUT semantics explicit, for example include a `delete` flag per location or treat an intentionally blank `access_token` plus blank `square_location_id` as deletion.
- Verification: test saving a configured credential, then clearing it, and confirming status returns `configured: false`.

### Browser Storage and KV Sync

Evidence:

- `types.ts:121-128` includes seven frontend `StorageKey` values, including sales data.
- `services/storageService.ts:8-15` syncs six keys and omits `bakeryos_square_sales_cache`.
- `worker.ts:24-29` accepts only the four original core keys: recipes, inventory, planner items, work orders.
- `components/SalesTracking.tsx:128,142,481` saves Square item mappings, sales cache, and distributions through `storageService`.
- `services/storageService.ts:78-80,129-130` flushes pending sync only on the browser `online` event.

Finding SEC-002: Worker rejects sales data keys that the client saves.

- Severity: P1.
- Affected files: `worker.ts:24-29`, `services/storageService.ts:8-15`, `components/SalesTracking.tsx:128,142,481`.
- Plain-English impact: sales tracking appears to use sync, but distribution logs, Square item mappings, and sales cache will not persist to KV because Worker returns `400 Invalid key`.
- Technical cause: frontend storage keys and Worker `VALID_DATA_KEYS` are out of sync.
- Recommended fix: add `bakeryos_distributions`, `bakeryos_square_item_map`, and `bakeryos_square_sales_cache` to Worker `VALID_DATA_KEYS`, add `bakeryos_square_sales_cache` to `ALL_KEYS`, and keep `bakeryos_square_credentials` excluded.
- Verification: tests that each intended sales data key can `PUT` and `GET` through `/api/data/*`, while `/api/data/bakeryos_square_credentials` remains rejected.

Finding SEC-003: pending sync queue can remain stale indefinitely.

- Severity: P2.
- Affected file: `services/storageService.ts:78-80,129-130`.
- Plain-English impact: if a save fails and the user later opens the app while already online, queued writes may never replay.
- Technical cause: `flushPendingSync()` is only called from an `online` event listener and not during `syncAll()` or module startup.
- Recommended fix: call `flushPendingSync()` during `syncAll()` after pull completion or during startup when a token is configured.
- Verification: test a failed PUT queues a key, reload while online, and assert the queued key is retried and removed after success.

Finding SEC-010: generic KV accepts any JSON body.

- Severity: P3.
- Affected file: `worker.ts:78-86`.
- Plain-English impact: an authenticated bad client or broken UI can write malformed envelopes to KV and later confuse app loading.
- Technical cause: Worker validates only parseable JSON, not `{ data: array, updatedAt: ISO string }`.
- Recommended fix: validate the storage envelope shape before writing, and optionally validate known key payload types where practical.
- Verification: tests for invalid envelope rejection and valid envelope acceptance.

### Dependencies and Supply Chain

Commands run:

```bash
npm ls vite @vitejs/plugin-react postcss wrangler @cloudflare/workers-types
npm audit --audit-level=moderate
```

Evidence:

- Installed tree resolves `vite@6.4.2`, `@vitejs/plugin-react@5.1.4`, `postcss@8.5.6`, `wrangler@4.81.1`, and `@cloudflare/workers-types@4.20260412.1`.
- `npm audit --audit-level=moderate` reports one moderate vulnerability:
  - `postcss <8.5.10`
  - Advisory: `GHSA-qx2v-qp2m-jg93`
  - `npm audit fix` is available.
- `package.json:6-16` has `build` and `test` scripts but no `typecheck` script.
- No `.github/` directory is present.

Finding SEC-005: vulnerable `postcss <8.5.10`.

- Severity: P2.
- Affected files: `package-lock.json`, dependency tree through Vite.
- Plain-English impact: the project has a known moderate dependency vulnerability in CSS stringification.
- Technical cause: current resolved dependency is `postcss@8.5.6`.
- Recommended fix: run `npm audit fix`, inspect lockfile changes, and rerun build/typecheck/tests.
- Verification: `npm audit --audit-level=moderate` returns no vulnerabilities.

Finding SEC-006: type checking is not part of normal scripts.

- Severity: P2.
- Affected file: `package.json:6-16`.
- Plain-English impact: `npm run build` can pass while TypeScript errors remain, which can hide security and reliability bugs.
- Technical cause: Vite transpiles without full type checking and there is no `typecheck` script.
- Recommended fix: add `"typecheck": "tsc --noEmit"` and include it in the standard verification routine.
- Verification: `npm run typecheck` passes.

### Frontend and Browser Attack Surface

Search performed:

```bash
rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|eval\\(|new Function|postMessage|URL\\(|FileReader|localStorage|sessionStorage|fetch\\(" components services e2e
```

Evidence:

- No `dangerouslySetInnerHTML`, raw `innerHTML`, `eval`, `new Function`, or `postMessage` uses were found in app code.
- `components/MarkdownRenderer.tsx` renders markdown-like output through React text nodes, including code blocks and inline bold/code, instead of HTML injection.
- `components/RecipeImporter.tsx:51-58` checks uploaded file MIME type for `application/pdf`.
- `services/claudeService.ts:84-89` converts uploaded files to base64 without a size guard.

Finding SEC-008: PDF import has no size bound.

- Severity: P3.
- Affected files: `components/RecipeImporter.tsx:51-58`, `services/claudeService.ts:84-89,118-146`.
- Plain-English impact: a very large PDF can be read into memory and sent to the AI proxy, causing slowdowns or unnecessary API cost for the authenticated user.
- Technical cause: the upload path checks MIME type but not file size before base64 conversion.
- Recommended fix: reject PDFs above a clear maximum size before calling `parseRecipePdf()`, and handle `FileReader.onerror`.
- Verification: add UI/unit coverage for oversized PDF rejection.

### AI and LLM Proxy Surface

Evidence:

- Browser code does not contain `ANTHROPIC_API_KEY`; the Worker adds it server-side at `worker.ts:346-349`.
- `services/claudeService.ts` builds prompts from recipe text, uploaded PDFs/images, bakery state, and user chat input.
- AI JSON parsing is defensive in several locations, for example `RecipeImporter.tsx:72-78` and `claudeService.ts:335-339`, but schema validation is still shallow.
- `/api/messages` forwards upstream Anthropic response bodies directly to the browser at `worker.ts:372-376`.

Main security finding for this section is SEC-001. Additional hardening:

- Add request body size limits for `/api/messages`.
- Validate model names and cap `max_tokens` server-side so the browser cannot request arbitrary expensive payloads.
- Consider normalizing upstream errors so provider diagnostics are not exposed verbatim.

### Deployment Configuration and Documentation

Evidence:

- `README.md:5-18` still describes an AI Studio/Gemini app and tells developers to set `GEMINI_API_KEY`.
- `wrangler.jsonc:34-35` documents `ANTHROPIC_API_KEY` but not `BAKERY_API_TOKEN`.
- `CLAUDE.md:11,108-124` mentions Anthropic setup, but still says `ANTHROPIC_API_KEY` in `.env.local`; current Worker production expects it as a Cloudflare secret, while frontend auth needs `VITE_BAKERY_API_TOKEN`.
- Historical docs under `docs/superpowers/plans/2026-04-22-sales-tracking.md` still describe direct browser Square API calls and localStorage credentials. They are historical, but dangerous if copied as current guidance.

Finding SEC-007: setup docs point to stale or incomplete secrets.

- Severity: P2.
- Affected files: `README.md:5-18`, `wrangler.jsonc:34-35`, `CLAUDE.md:108-124`.
- Plain-English impact: a developer following current docs can configure Gemini instead of Anthropic, omit `BAKERY_API_TOKEN`, or misunderstand which secrets belong in Cloudflare versus `.env.local`.
- Technical cause: docs were not fully updated after the Gemini-to-Claude migration, KV sync, and Square Worker proxy changes.
- Recommended fix: rewrite README quickstart, document `wrangler secret put ANTHROPIC_API_KEY`, `wrangler secret put BAKERY_API_TOKEN`, and `.env.local` `VITE_BAKERY_API_TOKEN`, and mark historical plans as historical.
- Verification: fresh-developer setup checklist in README matches current source and Worker config.

### Bakery Data Integrity and Business Logic Abuse

Search performed:

```bash
rg -n "parseFloat|parseInt|Number\\(|toFixed|percentage|hydration|yield|price|sales|date|Date\\(" components services types.ts
```

Evidence:

- Sales quantity fields have `min={1}` and fallback to `1` at `components/SalesTracking.tsx:384-389,653-659`.
- `computeSellThrough()` intentionally allows sell-through above 100% and negative remaining values at `components/SalesTracking.tsx:54-58`; this may be useful as an over-sell signal.
- `BatchPlanner.tsx:148-154` subtracts ingredient requirements from inventory without checking whether the result goes below zero.
- Recipe importer rejects all-zero/no-positive ingredient weights but allows individual negative weights in imported output at `components/RecipeImporter.tsx:84-92`.

Finding SEC-009: committing a bake can drive inventory below zero.

- Severity: P3.
- Affected file: `components/BatchPlanner.tsx:148-154`.
- Plain-English impact: the app can record impossible negative stock after a bake, which can corrupt procurement and availability decisions.
- Technical cause: commit logic subtracts required weight from inventory without blocking or confirming deficits.
- Recommended fix: calculate deficits before commit, block by default, and require an explicit override if negative inventory should be allowed.
- Verification: add a test where required flour exceeds stock and assert commit is blocked or produces a deliberate override path.

Data-quality hardening:

- Reject negative imported ingredient weights before preview/save.
- Clamp or explicitly label over-100% sell-through as oversold rather than silently treating it as normal.

## Verification

Commands run:

```bash
npm run build
npx tsc --noEmit
npm test
npm audit --audit-level=moderate
```

Results:

- `npm run build`: passed. Vite built 62 modules successfully.
- `npx tsc --noEmit`: passed.
- `npm test`: passed, 37 Playwright tests. The run emitted Vite proxy `ECONNREFUSED` noise for `/api/data/*` because the Worker dev server was not running, but the suite exited successfully.
- `npm audit --audit-level=moderate`: failed with one moderate advisory for `postcss <8.5.10`; see SEC-005.

## Remediation Priority

### Must Fix Before Deploy

1. SEC-001: Require Bakery token auth for `/api/messages` and update `claudeService.ts` to send `X-Bakery-Token`.
2. SEC-002: Align Worker `VALID_DATA_KEYS`, frontend `StorageKey`, and `storageService.ALL_KEYS` so sales data syncs while Square credentials remain private.

### Should Fix Soon

1. SEC-003: Flush pending sync on startup or `syncAll()`.
2. SEC-004: Add explicit Square credential deletion/clearing semantics.
3. SEC-005: Run and inspect `npm audit fix`.
4. SEC-006: Add `npm run typecheck`.
5. SEC-007: Update README, Worker secret comments, and Claude/Codex setup docs.

### Hardening / Backlog

1. SEC-008: Add upload size limits and `FileReader.onerror`.
2. SEC-009: Prevent or explicitly confirm negative inventory.
3. SEC-010: Validate KV data envelopes server-side.

## Final Summary

No P0 findings were found. Two P1 release blockers remain open: unauthenticated Anthropic proxy access and broken KV sync for sales data. The Square token isolation work is materially better than the earlier localStorage design: saved Square tokens are no longer returned to the browser or allowed through generic `/api/data/*`, but token lifecycle still needs a clear delete path.
