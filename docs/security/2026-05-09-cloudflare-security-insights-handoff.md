# Cloudflare Security Insights Handoff

Date: 2026-05-13
Repo: `/Users/kevin/pro-ai`
Branch: `main`

## Current State

The May 9 Cloudflare Security Insights remediation has a repo-side BakeryOS patch
and remaining Cloudflare account/zone changes that need an authenticated
Cloudflare session.

Implemented in repo:

- `GET /.well-known/security.txt`
- `GET /security.txt`
- `Strict-Transport-Security: max-age=15552000` on Worker-handled responses
- `X-Content-Type-Options: nosniff` on Worker-handled responses
- Existing CORS headers preserved on API and preflight responses
- Focused Worker tests for the security headers, security.txt routes, and
  existing authenticated API behavior

Verification run:

```bash
npm run typecheck
npm test -- e2e/worker-api.spec.ts
npm run build
```

All three commands passed.

## Cloudflare Blocker

Live Cloudflare mutations were not applied in this session because local
Cloudflare auth was not available:

- `CLOUDFLARE_API_TOKEN` was missing.
- `npx wrangler whoami` failed to fetch the cached auth token and attempted an
  OAuth login flow, which was interrupted.

## Cloudflare Items Still To Apply

Use the Cloudflare dashboard or API with a local token/session:

- Create or verify `security@rooboo.xyz` Email Routing to the owner inbox before
  deploying `security.txt`.
- Enable Always Use HTTPS for `rooboo.xyz`.
- Set SSL/TLS mode to Full (strict) after confirming proxied origins work.
- Enable Cloudflare HSTS: 6 months, no preload, no includeSubDomains initially,
  nosniff on.
- Update `_dmarc.rooboo.xyz` to:

```bash
v=DMARC1; p=quarantine; pct=25; rua=mailto:858665a3407f4e889e6d5610b42bfcb3@dmarc-reports.cloudflare.net; fo=1
```

- Create a managed Turnstile widget for `rooboo.xyz` as account posture only.
- Inventory `ftp`, `ssh`, `vnc`, and `webdisk`; do not delete or unproxy them
  without a separate confirmation.
