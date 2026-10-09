# First-week activation implementation — 9 October 2026

Status: source implementation and focused simulator verification complete.
Rollout remains disabled.
No production configuration, App Store release, live dashboard or acquisition
campaign has been changed.

## Change

One optional day-1/3/7 local campaign replaces 7/21-day reminders. Inline first-demo
consent reaches users who leave before scanning. Copy adapts to no scan, latest
recognition failure, or usable scan; only repeat step 2 directs users to Bulk.
Taps persist behind unfinished onboarding. Dates stay anchored to consent and
skipped steps never return. Purchase/trial, opt-out and account change terminate.
Legacy invitations/assignment/budget survive migration, but increased-frequency
consent does not. All new copy covers the existing 13 locales.

## Event contract

Eligibility and every campaign event include `retention_experiment_version=2`,
`campaign_version=2`, persistent assignment/eligibility and onboarding status.
Native events also carry installation/account, environment, device, access cohort
and build context. Scheduled/tapped events include step, copy variant and Single/
Bulk destination. `notification_scan_activity` records an actual scan start;
`notification_meaningful_activity` retains usable_scan, collection_save and
collection_item_opened. Recognition failures change local copy without recording
collection contents. `notification_skipped` records consumed/suppressed reminders.
No delivery receipt or revenue claim is inferred from scheduling or tapping.

## Production baseline and experiment acceptance

Live reconciliation is an explicit **pre-enable gate**, not completed by source
or simulator tests. Before enabling, use production physical App Store events,
exclude simulators/TestFlight/internal accounts, restrict to the new released build,
and reconcile app-ready → onboarding → scan attempt → usable result → paywall →
verified purchase. Keep App Store downloads/first-launch measurement separate;
missing app telemetry cannot identify never-launched individual installations.

Count installations using `analytics_install_id`. Compare all assigned sequence
versus holdout installations, including permission declines; report initial
onboarding-completion and hard/soft-access segments separately. First usable scan
and paywall reach: within 7 × 24 hours of eligibility, with mature cohorts only.
Repeat scanning: distinct UTC dates with usable results in the same seven-day
window. Report notification opt-in/denial and observed opt-out/revocation alongside
counts and uncertainty. Campaign timing is local; reporting windows are UTC elapsed.

28-day checks: verified purchases and realised RevenueCat transaction revenue minus
refunds, normalized to a common currency, per eligible installation. Reconcile
account/install mapping and flag ambiguous multi-install joins rather than double
counting. App purchase callbacks and Pro activation are not the revenue ledger.
No fixed uplift claim or small-sample significance threshold is assumed. Review
mature cohorts weekly; increased paywall reach without improved purchases is
insufficient evidence of commercial success. Preserve holdout until evidence is useful.

## Required release checks

- Physical-iPhone local delivery at all steps using a controlled test clock;
  closed-app delivery; onboarding resume; Single/Bulk routing and manual-only entry.
- Permission decline/revocation, migration/re-consent, activity suppression,
  utility collisions, timezone changes, purchase/trial and account cancellation.
- External subscription-state reconciliation and existing billing APNs checks.
- New native release with policy off, production baseline reconciliation, then
  enable via existing policy only after gates pass.

Public acquisition copy is prepared in
`docs/marketing/2026-10-09-first-scan-messages.md`; no external contact channel,
paid tool or campaign was added.

## Verification

- Final focused native run: **55 unit tests in six suites and three UI checks pass**
  on BrickVal Small iPhone / iOS 26.5, zero failures. Includes actual recognition
  failure versus provider-failure callbacks, manual-only reminder entry, scheduling,
  migration, consent, account/subscription cancellation, and onboarding routing.
- Localization audit: 863 app strings plus four Info.plist strings across all 13
  locales. Backend notification localization test passes. Diff whitespace passes.
- Final onboarding screenshot visually inspected and saved at
  `apps/ios-swift/design-qa-assets/2026-10-09-onboarding-reminders.png`. Explicit
  light-surface text colours keep the new invitation legible. Invitation display
  is recorded only once the onboarding card scrolls into view.
- An initial test run exhausted disk space. Temporary dependency caches were
  pruned, the required signed dependency artifact restored, and the final native
  build/tests passed. No source, release archive, or user research was deleted.
- An earlier UI run exposed inherited accessibility identifiers hiding the
  individual buttons; the invitation now contains its children without overriding
  their identifiers. The final UI rerun passes.
- Device inventory lists both known iPhones as unavailable. Physical delivery,
  live baseline reconciliation, a new native release, and campaign enablement
  remain pending. Existing default-off backend policy has not changed.

Result bundle:
`/tmp/BrickValScanGuideDerived/Logs/Test/Test-BrickVal-2026.10.09_16-51-14-+1100.xcresult`.
No full-app reliability or hardware sign-off is claimed.
