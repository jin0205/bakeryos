# BakeryOS

BakeryOS is a sourdough and artisan bakery operations app. It manages formulas,
production planning, inventory, costing, sales tracking, and R&D workflows.

The app is a React/Vite SPA served by a Cloudflare Worker. Private API keys stay
in the Worker; the browser calls authenticated `/api/*` routes with a Bakery API
token.

## Prerequisites

- Node.js
- npm
- Wrangler CLI access to the target Cloudflare account

## Install

```bash
npm install
```

## Local Development

Create `.env.local` for browser-visible local settings:

```bash
VITE_BAKERY_API_TOKEN=<same-strong-token-used-for-BAKERY_API_TOKEN>
```

Start the frontend and Worker in two terminals:

```bash
npm run dev
npm run dev:worker
```

The Vite frontend runs on `http://localhost:3000` and proxies `/api/*` to the
Worker dev server on `http://localhost:8787`.

## Cloudflare Secrets

Set these as Worker secrets; do not commit their values:

```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put BAKERY_API_TOKEN
```

`ANTHROPIC_API_KEY` is used only by the Worker when proxying `/api/messages`.
`BAKERY_API_TOKEN` protects `/api/messages`, `/api/data/*`, and `/api/square/*`.
The frontend sends the matching `VITE_BAKERY_API_TOKEN` as `X-Bakery-Token`.

## Verification

```bash
npm run build
npm run typecheck
npm test
npm audit --audit-level=moderate
```

## Deploy

```bash
npm run deploy
```

## Notes

- AI features use Anthropic Claude through `worker.ts`; this project does not
  use Gemini or `GEMINI_API_KEY`.
- Square access tokens are stored only behind Worker `/api/square/credentials`,
  not in browser localStorage or generic `/api/data/*` sync.
- Historical plans under `docs/superpowers/` may describe superseded approaches,
  including direct browser Square API calls. Prefer current source and this
  README for setup guidance.
