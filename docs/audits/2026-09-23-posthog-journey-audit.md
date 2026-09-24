# PostHog user journey audit — 2026-09-23

## Repair status — 2026-09-23

This section supersedes the original read-only snapshot below. The saved
[first-run funnel](https://us.posthog.com/project/568935/insights/mlbWS207)
now uses `app_ready` → `onboarding_screen_shown` → `onboarding_completed`, a
one-day conversion window, `environment=production`, `is_simulator=false`,
`$is_testflight=false`, `is_replay=false`, `launch_kind=first_run`, and an
`app_build` breakdown. The old identity-broken install funnel was removed from
the growth dashboard without deleting the insight; its description warns that
its drop-off is invalid. The [new paywall funnel](https://us.posthog.com/project/568935/insights/MowsDKp5)
is on the [growth dashboard](https://us.posthog.com/project/568935/dashboard/2041521):
upgrade request → paywall shown → purchase started → purchase finished with
`outcome=purchased` on the last step. It uses unique people, a one-day window,
and production, physical-device, non-TestFlight filters. These are historical
person-level counts, not per-exposure conversions or revenue. The current
dashboard chart still needs a build-specific read and controlled device check.
The [onboarding step-reach chart](https://us.posthog.com/project/568935/insights/RP3OxHGk)
now shows daily unique people by `step`, filtered to first-run, non-replay,
production, physical-device, non-TestFlight traffic. It shows reach rather
than sequential conversion; compare adjacent steps within the same build.

Native schema 5 source now generates opaque `paywall_view_id` on actual
presentation and carries it into dismissal and purchase attempts. A deduped
`pro_access_activated` fires only on inactive-to-active access confirmed by
RevenueCat or the verified server response, with `activation_source` and
known trial status. RevenueCat receives `$posthogUserId` after setup and
identity changes. The duplicate `onboarding_started` emission is removed.
Focused native tests cover purchase correlation and activation deduplication.
This source has **not** been uploaded; build 189 is unchanged. Still required:
physical-device purchase/cancel/restore/offer-code walkthrough, provider
integration check, and released-build cohort validation.

Event contract for the new source (owner: native iOS app):

| Event | Fires when | Interpretation |
| --- | --- | --- |
| `onboarding_step_shown` | A named onboarding step appears | Reach, not step completion; filter `launch_kind=first_run` and `is_replay=false`. |
| `paywall_presented` | Superwall confirms a paywall appeared | Carries `placement`, `source_placement`, and opaque `paywall_view_id`. |
| `paywall_dismissed` | Superwall reports a close | Carries `close_reason` and the same view ID when a presentation was tracked. |
| `purchase_attempt_started/finished` | StoreKit purchase/restore begins and ends | Shared `attempt_id`, optional `paywall_view_id`, `operation`, terminal `outcome`; `purchased` is not revenue. |
| `pro_access_activated` | Locally inactive Pro becomes verified active | `activation_source` and known `is_trial`; can be restore/existing entitlement, not necessarily a new sale. |

The targeted `PurchaseAttemptTests` and `PostHogAnalyticsTests` pass on the
small iPhone simulator. A broader run including `PaywallRoutingTests` failed
eight message assertions because the simulator's language was Arabic while
those tests expected English; the captured actual message was Arabic. That
failure is separate from the analytics changes. The broader suite was not
claimed as passing.

## Scope and evidence

Read-only review of live PostHog project 568935 and native iOS source. No dashboard,
tracking, or purchase-flow settings were changed. Live observations are snapshots,
not validated production conversion estimates.

- [Mobile app growth dashboard](https://us.posthog.com/project/568935/dashboard/2041521)
  contains Core scan funnel, First-run onboarding funnel, User retention, Upgrade
  requests over time, and the historical Onboarding funnel.
- [First-run onboarding funnel](https://us.posthog.com/project/568935/insights/mlbWS207)
  showed 94 `app_ready` people and 80 `onboarding_completed` people (85.11%) for
  16–23 September UTC. Its saved filters are `environment=production`,
  `is_replay=false`, and `launch_kind=first_run`; no `is_simulator=false` or
  app-build filter is saved. It uses unique users, sequential steps, and a
  14-day conversion window. These settings make its headline unsuitable as a
  clean single-build, physical-device first-run rate.
- The first three funnel steps are `app_ready`, `onboarding_screen_shown`, and
  `onboarding_started`. Source emits the latter two together in `OnboardingView`
  `onAppear`, so their 100% conversion does not measure engagement.
- A live `paywall_presented` event from iOS build 188 has schema version 4,
  `environment=production`, `is_simulator=false`, `access_cohort=hard_trial`,
  and `placement=onboarding_hard_access`. PostHog's event list also contains
  `paywall_dismissed`, `purchase_attempt_started`, and
  `purchase_attempt_finished`. Presence confirms delivery, not correct counts
  or successful end-to-end joins.
- The older [Onboarding funnel](https://us.posthog.com/project/568935/insights/ibwcyGw6)
  remains on the same dashboard with a description that presents install-to-start
  drop-off as real. The [September 14 identity audit](2026-09-14-posthog-onboarding.md)
  established that historical metric was broken by an anonymous ID reset.

## Assessment

| Priority | Finding | Evidence and impact |
| --- | --- | --- |
| P0 | First-run KPI mixes ineligible traffic | Saved funnel omits `is_simulator=false` and a release/build cohort. Production-labelled simulator builds can enter. Its 14-day window also allows completion after the displayed seven-day entry period; report these settings with the number. |
| P0 | No confirmed Pro activation in custom app events | `purchase_attempt_finished` reports `purchased` after RevenueCat returns, while `EntitlementStore` can also update through a separate stream. No explicit `pro_access_activated` or entitlement-confirmed custom event exists. Do not equate purchase tap, purchase result, active Pro, and paid revenue. RevenueCat remains source of truth for trial and revenue. Provider-to-PostHog integrations were not verified in this review. |
| P1 | Paywall journey has no saved funnel | Source emits `upgrade_requested`, `paywall_presented`, `paywall_dismissed`, `paywall_presentation_failed`, and purchase start/finish. Dashboard only plots upgrade requests over time. It cannot show request-to-view failures, view-to-purchase starts, outcome split, or placement-specific conversion. |
| P1 | Onboarding detail steps are unreported | `onboarding_step_shown` includes `step`, `step_index`, `onboarding_session_id`, `launch_kind`, and `is_replay`; no saved step-progression chart appears on the growth dashboard. The current headline cannot localize drop-off among value, scan reveal, goal, trust, review, account, and referral screens. |
| P1 | Historical broken funnel remains prominent | The old install-to-start tile can still be read as a current product failure. Archive or clearly label it as invalid historical data after preserving the evidence. |
| P1 | Paywall exposures lack stable view-level join | `paywall_presented` has placement and source placement; purchase attempts have placement and `attempt_id`. Repeated exposures by one person have no shared `paywall_view_id`, so a precise per-exposure conversion or dismissal attribution is unavailable. Person-level funnels are possible now. |
| P2 | Event definitions lack a visible ownership contract | PostHog labels at least `paywall_dismissed` as an unverified event with no description. Define meaning, owner, allowed properties, and expected trigger for the small set of decision-driving events. |
| P2 | Retention and upgrade tiles need cohort discipline | Dashboard retention and upgrade requests mix builds/cohorts unless filters are set; upgrade requests count events, not necessarily distinct interested people. Label dashboard date range, unique-user basis, and exclusions. |
| P2 | Provider purchase joins need verification | The native source does not set RevenueCat's `$posthogUserId` subscriber attribute. If the RevenueCat-to-PostHog integration is enabled, its server events may use a different user ID and fail to join the app journey. Check live integration settings and a controlled purchase before adding provider events to a funnel. |

## What works

- The native app sends intentional events rather than all tap labels. Schema 4
  adds build, platform, environment, simulator, install, session, and access
  cohort to custom events (`PostHogAnalytics.swift`).
- Anonymous identity reset was fixed for fresh signed-out launches. The code
  identifies Clerk users and updates plan person properties; the September 14
  audit explains the historical break.
- Onboarding has screen, step, start, Get Started, sign-in completion, and
  completion events. Completion means `finishOnboarding()` set the local
  completion flag and called `onFinish()`. It does not mean signed-in, Pro,
  first scan, or retained user.
- Paywall records request, actual presentation, dismissal reason, and failure.
  RevenueCat purchase attempts include one `attempt_id`, operation, placement,
  product, duration, and terminal outcome. These are suitable for focused
  troubleshooting when filtered to physical released builds.
- Session replay masks inputs, images, sandboxed views, and paywall content.
  The [September 16 UX instrumentation audit](2026-09-16-posthog-ux-instrumentation.md)
  documents the safe unmasking boundary and planned views.

## Plan

1. **Make one trusted first-run dashboard.** Save a physical-device filter
   (`environment=production`, `is_simulator=false`, `is_replay=false`,
   `launch_kind=first_run`, selected released builds). Use unique people for
   acquisition conversion and a documented conversion window. Remove the
   redundant `onboarding_started` step or relabel it as an exposure event.
   Keep the historical broken tile only in an archive with an explicit warning.
2. **Find onboarding friction.** Save `onboarding_step_shown` progression by
   `step`, plus splits for guest/signed-in completion, goal, access cohort,
   language, and build when sample size allows. Measure first action after
   completion (`scan_started`, collection action) separately. Check that
   physical-device step counts agree with a controlled walkthrough.
3. **Build paywall funnel from existing events.** For each placement, report
   unique people through `upgrade_requested` → `paywall_presented` →
   `purchase_attempt_started` → `purchase_attempt_finished` with terminal
   outcome. Add companion views for presentation failures, dismissals by
   `close_reason`, trial prompt, and offer-code attempts. Keep `operation=restore`
   separate from new purchases.
4. **Add minimal missing joins and outcomes in a later app build.** Assign an
   opaque `paywall_view_id` when each paywall is presented and carry it to
   dismissal and purchase events. Emit one deduplicated `pro_access_activated`
   when an inactive-to-active entitlement transition is confirmed, with
   `activation_source` (purchase, restore, offer code, existing entitlement)
   and trial status. Do not send receipt, email, price, or raw error payload.
   Validate monetary totals against RevenueCat, not PostHog event counts.
5. **Govern and verify.** Give key events definitions and owners in PostHog;
   document property names and schema version in repo. Test fresh guest,
   signed-in, skipped-sign-in, replay, purchase, cancel, failure, restore,
   and offer-code journeys on a physical TestFlight build. Check event order,
   identity continuity, simulator exclusion, and one terminal event per
   attempt before using conversion figures for product decisions. Confirm
   whether Superwall or RevenueCat sends its own PostHog events; if enabled,
   align identities and prevent double counting. See the
   [official-source note](../research/2026-09-23-posthog-audit-sources.md).

## Limits

This review did not change live PostHog configuration or inspect every event
row, paywall campaign variant, or RevenueCat transaction. The observed 85.11%
is the saved funnel's output under its current filters, not an audited business
KPI. Privacy masking prevents direct replay inspection of paywall content.
