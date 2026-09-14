# PostHog onboarding funnel repair — 2026-09-14

## Finding

The dashboard funnel [Application Installed → onboarding_started](https://us.posthog.com/project/568935/insights/ibwcyGw6) reported 165 installed users and four onboarding starts (2.42%) for 15 August–14 September 2026. This was not a reliable onboarding conversion rate.

PostHog event definitions showed that both events were active. A recent event pair shared the same app build, OS, device context, and location and occurred about one second apart, but had different anonymous person/distinct IDs and sessions. Native startup code confirmed why: PostHog emitted its automatic install event, then the Clerk identity synchronization ran with no user and called `reset()` before `OnboardingView` captured `onboarding_started`. A fresh signed-out launch therefore split one install across two anonymous people. This is a confirmed analytics defect; it does not establish that users abandoned onboarding.

The historical funnel also mixed legacy builds (including build 162 and 166) and had no rows from the current 170+ releases. It must not be used for current product or revenue decisions.

## Implemented remedy

- Guarded PostHog reset so an already-anonymous launch keeps its anonymous install identity; identified sessions still reset on sign-out.
- Persisted the last identified Clerk ID and reset before identifying a different account after restart, preventing cross-account event merging.
- Added `app_ready` and `onboarding_screen_shown` events so launch readiness and the first visible onboarding surface are measured explicitly.
- Added a stable local install ID and optional PostHog session ID to custom events, with `analytics_identity` (`anonymous` or `identified`) and schema version `3`.
- Added onboarding session ID, replay flag, entry point, completion path, app build, OS, environment, simulator flag, and access cohort context.
- Kept analytics privacy boundaries: event properties contain no email addresses, receipts, payment details, passwords, provider credentials, or raw provider/error payloads. The existing opaque Clerk account ID remains the PostHog identity key and is not copied into event properties.

## Canonical funnel

The saved insight [First-run onboarding funnel](https://us.posthog.com/project/568935/insights/mlbWS207) is included on the [Mobile app growth dashboard](https://us.posthog.com/project/568935/dashboard/2041521). Its sequential steps are:

`app_ready` → `onboarding_screen_shown` → `onboarding_started` → `onboarding_completed`

It filters `environment = production`, `launch_kind = first_run`, and `is_replay = false`. Use the first-run cohort for conversion; inspect replay separately when evaluating returning users. Keep `is_simulator = false` and a released app build in any revenue or retention report. The current last-seven-days view is expected to be empty until a production/TestFlight build containing this change sends real events.

## Verification and remaining gap

- Full native unit suite: 237 tests in 38 suites, zero failures on the BrickVal Small iPhone simulator.
- Full native unit suite: 237 tests in 38 suites, zero failures on the iPhone 17 Pro simulator.
- Focused onboarding Get Started UI regression passed on both simulator sizes.
- Localization audit passed with 807 app strings plus four Info.plist strings across 13 languages.
- Build and TestFlight distribution of this analytics change, real production event delivery, and physical-device account-switch verification remain pending.

The old 2.42% number stays as historical evidence of the broken join. Do not delete or reinterpret it as a product conversion result. After the next build is installed, compare the new funnel against released build, `environment`, `is_simulator`, and `is_replay` properties, and wait for enough first-run users before making paywall or pricing decisions.
