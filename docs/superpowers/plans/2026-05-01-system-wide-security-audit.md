# System-Wide Security Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` when delegating independent audit passes, or `superpowers:executing-plans` when running this plan sequentially. Track progress by changing each `- [ ]` item to `- [x]` as it is completed.

**Goal:** Perform a system-wide security audit of BakeryOS, produce an evidence-backed risk register, and identify or implement prioritized fixes for secrets handling, Worker API boundaries, storage sync, dependencies, browser surfaces, AI proxy behavior, and deployment configuration.

**Architecture:** The audit is split into focused passes that can run independently: baseline and threat model, secrets/API boundary, storage/KV sync, dependency supply chain, frontend/browser surface, AI/LLM surface, deployment/docs, bakery data integrity, and final risk register. Each pass records evidence, concrete findings, tests performed, and recommended fixes.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Cloudflare Workers/KV, Playwright, npm, Wrangler, browser `localStorage`, Worker-authenticated APIs using `BAKERY_API_TOKEN` / `VITE_BAKERY_API_TOKEN`.

---

## Task 1: Establish Audit Baseline

**Files to inspect:**
- `package.json`
- `package-lock.json`
- `worker.ts`
- `wrangler.jsonc`
- `vite.config.ts`
- `types.ts`
- `services/*.ts`
- `components/*.tsx`
- `e2e/*.spec.ts`
- `README.md`
- `AGENTS.md`
- `CLAUDE.md`

**Steps:**
- [ ] Record the current branch, commit, and dirty worktree state in a new audit report at `docs/security/2026-05-01-security-audit.md`.
- [ ] Record the command environment: Node/npm versions, current date, and whether dependency installation is already present.
- [ ] Create a threat model section covering these protected assets:
  - Anthropic API key.
  - Bakery API token.
  - Square access tokens and location IDs.
  - Cloudflare KV application data.
  - Browser `localStorage` data.
  - Uploaded/imported recipe and sales files.
  - AI prompt and response payloads.
- [ ] Define severity levels:
  - `P0`: exploitable credential leak, unauthenticated write/read of private data, or data-loss path with no workaround.
  - `P1`: serious exposure, broken auth boundary, durable secret mishandling, or sync failure that silently loses important behavior.
  - `P2`: important reliability/security gap, missing verification, stale docs that lead to insecure setup, or moderate dependency risk.
  - `P3`: hardening, clarity, or future-risk item.

**Commands:**
```bash
git status --short --branch
git rev-parse --short HEAD
node --version
npm --version
```

**Acceptance criteria:**
- [ ] `docs/security/2026-05-01-security-audit.md` exists and contains baseline metadata, threat model, severity definitions, and an empty findings table.

---

## Task 2: Audit Secrets and Worker API Boundaries

**Primary questions:**
- Are private secrets ever persisted in browser storage?
- Can browser code call third-party APIs directly with durable credentials?
- Are Worker routes consistently authenticated before accessing KV or upstream APIs?
- Do safe status APIs avoid returning private tokens?

**Files to inspect:**
- `worker.ts`
- `services/claudeService.ts`
- `services/squareService.ts`
- `services/storageService.ts`
- `components/SalesTracking.tsx`
- `types.ts`
- `wrangler.jsonc`
- `.env*` filenames only; do not print secret values.

**Steps:**
- [ ] Search for credential strings and auth flows:
```bash
rg -n "API_KEY|TOKEN|secret|Authorization|Bearer|access_token|localStorage|sessionStorage|connect\\.squareup|anthropic|X-Bakery-Token" -g '!node_modules' -g '!dist'
```
- [ ] Verify Square access tokens are only accepted by `PUT /api/square/credentials` and are never returned by `GET /api/square/credentials`.
- [ ] Verify `worker.ts` checks `BAKERY_API_TOKEN` before all `/api/data/*`, `/api/messages`, and `/api/square/*` behaviors that touch KV or upstream APIs.
- [ ] Verify `bakeryos_square_credentials` is not in `VALID_DATA_KEYS`, `StorageKey`, or generic sync lists.
- [ ] Verify the frontend removes any legacy `bakeryos_square_credentials` browser storage key.
- [ ] Check whether CORS `Access-Control-Allow-Origin: *` is acceptable with the current token model. If not, file a P1/P2 hardening finding with concrete allowed-origin options.
- [ ] Run the `worker-security-reviewer` agent or equivalent focused review on `worker.ts`, `services/squareService.ts`, and `services/claudeService.ts`.

**Tests to run or add:**
- [ ] Confirm `/api/data/bakeryos_square_credentials` is rejected.
- [ ] Confirm credential status includes `configured` and never includes `access_token`.
- [ ] Confirm browser catalog and sync requests go to `/api/square/*`, not `connect.squareup.com`.
- [ ] Confirm direct unauthenticated Worker calls return `401`.

**Acceptance criteria:**
- [ ] The audit report includes a secrets/API-boundary section with evidence and findings.
- [ ] Any P0/P1 secret exposure is either fixed immediately or clearly isolated with a blocking remediation plan.

---

## Task 3: Audit Browser Storage and KV Sync

**Primary questions:**
- Do client and Worker agree on the exact set of syncable keys?
- Can failed writes get stuck indefinitely?
- Can stale remote data overwrite newer local data?
- Are queued writes flushed when the app starts online?

**Files to inspect:**
- `types.ts`
- `services/storageService.ts`
- `worker.ts`
- `components/ContextPanel.tsx`
- `components/SalesTracking.tsx`
- `e2e/storage-sync.spec.ts`
- `e2e/sales-tracking.spec.ts`

**Steps:**
- [ ] Compare `StorageKey`, `ALL_KEYS`, and Worker `VALID_DATA_KEYS`.
- [ ] Confirm every syncable frontend key is accepted by the Worker and every Worker key has a frontend owner.
- [ ] Review pending sync behavior for failed saves, app reloads, online events, token changes, and repeated failures.
- [ ] Review `syncAll()` merge behavior for local-vs-remote conflicts and stale overwrites.
- [ ] Verify sales mappings, distributions, and cache sync through generic app data while Square credentials do not.
- [ ] Run the `storage-sync-reviewer` agent or equivalent focused review on `services/storageService.ts`, `worker.ts`, and storage-related tests.

**Tests to run or add:**
- [ ] Failed write queues a pending entry.
- [ ] Pending entries flush on app startup when already online and token is configured.
- [ ] Worker accepts all intended sales data keys.
- [ ] Worker rejects private Square credential keys.

**Acceptance criteria:**
- [ ] The audit report includes all storage key mismatches and sync failure modes.
- [ ] Any P1 data-sync bug has a direct fix plan or implemented patch.

---

## Task 4: Audit Dependencies and Supply Chain

**Primary questions:**
- Are dependencies known-vulnerable?
- Are build and verification scripts strong enough to catch security-relevant mistakes?
- Are Cloudflare and Vite versions current enough for known advisories?

**Files to inspect:**
- `package.json`
- `package-lock.json`
- `.github/` if present
- `playwright.config.ts`
- `vite.config.ts`

**Commands:**
```bash
npm audit --audit-level=moderate
npm ls vite @vitejs/plugin-react postcss wrangler @cloudflare/workers-types
npm run build
npx tsc --noEmit
npm test
```

**Steps:**
- [ ] Record `npm audit` output in summarized form, not full noisy logs.
- [ ] Identify whether `npm audit fix` would change only patch/minor dependencies or introduce risky major changes.
- [ ] Check whether `package.json` has a `typecheck` script. If missing, file or implement a P2 fix.
- [ ] Check whether normal verification includes build, typecheck, unit tests, and e2e tests where applicable.
- [ ] Review package scripts for unsafe shell patterns or commands that might leak env values.

**Acceptance criteria:**
- [ ] Dependency vulnerabilities are listed with package, severity, path, and recommended action.
- [ ] Missing verification scripts are listed as findings or fixed.

---

## Task 5: Audit Frontend and Browser Attack Surface

**Primary questions:**
- Can untrusted input become executable HTML or script?
- Can user-supplied URLs be abused for SSRF-like behavior, token leakage, or confusing browser fetches?
- Are file imports parsed safely and bounded?
- Does UI reveal sensitive values after save?

**Files to inspect:**
- `components/*.tsx`
- `services/*.ts`
- `hooks/*.ts` if present
- `e2e/*.spec.ts`

**Searches:**
```bash
rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|eval\\(|new Function|postMessage|URL\\(|FileReader|localStorage|sessionStorage|fetch\\(" components services hooks e2e
```

**Steps:**
- [ ] Review all raw HTML, dynamic rendering, and markdown-like display paths.
- [ ] Review recipe import URL behavior in `RecipeImporter.tsx`, including scheme restrictions and error handling.
- [ ] Review file upload parsers for accepted types, size limits, malformed rows, and injection into UI.
- [ ] Confirm credential fields clear after save and never render stored token values.
- [ ] Check whether error messages could expose tokens or upstream API payloads.

**Tests to run or add:**
- [ ] Malicious text input renders as text, not HTML.
- [ ] Unsupported import URL schemes are rejected.
- [ ] Saved Square credential form does not repopulate token fields.

**Acceptance criteria:**
- [ ] The audit report lists every untrusted-input path and whether it is safe, risky, or unverified.

---

## Task 6: Audit AI and LLM Proxy Surface

**Primary questions:**
- Does the Worker protect the Anthropic API key?
- Can prompt payloads or error paths leak sensitive data?
- Are AI responses parsed defensively?
- Are model settings and prompts consistent with current Anthropic usage rather than stale Gemini assumptions?

**Files to inspect:**
- `worker.ts`
- `services/claudeService.ts`
- prompt-building code in services/components
- `CLAUDE.md`
- `README.md`
- historical docs only for stale setup instructions

**Steps:**
- [ ] Verify browser code never needs `ANTHROPIC_API_KEY`.
- [ ] Review `/api/messages` auth, request validation, error handling, and upstream response handling.
- [ ] Review prompt construction for accidental inclusion of secrets, tokens, or localStorage dumps.
- [ ] Review JSON parsing and schema validation of AI responses.
- [ ] Search for stale Gemini references that would lead a developer to configure the wrong key.
- [ ] Run the `claude-prompt-reviewer` agent or equivalent focused review on Claude prompt and proxy code.

**Acceptance criteria:**
- [ ] AI proxy findings are recorded with evidence and concrete hardening recommendations.

---

## Task 7: Audit Deployment Configuration and Documentation

**Primary questions:**
- Can a new developer deploy the app securely from docs alone?
- Are required secrets documented without exposing values?
- Are local dev and production paths consistent?

**Files to inspect:**
- `README.md`
- `CLAUDE.md`
- `AGENTS.md`
- `wrangler.jsonc`
- `scripts/dev-worker.mjs`
- `vite.config.ts`
- any deployment docs under `docs/`

**Steps:**
- [ ] Verify docs mention `ANTHROPIC_API_KEY`, `BAKERY_API_TOKEN`, and `VITE_BAKERY_API_TOKEN` correctly.
- [ ] Verify docs no longer instruct setup with `GEMINI_API_KEY` for current app behavior.
- [ ] Verify `wrangler.jsonc` comments list every required Worker secret.
- [ ] Verify local development proxy behavior does not silently bypass auth assumptions.
- [ ] Check generated docs/plans for stale examples that might encourage direct browser storage of Square tokens.

**Acceptance criteria:**
- [ ] Documentation drift is captured as findings or patched.

---

## Task 8: Audit Bakery Data Integrity and Business Logic Abuse

**Primary questions:**
- Can invalid bakery or sales values corrupt calculations?
- Are dates, percentages, and money values bounded and normalized?
- Can malformed imported data produce silent nonsense?

**Files to inspect:**
- `types.ts`
- `components/SalesTracking.tsx`
- recipe/formula components
- calculator utilities
- import/export code

**Steps:**
- [ ] Search for numeric parsing and coercion paths:
```bash
rg -n "parseFloat|parseInt|Number\\(|toFixed|percentage|hydration|yield|price|sales|date|Date\\(" components services types.ts
```
- [ ] Review negative values, zero division, NaN propagation, timezone handling, and sell-through percentages over 100%.
- [ ] Review import paths for invalid quantity, unit, price, and date values.
- [ ] Run the `bakery-math-reviewer` agent or equivalent focused review on formula and sales calculations.

**Acceptance criteria:**
- [ ] Data-integrity findings are recorded separately from credential/security findings so operational bugs do not hide severe auth issues.

---

## Task 9: Produce Final Risk Register and Remediation Plan

**Steps:**
- [ ] Consolidate all findings into `docs/security/2026-05-01-security-audit.md`.
- [ ] For each finding, include:
  - ID.
  - Severity.
  - Affected file and line when possible.
  - Plain-English impact.
  - Technical cause.
  - Reproduction or evidence.
  - Recommended fix.
  - Verification command or test.
- [ ] Split findings into:
  - Fixed during audit.
  - Must fix before deploy.
  - Should fix soon.
  - Hardening/backlog.
- [ ] Run final verification:
```bash
npm run build
npx tsc --noEmit
npm test
npm audit --audit-level=moderate
```
- [ ] Add a final summary with residual risk and any commands that could not be run.

**Acceptance criteria:**
- [ ] The final audit report is complete enough for a non-coder to understand impact and for a developer to implement fixes.
- [ ] All P0/P1 issues have either been fixed or explicitly called out as release blockers.
- [ ] Verification results are recorded with pass/fail status.

