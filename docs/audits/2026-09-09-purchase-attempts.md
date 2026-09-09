# Purchase failure diagnosis — build 171

## What is known

[Sentry BRICKVAL-K](https://areyouok-4x.sentry.io/issues/7706745415/) contains nine failures under one anonymous identifier: seven in build 162 and two in 166. The earliest and latest inspected events report RevenueCat code 3 and `StoreKit.Product.PurchaseError` code 2 (`purchaseNotAllowed`). No build-170 event was present in this issue during the September 9 investigation. Successful purchases on 166 and 170 were reported by the owner; they do not establish recovery for the unidentified affected customer.

Apple's exact restriction/account condition is unknown. **Keep the original case unresolved** until the same affected customer succeeds or a specific cause is established. Simulator injection proves app handling, not that Apple will authorize that customer's purchase. Build 170 cannot receive these diagnostics retroactively.

## Implemented

- `PurchaseAttempt.swift` snapshots a UUID attempt ID, SHA-256 of the current RevenueCat customer ID, build, product, placement, operation, Apple's `canMakePayments`, OS version and cached storefront. No additional network request delays Apple's purchase sheet. A missing customer/storefront stays missing; it is not invented.
- `RevenueCatPurchaseController.swift` records `purchase_attempt_started` and `purchase_attempt_finished` through the existing PostHog instance and Sentry breadcrumbs. Terminal outcomes are `purchased`, `cancelled`, `pending`, `failed` or `restored`. Elapsed time uses monotonic uptime. Restore results include whether Pro is active, so an empty restore is not treated as recovery.
- Each failure's Sentry `purchase_attempt` context carries the exact same properties as its analytics event. Searchable Sentry tags are `purchase_attempt_id` and `purchase_customer_hash`. Original nested NSError/StoreKit error domains and codes are retained separately from the localized recovery message. Error descriptions, user-info payloads, receipts, payment details, raw RevenueCat IDs, email addresses and passwords are not copied into these diagnostics.
- The live SDK adapter and injected tests share the controller's actual purchase/restore state transitions. Existing entitlement updates, notification updates, welcome behavior, recovery messages and purchase return values are preserved. There is no automatic retry, product/pricing change, backend change or database migration.
- `scripts/upload-sentry-symbols.sh` now resolves the installed repository CLI correctly; its previous default incorrectly looked under `scripts/node_modules`.

## Verification

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Original Apple rejection through controller; no Pro, no welcome, no automatic retry | Passed | `PurchaseAttemptTests`; direct Apple error and the original nested RevenueCat/Apple code tuple |
| Rejection followed by explicit successful retry | Passed | New attempt IDs, same customer hash; Sentry failure and analytics failure share an ID; later purchase grants Pro |
| Cancellation and pending approval | Passed | Both thrown cancellation and RevenueCat's cancellation flag; no failure report or Pro grant |
| Restore success and failed restore followed by explicit retry | Passed | Pro state updates without new-purchase welcome; restore outcome includes entitlement presence |
| Privacy and original nested error codes | Passed | Tests place private text in descriptions/user info and assert it is absent from serialized diagnostics |
| Regression test sensitivity | Passed | Temporarily disabling the controller's diagnostic recorder produced nine failed assertions in `/tmp/BrickVal171NoDiagnosticsRed.xcresult`; mutation was reverted before final verification |
| Focused purchase suites | Passed | 21 tests, zero failures: `/tmp/BrickVal171Purchase3.xcresult` |
| Full native unit/UI suites, small and large iPhones | Passed | 222 tests / 448 runs; iPhone SE (3rd generation) and iPhone 17 Pro, iOS 26.5: `/tmp/BrickVal171Full.xcresult` |
| Localization | Passed | 794 strings + four permission strings across all 13 locales |
| Physical-device restrictions enabled/disabled and Apple test purchase | Blocked | Both paired iPhones reported unavailable via `devicectl` on September 9; no available test device |
| Original customer's recovery | Blocked | Customer remains unidentified; existing events have no RevenueCat correlation bridge |
| Live failed-to-successful correlation from the new build | Pending | Local contract is verified; requires subsequent real attempts after installation. Absence of errors is not evidence of recovery |

## Release

Build 1.0.8 (171) is being archived for TestFlight. Symbol upload and Apple processing must be verified before recording release completion here. No backend deployment is needed.

## How to assess subsequent attempts

1. Open the new Sentry failure and record its `purchase_attempt_id` and `purchase_customer_hash` tags.
2. In PostHog, find `purchase_attempt_finished` with the same `attempt_id`; its outcome must be `failed`. Filter subsequent attempts by the same `customer_hash`, using timestamp and `app_build`.
3. A later explicit `purchased` outcome (or a `restored` outcome with `pro_active=true`) is recovery evidence for that correlated identity. Different customer hashes, no events, cancellation, pending approval, or an empty restore are not success evidence. Account changes can change the RevenueCat hash; do not infer a match without evidence.
4. Inspect the captured permission flag, storefront, OS and original domain/code chain to narrow the cause. A false permission flag is evidence that payments were disallowed at that attempt, not proof of the particular setting or account condition.

For the original pre-171 case, this new bridge cannot reconstruct the missing identity retroactively.
