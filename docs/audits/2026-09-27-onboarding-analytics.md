# Onboarding analytics correction — 27 September 2026

## Status

The historical [install funnel](https://us.posthog.com/project/568935/insights/ibwcyGw6)
is renamed **Historical install funnel — invalid conversion metric**. Its
description explains the identity defect, discontinued exposure event, SDK
launch meaning, and unmeasured startup/download losses. Both changes were
saved through the full insight editor and verified after browser reload. The
original events, steps, date settings and historical counts are preserved.

The replacement dashboard queries are prepared and pass synthetic acceptance
checks. Their live reconciliation and addition to the
[Mobile app growth dashboard](https://us.posthog.com/project/568935/dashboard/2041521)
remain pending. Concurrent Chrome navigation repeatedly interrupted access to
the SQL tab. An isolated Codex browser was also checked, but it is not signed
in to PostHog. No replacement rate is claimed to be published or fully audited.

No native product, pricing, paywall, or event implementation changed. A new app
build is not required for these report changes.

## Earlier observed baseline

The planning review ran live PostHog SQL for cohort entries from
**14 September 2026 00:00 UTC inclusive to 26 September 2026 00:00 UTC exclusive**.
It grouped by `analytics_install_id`, used production, physical-device,
non-TestFlight, first-run, non-replay starter events, and inspected outcomes
within 24 hours of the first readiness event in that date range.

| Entry build | App-ready installations | Screen events reached | Get Started reached | Completion reached |
| --- | ---: | ---: | ---: | ---: |
| 180 | 44 | 44 | 36 | 35 |
| 188 | 56 | 56 | 46 | 47 |
| 189 | 16 | 16 | 14 | 11 |
| 190 | 2 | 2 | 2 | 1 |
| Total | 118 | 118 | 98 | 94 |

The corresponding observed rates are **100%**, **83.05%** (83.1% rounded to one
decimal), and **79.66%** (79.7%). These are a baseline to reconcile, not a
download-to-onboarding estimate. The earlier query restricted starter history
to the report period and did not enforce replay exclusion on every target
event or screen-to-target chronology. The corrected queries strengthen all
three rules. Therefore, their counts may differ; identify the removed
installations by cause before publishing replacement rates.

Build 190's event-coverage check found physical, non-TestFlight onboarding
screen and Get Started events but no `onboarding_started` event. The latter
was removed from native source in schema 5. In prior source it fired together
with the screen event, so it measured exposure rather than a user decision.
The original chart's 120/338 = 35.50% does not measure current onboarding
engagement. See the [identity repair](2026-09-14-posthog-onboarding.md) and
[journey audit](2026-09-23-posthog-journey-audit.md).

## Report contract

Use the [canonical cohort query](queries/2026-09-27-onboarding-cohort.sql) to
reconcile all outcomes, then save the three focused queries as table insights:

| Insight title | Query | Numerator |
| --- | --- | --- |
| Onboarding readiness — 24h / tracked installations | [Readiness](queries/2026-09-27-onboarding-readiness.sql) | Observed `onboarding_screen_shown` after readiness |
| Get Started engagement — 24h / tracked installations | [Get Started](queries/2026-09-27-onboarding-get-started.sql) | Observed `onboarding_get_started_tapped` after a qualifying screen |
| Onboarding completion — 24h / tracked installations | [Completion](queries/2026-09-27-onboarding-completion.sql) | Observed `onboarding_completed` after a qualifying screen |

All percentages use **app-ready installations** as their denominator. The
tables include numerator, denominator, total rate and initial app-build
breakdowns. Completion does not require a Get Started event: direct sign-in
is a valid path. The reports measure separate outcomes rather than requiring
everyone to traverse a single Get Started funnel.

1. Compute the earliest eligible `app_ready` for each nonempty installation ID
   across available retained history **before** applying cohort dates.
2. Require `environment=production`, `is_simulator=false`, `$is_testflight=false`,
   `launch_kind=first_run`, `is_replay=false`, and analytics schema at least 3
   for starter and target events. Missing properties do not establish eligibility.
3. Keep one installation row despite repeated events, restarts, or identified
   person changes. Attribute the installation to its starter build; a later
   build within the outcome window remains eligible.
4. Count outcomes at or after readiness and no later than readiness plus
   24 hours. Get Started/completion also require an actual screen event and
   target at or after its first eligible timestamp. Event counts explicitly
   guard conditional minima against missing-event default timestamps.
5. In the project's observed UTC timezone, use the 28 days from UTC midnight
   29 days ago inclusive to UTC midnight yesterday exclusive. Every included
   entry has a full 24-hour window. On 27 September this means
   29 August–25 September entries, not entries still arriving on the 26th/27th.
6. Keep query-defined cohort bounds authoritative. These SQL reports do not
   use the generic dashboard date filter, which must not truncate history
   before first readiness is computed. Say this in each insight description.

Recommended saved description (substitute the outcome name):

> Outcome within 24 hours / earliest eligible app-ready installation. One row
> per installation across retained history. Production physical devices only;
> excludes TestFlight, replay and unknown eligibility. Last 28 mature UTC cohort
> days are defined in SQL, independently of dashboard date filters. Not downloads
> or startup reliability. Counts and starter-build breakdown included.

Preserve the existing first-run funnel as a separately named person-based
diagnostic if it is still needed. Explain its measurement unit; it must not
compete with the installation-based KPI under the same title. Do not delete
historical insights or silently change their event meanings.

## Acceptance evidence

`python3 scripts/verify-onboarding-cohort.py` passes all four repository
queries using synthetic events in an in-memory SQLite adapter. This exercises
the actual saved query structure while substituting PostHog property access,
day intervals and documented conditional aggregate semantics. It does not
prove live HogQL compatibility.

Verified synthetic cases: guest journey; direct sign-in completion without
Get Started; duplicated starters and targets; restart; anonymous-to-identified
change; missing targets with non-null default conditional minima; targets
before readiness; targets after 24 hours; targets exactly at 24 hours;
earlier retained readiness outside the report range; immature entries;
TestFlight; simulator; replay starters and targets; missing eligibility; empty
or missing installation IDs; old schema; and initial-build attribution after
an upgrade. Total cohort counts equal the sum of build rows.

Pending live acceptance:

- Execute the canonical query with fixed baseline dates; compare against
  118/98/94. Investigate earlier-history, replay, schema and event-order differences.
- Execute the rolling query and all three focused queries in PostHog. Require
  matching denominators and numerator counts before saving dashboard tiles.
- Inspect aggregate evidence of repeated readiness events and multiple
  distinct identities sharing an installation; prove grouping counts each once.
- Inspect live guest and direct-sign-in paths; verify replay/TestFlight events
  cannot enter either starter or outcome counts.
- Save each insight, add it to the growth dashboard, and reopen it to confirm
  SQL, labels, descriptions and counts persisted. Confirm the historical warning
  remains on its preserved insight.

Physical fresh-install walkthroughs were not performed. Existing screen events
fire in `OnboardingView.onAppear`, which can occur before the launch overlay is
fully dismissed. Even a 100% recorded screen rate does not establish a visible,
interactive screen for every user. Startup loss before `app_ready` and
download-to-first-open conversion remain explicitly unmeasured.

## Primary sources

See the [pinned SDK and SQL source note](../research/2026-09-27-onboarding-analytics-sources.md).
PostHog iOS 3.59.3 emits its installation event while running, and setup can
emit it before BrickVal registers installation context. Do not fabricate an
installation-ID join for automatic lifecycle events that lack that property.
