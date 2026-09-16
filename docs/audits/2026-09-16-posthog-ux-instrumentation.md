# PostHog UX instrumentation and replay visibility — 2026-09-16

## Scope

This follow-up addresses the useful session-replay and product-analytics gaps
identified in the PostHog review. It includes privacy-safe replay visibility,
focused interaction events, complete scan recovery context, and saved-view
definitions for funnels and trends. Surveys and performance timing are out of
scope for this change.

## Replay privacy and useful surfaces

The native SDK keeps the privacy-first defaults enabled: text inputs, images,
and sandboxed system views are masked; network capture contains timing and
status metadata only; and console-log capture is disabled. The app now opts
specific static, non-sensitive surfaces out of masking so a replay can show
the product experience:

- onboarding demo/detail cards and their controls;
- scanner mode, shutter, torch, status, and error controls;
- Collection header, tips, history status, chart, and chart controls;
- item and scan-result charts, history status, snapshots, and condition tabs.

Item photos, captured/imported photos, collection thumbnails and rows, account
content, paywalls, StoreKit sheets, offer-code forms, and text-entry fields
remain masked. The allowlist is implemented with `postHogNoMask()` on the
smallest safe view that contains the public UI. A future SDK upgrade should
recheck this allowlist against the current PostHog SwiftUI masking API.

## Event contract

`analytics_schema_version` is now `4`. Every custom event retains the existing
app/build, OS, environment, simulator, session, install, and access-cohort
context. Automatic element autocapture stays disabled so every recorded tap is
intentional and does not collect arbitrary labels or gestures.

The app records focused events for:

- `onboarding_step_shown` (`step`, `step_index`, `launch_kind`, `is_replay`);
- `tab_selected` (`tab`, `previous_tab`);
- scan mode, shutter, torch, photo selection, Try again, and error display;
- Collection search/filter/item-open/quantity actions;
- timeframe, condition, and seller-country history changes;
- bulk result selection from the photo and result rail;
- collection saves and offer-code redemption attempts.

Scan starts receive a fresh `scan_attempt_id` and monotonic `attempt_number`.
Retries receive a new ID plus `previous_scan_attempt_id`, which makes a failed
attempt and a later successful retry joinable without storing a photo, receipt,
email, password, provider credential, or raw error payload. `scan_failed`
automatically emits the user-visible `scan_error_shown` event with the same
attempt context. Cancellation, pending, blocked, and successful outcomes keep
their existing separate event names.

## PostHog views

Create or update these saved views in the production project and filter each
to `environment = production` and `is_simulator = false` once the new event
properties are available. The first live view is now saved on the [Mobile app
growth dashboard](https://us.posthog.com/project/568935/dashboard/2041521):
**Core scan funnel** (insight `511whJyR`) uses `environment = production` and
breaks down by `scan_type`. Its current chart includes pre-release data, so
exclude simulator sessions when reviewing the next release's results.

1. **Scan recovery funnel** — `scan_started` → `scan_error_shown` →
   `scan_try_again_tapped` → `scan_completed`; break down by `scan_type` and
   compare `capture_mode`.
2. **Core scan funnel** — `scan_started` → `scan_completed`; break down by
   `scan_type`, `source`, and `outcome`. The saved dashboard view currently
   uses the `scan_type` breakdown; add the additional breakdowns after the
   next build has populated those properties.
3. **Collection usage trends** — trend `collection_item_opened`,
   `timeframe_changed`, `condition_changed`, `market_region_changed`, and
   `collection_quantity_changed` by day; break down by `screen` where present.
4. **Bulk result engagement** — trend `bulk_photo_selected`,
   `bulk_result_selected`, `bulk_result_selection_changed`, and
   `items_added_to_collection` to show whether identified results are useful.
5. **Onboarding step progression** — funnel `onboarding_screen_shown` →
   `onboarding_step_shown` → `onboarding_get_started_tapped` →
   `onboarding_completed`, using `launch_kind = first_run` and excluding replay
   sessions. Keep the existing corrected onboarding insight; the historical
   install join remains incomparable.

These views answer “where did the user tap and what happened next?” without
requiring broad replay unmasking. A new production/TestFlight build is needed
for the event schema and allowlist to appear in live data. The recovery funnel
cannot be computed until `scan_error_shown` and `scan_try_again_tapped` have
arrived from that build; simulator sessions must remain excluded from revenue
and UX decisions.

## Verification and release status

The native unit target passed 244 tests in 39 suites, and the 18 focused UI
tests passed on the BrickVal Small iPhone simulator. The tests include the
stable analytics event contract, scan recovery, chart interactions, bulk
selection, persistence, and accessibility paths. A physical-device replay and
production event check remain required after the next build is installed.
