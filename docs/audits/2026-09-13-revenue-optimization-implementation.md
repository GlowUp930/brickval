# Revenue optimization implementation — 2026-09-13

This is the first implementation step from the read-only analytics review. It improves measurement without changing prices, products, paywall campaigns, scan allowances, or subscription behavior.

## What changed

- PostHog custom events now carry a shared schema version, app version/build, OS version, iOS platform, debug/production environment, simulator flag, and persisted monetization cohort.
- Onboarding records the Get Started action separately from the initial `onboarding_started` view event. This makes the first onboarding handoff measurable instead of inferring it from screen views.
- Paywall presentation now records requested, presented, dismissed, and skipped/error outcomes. The existing correlated purchase-attempt events remain the source for StoreKit and RevenueCat outcomes.
- Feature-specific upgrade actions now enter the same `upgrade_requested` funnel as the general subscription action.

## Funnel dictionary (superseded onboarding join)

The current production funnel is:

`onboarding_started` → `onboarding_get_started_tapped` → `onboarding_completed` → `scan_completed` → `item_added_to_collection` / `items_added_to_collection` → `upgrade_requested` → `paywall_presented` → `purchase_attempt_started` / `purchase_attempt_finished`.

`scan_completed` keeps the existing `outcome` and `scan_type` fields. A scan result is considered first value when the user reaches a successful result; PostHog cohorts should use the first occurrence rather than counting every scan. Collection-save events remain the stronger “saved value” milestone.

The implementation originally documented `analytics_schema_version: 2`. The 14 September onboarding repair supersedes that contract with schema `3`, a stable install/session context, and the explicit `app_ready` / `onboarding_screen_shown` events. Use [`docs/audits/2026-09-14-posthog-onboarding.md`](2026-09-14-posthog-onboarding.md) and the saved first-run funnel for onboarding conversion. Production dashboards must filter `environment = production`, `is_simulator = false`, and a released build before using events for ARPU decisions.

## Evidence and next step

The 13 September dashboard review found that the existing onboarding report stopped at `onboarding_started`, while RevenueCat and Superwall counts are not yet a clean public-production denominator. It also found five of six currently active trials set to cancel, but the sample is too small to infer a cause or justify a price change.

The next revenue experiment should be a short first-trial activation path that guides a new trial user to one successful scan and one saved result. Keep prices and live campaign allocation fixed while the new event data matures. Do not call a paywall or trial experiment successful until D14/D30 net revenue per assigned production user is measured with mature cohorts.

## Verification status

- Debug iOS build compiles after the analytics changes.
- Full native tests and Release compilation remain to be run before committing a release build.
- No App Store Connect metadata, RevenueCat product, Superwall campaign, or customer-facing price was changed.
- Physical-device and production event reconciliation remain required.
