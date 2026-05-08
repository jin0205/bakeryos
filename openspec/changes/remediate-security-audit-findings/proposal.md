# Remediate Security Audit Findings

## Summary

Fix the deploy-blocking and high-priority findings from the May 1, 2026 system-wide security audit. The change focuses on making Worker API auth consistent, restoring sales KV sync, improving sync reliability, adding Square credential clearing, and tightening the minimum verification and setup documentation needed for safe deployment.

## Why

The audit found two P1 release blockers:

- `/api/messages` is unauthenticated and can spend the Anthropic API key from any reachable Worker deployment.
- Sales tracking saves data through `storageService`, but the Worker rejects those sales keys, so sync silently fails.

It also found several P2 issues that make the system easier to misconfigure or harder to verify: pending sync replay only happens on browser `online` events, Square credentials cannot be cleared from the UI/API, `typecheck` is missing from normal scripts, dependency audit reports vulnerable `postcss`, and setup docs are stale.

## Scope

This change will:

- Require `BAKERY_API_TOKEN` auth for `/api/messages`.
- Send `X-Bakery-Token` from the frontend AI service.
- Align frontend sync keys and Worker `VALID_DATA_KEYS` for sales data.
- Keep `bakeryos_square_credentials` rejected from generic `/api/data/*`.
- Flush pending sync during normal startup/sync flow.
- Add explicit Square credential clearing semantics.
- Add a `typecheck` npm script.
- Resolve the current `postcss` audit advisory if `npm audit fix` is low risk.
- Update README, Worker secret comments, and project guidance for the current secret model.
- Add/adjust tests for the affected auth, sync, and credential flows.

## Non-Goals

- Replacing the shared-token auth model with OAuth, sessions, or user accounts.
- Changing Cloudflare KV to another storage backend.
- Reworking the Square integration beyond credential storage, clearing, catalog fetch, and sync behavior.
- Completing all P3 hardening items from the audit, such as upload limits, negative inventory prevention, or generic KV schema validation. Those can follow after deploy blockers are closed.

## References

- Audit plan: `docs/superpowers/plans/2026-05-01-system-wide-security-audit.md`
- Completed audit report: `docs/security/2026-05-01-security-audit.md`

