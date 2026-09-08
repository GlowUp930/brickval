# Reliability remediation — 2026-09-08

Status: database repair and backend deployment are live. Native version 1.0.8 (168) is processed and available to the existing internal TestFlight groups; physical-device sign-off remains pending. This updates, rather than replaces, the historical [September 5 audit](2026-09-05-whole-app.md).

## Implemented fixes

| Finding | Source change | Verification / remaining dependency |
|---|---|---|
| F01 | Forward repair migration restores referral, introductory-credit and notification contracts; adds durable scan decisions, provider entitlements and deletion receipts. | Disposable PostgreSQL passes old-production-schema upgrade and repeated migration. **Applied to production September 8**, together with 13 verified active RevenueCat provider records; all 15 pre-existing Pro flags preserved. |
| F02 | Upgraded Next.js, Clerk, Jimp and affected transitive dependencies. | Dependency audit reports zero vulnerabilities; build and real JPEG decode/crop/resize regression pass. |
| F03 | Referrer-level locking serializes qualification; replay reconciles missing milestones; unique reward and ledger insertion grant exactly three credits once. | Real PostgreSQL concurrent qualification, reward ledger and replay checks pass. Migration backfills missed qualified milestones. |
| F04 | Shared request boundary rejects invalid authentication, fails closed on database errors and limits guest/provider requests. | Controlled authentication, guest allowance and outage tests pass. Guest identity uses a keyed hash of trusted Vercel network information; shared networks share allowance. General request budgets are not identical to the native three-scan feature policy. |
| F05 | Persist allowed and denied bulk-session decisions atomically with credit consumption; recovery shares authorization. | Repeated denial stays denied; eight concurrent requests for one session charge once. |
| F06 | Reconcile authoritative RevenueCat/Stripe state, order provider updates and aggregate active providers; preserve Pro referral credits. | Controlled lifecycle/outage tests and real database ordering/aggregation pass. **RevenueCat server key is configured in Vercel production/preview as a protected secret (verified September 8). Its absence from a local export did not establish missing production configuration. Read-only checks using the existing RevenueCat dashboard key found 13 active accounts and two without active provider entitlements, zero lookup failures; 13 provider records seeded and no existing Pro flag revoked.** |
| F07 | Remove synthesized chart observations and inferred Used prices; use dated observations and real condition-specific prices only. | Native history and pricing regressions pass. Collections without sufficient history show an explicit empty state. |
| F08 | Align backend/native hero prices and condition-specific sold/asking sources; version lookup cache. | Contract and native decoder checks pass. |
| F09 | Persist candidates before publishing state; prevent mutations after failed load; restore valid backup while preserving unreadable original. | Native recovery/write-failure tests pass. Explicit collection clear also removes backups and quarantined files. |
| F10 | Fixed server creation-date cutoff; reject reused deleted-installation hashes. | Real database fresh-account and deleted-installation checks pass. |
| F11 | Improve white-summary contrast, compact price labels, content-sized cards and scrollable accessibility layout. | Small/large simulator suites pass; exported small-screen largest-text screenshot inspected: conditions and Add remain reachable. Full VoiceOver and every-language visual review remain untested. |
| F12 | Persist pending invite and account-bound completion intent; accept idempotent responses; correct reward-recipient wording. | Native restart/routing tests and 13-language validation pass. Installed TestFlight link/onboarding journey remains blocked by physical-device/test-account access. |
| F13 | Transactional deletion staging, hash-only 90-day receipts, retryable failures, late-event rejection, Clerk deletion webhook and scheduled cleanup. | Isolated database deletion/reuse tests pass. Production Clerk endpoint `ep_3J1qdnUZQOW8ArfLWo2l2rP9Wxy` subscribes only to `user.deleted`; protected Vercel signing secret saved. Signed `user.updated` example was accepted without database mutations, proving delivery/signature verification. Native code now handles Clerk account-deleted events, persists pending cleanup for restart recovery, and clears confirmed local data before the custom API call. Real device deletion/retry remains unverified. |
| F14 | Add pinned CI actions and backend, localization, database and small-simulator checks; preserve complete native source snapshot. | Local checks pass. Published the pinned workflow using the authorized GitHub browser session (`d840b56`, direct branch trigger `049170d`). CLI workflow scope remains unchanged. Clean hosted [run 34185416653](https://github.com/GlowUp930/brickval/actions/runs/34185416653) passed backend, database and native checks. Signed build 168 archive passes locally; Apple closed the 1.0.7 train, so version 1.0.8 was archived and uploaded successfully. |
| F15 | Surface cache cleanup/write failures as bounded warnings. | Controlled failed-write assertion passes. Provider traffic under production load remains unmeasured. |

## Verification evidence

- Native: `/tmp/BrickVal168-final.xcresult` reports **206 tests on two devices, 416 test runs, zero failures/skips**. Devices: iPhone SE (3rd generation) and iPhone 17 Pro, iOS 26.5. These include fixture-driven UI tests, not live-account end-to-end evidence.
- Backend: `/tmp/brickval-final-deletion-backend.log`: **69 tests and 27 reliability assertions passed**. Controlled provider boundaries prohibit outbound network requests.
- Database: `/tmp/brickval-fix-database-final.log`: concurrent reward grants, session charging, Pro preservation, provider ordering, deletion receipts, old-schema upgrade and migration replay passed in a disposable local cluster.
- Type checking/build: `/tmp/brickval-final-typecheck.log`, `/tmp/brickval-final-build.log`: passed.
- Localization: `/tmp/brickval-final-localization.log`: **787 app strings and four permission strings across 13 locales** passed. Translation quality is not certified by this check.
- Dependency audit: `/tmp/brickval-fix-final-dependencies.json`: zero vulnerabilities. This is a dependency advisory check, not proof of security.
- Largest-text screenshot: `/tmp/brickval-final-attachments/E26D0581-9504-4581-8931-68CAA8FCA7B5.png`. The screenshot is scrolled to the bottom action; it does not prove the entire page at once.

Temporary evidence paths are local artifacts. Regression harnesses are committed under `scripts/test-reliability-*`, `tests/`, and native test folders so checks can be reproduced.

## Production rollout evidence

- Migration: `20260905000000_reliability_repair.sql` applied transactionally with the verified provider seed. Read-back: 13 active provider rows, 15 Pro user flags, one daily cleanup job, referral installation and notification language columns present. Zero reward rows existed after reconciliation (no qualifying milestone to repair).
- Provider check: 15 existing Pro accounts inspected; 13 RevenueCat-active, two without active entitlements in the checked providers, zero unresolved requests. No existing access was revoked. These are point-in-time observations; they do not prove purchase/restore flows or ownership of every historical manual grant.
- Backend source: `471feb4`; live deployment `dpl_FWhpwtHFCcRj7doPKRgYb1dJz3qi`, `https://brickval-4p1vo9aw4-glowup930s-projects.vercel.app`, promoted to `brickvalue.live` after checks.
- Live reads: referral endpoint 401 without authentication; policy endpoint 200; unsigned Clerk webhook 400. A signed synthetic `user.updated` event was accepted through Svix (`msg_3J1rJybW3n1nb6Hx1wOgS57ORMl`), with no account/database mutation. This verifies transport/signature, not real account deletion.
- Error review: Vercel returned no error entries for the new deployment in the queried 30-minute window. This is a short sampled window, not evidence of zero production defects.
- Native deletion repair: Clerk `accountDeleted` events clear collection storage/backups; a persisted cleanup flag retries after restart. Custom deletion clears confirmed local data first, so losing the server response cannot leave the collection behind. Ordinary sign-out does not clear data.
- GitHub's first clean run passed backend and database checks but failed native startup without local Clerk credentials plus two UI journeys. Fixed debug signed-out mocking and offscreen-summary test scrolling; replacement run `34185416653` passed, including all 12 UI tests without production credentials. A subsequent unconfigured OAuth icon lookup was also guarded; the credential-free onboarding regression now passes (`/tmp/BrickVal168-onboarding-final.xcresult`). Production authentication behavior is unchanged by the debug mock.
- Account deletion response: a failed completion-receipt update after confirmed identity deletion now returns success and leaves webhook reconciliation available, rather than falsely claiming deletion failed. Genuine identity-deletion failures still return an error; both cases have controlled regression coverage.
- Physical-device inventory rechecked September 8: both paired iPhones unavailable. No physical referral, camera, Apple sandbox purchase, restore, grace-period or account-switch result is claimed.

- Native release source: `9aec2af` (version-only update after `471feb4`). `/tmp/BrickVal168Version108.xcarchive` passed archive and strict code-signature verification; bundle `com.brickval.app`, version `1.0.8`, build `168`. `/tmp/brickval168-version108-upload.log` reports **EXPORT SUCCEEDED / Upload succeeded**. The first 1.0.7 submission was rejected because Apple closed that release train; no binary was accepted under the old version.

- Apple processing completed. [Build 1.0.8 (168)](https://appstoreconnect.apple.com/teams/2e454f4c-2b39-4bb5-a5ac-abb47f8405c5/apps/6771715475/testflight/ios/8c81bfbc-66a1-49bf-a494-23f35230fba5) is assigned to both existing internal groups, **Team (Expo)** and **v1**, each showing one tester. Testing notes were saved. External beta review remains “Ready to Submit”; no public App Store release or external beta submission was performed.

## Critical journey sign-off

| Journey | Result | Scope / missing dependency |
|---|---|---|
| Concurrent referral qualification and exactly-once reward | Passed | Isolated PostgreSQL verifies ledger and three-credit grant, replay and concurrency. |
| Credit spending and Pro credit preservation | Passed | Controlled backend and real isolated database checks; no production test credits consumed. |
| Installed referral link → onboarding → restart → qualification | Blocked | Connected iPhone and isolated signed-in test identities required. Decoder/restart unit coverage passes. |
| Scan authorization and provider failure recovery | Passed | Controlled server tests; physical camera and poor-network journey remain blocked by device access. |
| Subscription ordering and provider outage | Passed | Controlled provider responses and isolated ledger checks; live provider read-back completed. |
| Apple purchase, restore, grace period and account switching | Blocked | Connected iPhone and Apple sandbox test identity required. |
| Collection recovery and deletion restart cleanup | Passed | Native storage regression tests on simulators; device end-to-end deletion remains blocked. |
| Signed Clerk deletion transport | Passed | Non-mutating signed example delivery; real user deletion not exercised. |
| Small/large UI and largest text action reachability | Passed | Fixture-driven suites and inspected screenshot; full VoiceOver and native-language review untested. |

## Remaining verification

1. On an available iPhone with isolated identities, verify referral opening/sign-in/onboarding/restart and spending against ledger rows; verify deletion/retry, camera permission and poor connectivity. Apple sandbox purchase/restore, cancellation/grace period and account switching remain blocked by device/test-identity access.
2. Sentry-specific debug-symbol upload remains blocked by unavailable `SENTRY_AUTH_TOKEN`, organization and project configuration. The signed archive retains dSYMs; Apple symbol upload is enabled.
3. Full VoiceOver traversal and native-language copy review remain untested. Local 390px privacy-page visual/overflow check passed; small/large simulator and largest-text evidence do not certify every screen in every locale.

Next-release improvements: exact scan-policy consistency across auxiliary routes and provider-cost monitoring. Later architecture work: clarify entitlement ownership and collection sync expectations without a framework rewrite.
