# Reliability remediation — 2026-09-08

Status: source fixes verified locally; production rollout and device sign-off remain pending. This updates, rather than replaces, the historical [September 5 audit](2026-09-05-whole-app.md). No production migration, backend deployment, or new TestFlight upload was performed during this remediation.

## Implemented fixes

| Finding | Source change | Verification / remaining dependency |
|---|---|---|
| F01 | Forward repair migration restores referral, introductory-credit and notification contracts; adds durable scan decisions, provider entitlements and deletion receipts. | Disposable PostgreSQL passes old-production-schema upgrade and repeated migration. **Production application blocked pending entitlement-source reconciliation.** |
| F02 | Upgraded Next.js, Clerk, Jimp and affected transitive dependencies. | Dependency audit reports zero vulnerabilities; build and real JPEG decode/crop/resize regression pass. |
| F03 | Referrer-level locking serializes qualification; replay reconciles missing milestones; unique reward and ledger insertion grant exactly three credits once. | Real PostgreSQL concurrent qualification, reward ledger and replay checks pass. Migration backfills missed qualified milestones. |
| F04 | Shared request boundary rejects invalid authentication, fails closed on database errors and limits guest/provider requests. | Controlled authentication, guest allowance and outage tests pass. Guest identity uses a keyed hash of trusted Vercel network information; shared networks share allowance. General request budgets are not identical to the native three-scan feature policy. |
| F05 | Persist allowed and denied bulk-session decisions atomically with credit consumption; recovery shares authorization. | Repeated denial stays denied; eight concurrent requests for one session charge once. |
| F06 | Reconcile authoritative RevenueCat/Stripe state, order provider updates and aggregate active providers; preserve Pro referral credits. | Controlled lifecycle/outage tests and real database ordering/aggregation pass. **RevenueCat server key is configured in Vercel production/preview as a protected secret (verified September 8). Its absence from a local export did not establish missing production configuration. Live key validity and existing Pro ownership still need reconciliation before rollout.** |
| F07 | Remove synthesized chart observations and inferred Used prices; use dated observations and real condition-specific prices only. | Native history and pricing regressions pass. Collections without sufficient history show an explicit empty state. |
| F08 | Align backend/native hero prices and condition-specific sold/asking sources; version lookup cache. | Contract and native decoder checks pass. |
| F09 | Persist candidates before publishing state; prevent mutations after failed load; restore valid backup while preserving unreadable original. | Native recovery/write-failure tests pass. Explicit collection clear also removes backups and quarantined files. |
| F10 | Fixed server creation-date cutoff; reject reused deleted-installation hashes. | Real database fresh-account and deleted-installation checks pass. |
| F11 | Improve white-summary contrast, compact price labels, content-sized cards and scrollable accessibility layout. | Small/large simulator suites pass; exported small-screen largest-text screenshot inspected: conditions and Add remain reachable. Full VoiceOver and every-language visual review remain untested. |
| F12 | Persist pending invite and account-bound completion intent; accept idempotent responses; correct reward-recipient wording. | Native restart/routing tests and 13-language validation pass. Installed TestFlight link/onboarding journey remains blocked by physical-device/test-account access. |
| F13 | Transactional deletion staging, hash-only 90-day receipts, retryable failures, late-event rejection, Clerk deletion webhook and scheduled cleanup. | Isolated database deletion/reuse tests pass. **Partial:** Clerk webhook configuration/signing secret and real deletion recovery remain unverified. Built-in Clerk profile deletion can still bypass native local-collection cleanup; lost-response recovery needs device validation. |
| F14 | Add pinned CI actions and backend, localization, database and small-simulator checks; preserve complete native source snapshot. | Local checks pass. Published the pinned workflow using the authorized GitHub browser session (`d840b56`, direct branch trigger `049170d`). CLI workflow scope remains unchanged. Hosted results and reproducible signed archive remain unverified. |
| F15 | Surface cache cleanup/write failures as bounded warnings. | Controlled failed-write assertion passes. Provider traffic under production load remains unmeasured. |

## Verification evidence

- Native: `/tmp/BrickValFixFinal-20260905.xcresult` reports **205 tests on two devices, 414 parameterized test runs, zero failures/skips**. Devices: iPhone SE (3rd generation) and iPhone 17 Pro, iOS 26.5. These include fixture-driven UI tests, not live-account end-to-end evidence.
- Backend: `/tmp/brickval-final-backend.log`: **69 tests and 25 reliability assertions passed**. Controlled provider boundaries prohibit outbound network requests.
- Database: `/tmp/brickval-fix-database-final.log`: concurrent reward grants, session charging, Pro preservation, provider ordering, deletion receipts, old-schema upgrade and migration replay passed in a disposable local cluster.
- Type checking/build: `/tmp/brickval-final-typecheck.log`, `/tmp/brickval-final-build.log`: passed.
- Localization: `/tmp/brickval-final-localization.log`: **787 app strings and four permission strings across 13 locales** passed. Translation quality is not certified by this check.
- Dependency audit: `/tmp/brickval-fix-final-dependencies.json`: zero vulnerabilities. This is a dependency advisory check, not proof of security.
- Largest-text screenshot: `/tmp/brickval-final-attachments/E26D0581-9504-4581-8931-68CAA8FCA7B5.png`. The screenshot is scrolled to the bottom action; it does not prove the entire page at once.

Temporary evidence paths are local artifacts. Regression harnesses are committed under `scripts/test-reliability-*`, `tests/`, and native test folders so checks can be reproduced.

## Remaining release blockers and order

1. Vercel dashboard and CLI environment listing confirm the RevenueCat server key already exists for Production and Preview, added August 15. No secret was replaced or exposed. Corrected the earlier missing-key conclusion: local export omitted its protected value, so local 401 responses did not test the deployed key. Verify runtime key validity and authoritative ownership of all existing Pro rows (10 at the last read) without revoking unresolved users.
2. Review and apply `supabase/migrations/20260905000000_reliability_repair.sql`; seed only verified provider entitlements before deploying dependent backend code. Verify live columns, RPC signatures and cleanup schedule. Never run the full schema as a production reset.
3. Configure signed Clerk `user.deleted` delivery to `/api/webhook/clerk` and verify delivery/retry. Resolve the built-in profile/local-data deletion path.
4. Deploy backend and perform read-only contract checks; inspect current production errors. The prior error-history sample is incomplete.
5. Run real TestFlight referral opening, sign-in/onboarding/restart and reward spending with isolated identities, checking ledger rows alongside UI. Verify Apple sandbox purchase/restore, cancellation, grace period and account switching. Physical-device camera/permissions/poor connectivity are also pending.
6. Complete language/VoiceOver layouts and remaining deletion recovery before a new signed native archive/upload. The local production privacy page passed a 390px visual/overflow check on September 8.

Next-release improvements: richer failure/retry coverage for local account deletion, exact scan-policy consistency across auxiliary routes, broader localization/accessibility review and provider-cost monitoring. Later architecture work: clarify entitlement ownership and collection sync expectations without a framework rewrite.
