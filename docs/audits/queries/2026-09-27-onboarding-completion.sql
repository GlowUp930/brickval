-- PostHog project 568935. One row per earliest eligible installation.
-- Default: 28 UTC cohort days, ending before yesterday so every row has 24 hours.
-- For baseline reconciliation, replace the two cohort bounds with
-- toDateTime('2026-09-14 00:00:00') and toDateTime('2026-09-26 00:00:00').
WITH first_ready AS (
    SELECT
        toString(properties.analytics_install_id) AS install_id,
        min(timestamp) AS ready_at,
        argMin(toString(properties.app_build), timestamp) AS build
    FROM events
    WHERE event = 'app_ready'
      AND properties.environment = 'production'
      AND properties.is_simulator = false
      AND properties.$is_testflight = false
      AND properties.launch_kind = 'first_run'
      AND properties.is_replay = false
      AND properties.analytics_schema_version >= 3
      AND properties.analytics_install_id IS NOT NULL
      AND toString(properties.analytics_install_id) != ''
    GROUP BY install_id
), cohort AS (
    SELECT * FROM first_ready
    WHERE ready_at >= toStartOfDay(now()) - INTERVAL 29 DAY
      AND ready_at < toStartOfDay(now()) - INTERVAL 1 DAY
), exposure AS (
    SELECT
        c.install_id AS install_id,
        c.ready_at AS ready_at,
        c.build AS build,
        countIf(e.event = 'onboarding_screen_shown') AS shown_events,
        minIf(e.timestamp, e.event = 'onboarding_screen_shown') AS shown_at
    FROM cohort c
    LEFT JOIN events e ON c.install_id = toString(e.properties.analytics_install_id)
    WHERE e.timestamp >= c.ready_at
      AND e.timestamp <= c.ready_at + INTERVAL 1 DAY
      AND e.properties.environment = 'production'
      AND e.properties.is_simulator = false
      AND e.properties.$is_testflight = false
      AND e.properties.launch_kind = 'first_run'
      AND e.properties.is_replay = false
      AND e.properties.analytics_schema_version >= 3
    GROUP BY c.install_id, c.ready_at, c.build
), journey AS (
    SELECT
        s.install_id AS install_id,
        s.build AS build,
        s.shown_events > 0 AS shown,
        countIf(e.event = 'onboarding_get_started_tapped'
                AND s.shown_events > 0 AND e.timestamp >= s.shown_at) > 0 AS tapped,
        countIf(e.event = 'onboarding_completed'
                AND s.shown_events > 0 AND e.timestamp >= s.shown_at) > 0 AS completed
    FROM exposure s
    LEFT JOIN events e ON s.install_id = toString(e.properties.analytics_install_id)
    WHERE e.timestamp >= s.ready_at
      AND e.timestamp <= s.ready_at + INTERVAL 1 DAY
      AND e.properties.environment = 'production'
      AND e.properties.is_simulator = false
      AND e.properties.$is_testflight = false
      AND e.properties.launch_kind = 'first_run'
      AND e.properties.is_replay = false
      AND e.properties.analytics_schema_version >= 3
    GROUP BY s.install_id, s.build, s.shown_events, s.shown_at
)
SELECT
    'All builds' AS build,
    count() AS ready_installations,
    sum(completed) AS converted_installations,
    round(100.0 * sum(completed) / nullIf(count(), 0), 2) AS conversion_percent
FROM journey
UNION ALL
SELECT build, count(), sum(completed),
    round(100.0 * sum(completed) / nullIf(count(), 0), 2)
FROM journey
GROUP BY build
ORDER BY build DESC
