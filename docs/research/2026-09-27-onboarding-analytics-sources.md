# Onboarding analytics: primary sources and query rules — 2026-09-27

This note supports the onboarding measurement repair. It establishes SDK and SQL semantics; live counts, saved insight changes, and product conclusions belong in the accompanying audit. Documentation was checked on 27 September 2026.

## What the installation event measures

The repository pins PostHog iOS **3.59.3**, revision `179438b8e0c9a357ab0caf453577f766ffddbcb3`. Its lifecycle integration calls `captureAppInstallOrUpdated()` during installation of the integration and also subscribes to launch notifications. It emits `Application Installed` when the saved `PHGBuildKeyV2` value is absent, saves the current build, and captures the event. Consequently, this event records a first SDK-observed launch, not an App Store download that has never opened the app. Missing lifecycle state can also occur when analytics is introduced to an existing installation. [Pinned lifecycle source](https://github.com/PostHog/posthog-ios/blob/179438b8e0c9a357ab0caf453577f766ffddbcb3/PostHog/AppLifeCycle/PostHogAppLifeCycleIntegration.swift#L37)

In the inspected BrickVal source, `setup()` precedes `registerInstallContext()`. Because lifecycle capture can occur inside setup, the first automatic install event cannot be assumed to contain the subsequently registered `analytics_install_id` or schema version. Custom events receive explicit common properties. Audit actual property coverage before requiring custom metadata on automatic lifecycle events. [Pinned setup source](https://github.com/PostHog/posthog-ios/blob/179438b8e0c9a357ab0caf453577f766ffddbcb3/PostHog/PostHogSDK.swift#L115), [BrickVal analytics](../../apps/ios-swift/BrickVal/Core/Analytics/PostHogAnalytics.swift)

## Identity and the measurement unit

In the pinned SDK, `reset()` clears local identity, registered properties, feature flag state, and session state. Subsequent events use a new anonymous identity unless `reuseAnonymousId` is enabled. A reset between install capture and onboarding capture can therefore split a single installation across distinct identities. [Pinned reset source](https://github.com/PostHog/posthog-ios/blob/179438b8e0c9a357ab0caf453577f766ffddbcb3/PostHog/PostHogSDK.swift#L540)

PostHog resolves anonymous and identified activity through person mappings and merge overrides. A query using resolved `events.person_id` measures people; a query grouped by BrickVal's persistent `analytics_install_id` measures observed installation IDs. These units answer different questions. [PostHog person processing](https://github.com/PostHog/posthog/blob/master/docs/published/handbook/engineering/person-processing.md)

**Repair rule:** use nonempty installation IDs for the custom-event cohort; aggregate to one row per installation before counting. Do not merge missing IDs into one group or fabricate a link from an anonymous lifecycle event without evidence. Keep a separately named person-based legacy diagnostic where needed. A left join retains unconverted starters, but multiple matching event rows can multiply the denominator unless the right side is first aggregated or the final count is distinct. This is an application of PostHog's documented join behavior. [PostHog SQL joins](https://github.com/PostHog/posthog.com/blob/master/contents/docs/data-warehouse/sql/index.mdx)

## Conditional aggregates and missing events

PostHog explicitly supports `countIf` and `minIf` and refers to ClickHouse for their definitions. `countIf(condition)` counts matching rows; it does not independently count unique people or installations. [PostHog aggregate list](https://github.com/PostHog/posthog.com/blob/master/contents/docs/sql/aggregations.mdx), [ClickHouse countIf](https://clickhouse.com/docs/guides/clickhouse/examples/aggregate-function-combinators/countIf)

ClickHouse's `-If` aggregate suffix returns a type default when no row matches. Therefore, `minIf(timestamp, condition) IS NOT NULL` is not a safe event-existence test: an absent event can have a non-null default timestamp. Maintain `countIf(condition) > 0` alongside each conditional timestamp, and require positive counts before testing order or elapsed time. `-OrNull` offers nullable empty-result semantics in ClickHouse, but verify HogQL support before using a combined function name. [ClickHouse aggregate combinators](https://clickhouse.com/docs/reference/functions/aggregate-functions/combinators)

For an installation row, conversion requires an observed target event, target time at or after the starter, and target time within the declared window. For sequential stages, require each preceding observed stage in order. Treat conversion exactly at the window boundary consistently. Exclude or separately label starters whose conversion window has not elapsed; do not call immature rows confirmed drop-offs.

## First occurrence and event coverage

PostHog distinguishes **first-ever occurrence** from **first occurrence matching filters**. The former considers the earliest occurrence of the event type, then excludes it if it fails the step filters or date range. The latter ignores occurrences that do not match the filters. These options produce different populations. [PostHog funnel documentation](https://github.com/PostHog/posthog.com/blob/master/contents/docs/product-analytics/funnels.mdx)

**Repair rule:** `MIN(timestamp)` after a date filter establishes only the first event in that scanned range. Compute the earliest qualifying starter across available retained history before applying the cohort date range, or explicitly label the result as first observed in range. Historical data loss or pre-instrumentation usage prevents proving a lifetime first launch.

BrickVal's custom event properties include schema version, string `app_build`, environment, simulator flag, and installation ID. The SDK's automatic lifecycle event supplies its own `build` and `version`. Normalize build representations explicitly; do not assume the property names are interchangeable. Report missing installation IDs and per-event schema/build coverage separately. Require physical App Store eligibility on the cohort starter and compatible target events, with replay exclusion for onboarding events; missing properties establish unknown eligibility, not production eligibility. [BrickVal event contract](../../apps/ios-swift/BrickVal/Core/Analytics/PostHogAnalytics.swift), [Pinned lifecycle properties](https://github.com/PostHog/posthog-ios/blob/179438b8e0c9a357ab0caf453577f766ffddbcb3/PostHog/AppLifeCycle/PostHogAppLifeCycleIntegration.swift#L105)

## Validation cases for the repair

- Missing target event: no conversion, even when its conditional minimum is non-null.
- Duplicate starter or target events: one installation in each applicable count.
- Target before starter or after the window: no conversion.
- Account identification or reset: installation cohort remains stable when its ID is present.
- Earlier starter outside the report range: not a new starter solely because it returns inside the range.
- Simulator, TestFlight, replay, missing eligibility, and unsupported schema: excluded or explicitly reported as separate coverage gaps.
- Recent starter with an incomplete window: reported separately from mature conversion results.

These cases are acceptance criteria. This research note does not claim they passed against the live repaired insight.
