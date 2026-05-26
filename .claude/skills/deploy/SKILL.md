---
name: deploy
description: Pre-flight checklist and deploy workflow for BakeryOS to Cloudflare Workers. Run before any production deploy to catch type errors, test regressions, and missing secrets before wrangler pushes live.
---

# Deploy — BakeryOS to Cloudflare Workers

Run this before every production push. The sequence matters: typecheck → tests → build → deploy.

## Pre-flight gates

### 1. Verify secrets are set
Required Cloudflare Worker secrets (one-time setup, stored in Cloudflare — not in code):
```bash
npx wrangler secret list
```
Expected names: `ANTHROPIC_API_KEY`, `BAKERY_API_TOKEN`.

If missing, set them before continuing:
```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put BAKERY_API_TOKEN
```

Also confirm `.env.local` exists locally with a matching token for dev:
```bash
test -f .env.local || echo "MISSING: .env.local — create it with VITE_BAKERY_API_TOKEN=<token>"
```

### 2. TypeScript — zero errors required
```bash
npm run typecheck
```
Fix all errors before proceeding. Do not deploy with type errors.

### 3. Test suite — all tests must pass
```bash
npm test
```
Playwright auto-starts the dev server on port 3001. If a specific file is relevant to recent changes, run it first:
```bash
npm test -- e2e/worker-api.spec.ts
```
Fix any failures before proceeding.

### 4. Production build
```bash
npm run build
```
Confirms Vite can bundle without errors and wrangler entry point compiles.

## Deploy
```bash
npm run deploy
```
This runs `vite build && wrangler deploy`. Requires `npx wrangler whoami` to return an authenticated account.

If wrangler auth is missing (common in fresh/remote environments):
```bash
npx wrangler login    # interactive OAuth — needs a browser
# OR
CLOUDFLARE_API_TOKEN=<token> npm run deploy   # non-interactive
```

## Quick reference

| Step | Command | Blocks deploy if… |
|---|---|---|
| Secrets | `npx wrangler secret list` | `ANTHROPIC_API_KEY` or `BAKERY_API_TOKEN` missing |
| TypeScript | `npm run typecheck` | Any TS error |
| Tests | `npm test` | Any test fails |
| Build | `npm run build` | Build error |
| Deploy | `npm run deploy` | Wrangler not authenticated |

## Common failure modes

- **Unauthenticated Anthropic calls** — `ANTHROPIC_API_KEY` not set as Worker secret; requests will 401.
- **Frontend auth failures** — `BAKERY_API_TOKEN` secret or `VITE_BAKERY_API_TOKEN` env var missing; AI features break.
- **Wrangler OAuth loop** — in headless/remote environments, use `CLOUDFLARE_API_TOKEN` env var instead of interactive login.
- **Build passes, Worker crashes on boot** — run `npm test -- e2e/worker-api.spec.ts` locally first; catches Worker-side errors before they go live.
