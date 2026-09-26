# Optional notification retention sequence

Date: 26 September 2026. Source implementation; rollout disabled. No production deployment, App Store release, or live notification campaign is part of this change.

## Implemented behaviour

- One invitation after a usable result, with persistent equal sequence/holdout assignment and separate consent.
- Local reminders after seven and 21 inactive days, subject to weekly and rolling 30-day limits, utility collisions, permission and remote policy.
- Activity cancellation, language/time-zone reconciliation, identity separation, and explicit cold-launch destinations.
- Existing scan/trial/account paths preserved; hard users and active subscribers cannot request free reset reminders. Trial content states an actual scheduled renewal date.
- Complete copy for all 13 app languages. No price alerts or offers.

Both retention dates are reserved together so the later one works when iOS never wakes BrickVal. The user explicitly approved this adjustment. Reservation dates are counted conservatively after they pass, never labelled delivered.

## Event contract

Every native analytics event gains `retention_assignment` (unassigned/sequence/holdout), `retention_eligible_at` (Unix seconds when first assigned), and `retention_experiment_version=1` when local experiment state exists. Existing installation, account, build, production, simulator, and TestFlight properties remain available.

| Event | Meaning |
| --- | --- |
| `notification_experiment_eligible` | Installation assigned before invitation; denominator for both groups |
| `notification_consent_shown` | Invitation presented |
| `notification_consent_declined` | User chose Not now |
| `notification_authorization_changed` | Observed system permission status changed; previous and current status |
| `notification_consent_denied` | System permission not granted |
| `notification_consent_enabled` | Explicit consent and system authorization granted |
| `notification_scheduled` | Request accepted by local notification center, not observed delivery |
| `notification_cancelled` | Pending request/category cancelled |
| `notification_schedule_failed` | Scheduling failed; no delivery claim |
| `notification_foreground_presented` | Delegate observed foreground presentation |
| `notification_tapped` | User opened a notification |
| `notification_meaningful_activity` | Usable result, collection save, or item opening; includes `activity` and whether a tap occurred in the preceding 24 hours |

Retention schedules include step, notification identifier, and scheduled Unix time. No collection content is emitted. General meaningful-activity events include both groups and all opted-out users, not only those who tapped a notification. Tap proximity is descriptive attribution, not causal proof. Turning retention off records a cancellation for the retention category; report it as an opt-out only for previously consenting installations.

## Report definitions

Use production physical-device App Store events from the implemented build onward. Exclude simulators, TestFlight, and identified internal test accounts. Count installations by `analytics_install_id`; also report distinct accounts and account-switch contamination. Analyze hard/soft access cohorts separately without inventing statistical confidence from small samples.

- Denominator: all assigned eligible installations, including users who decline permission. Compare sequence against holdout on an intention-to-treat basis.
- D7/D28: at least one meaningful action during the local eligibility-day anniversary window (day 7 or 28). For consistent reporting use UTC 24-hour windows relative to the eligibility timestamp, and label that definition.
- Successful scan days: distinct UTC dates with a usable-scan meaningful event within 28 days.
- First collection save: first observed collection-save event after eligibility, checking available historical save events to distinguish existing collectors.
- Revenue per eligible installation: attributed realised purchase/renewal revenue minus refunds within 28 days, divided by all eligible installations. Use verified RevenueCat transactions, currency normalization, and account-to-install identity mapping. Do not derive revenue from paywall taps or Pro activation. Ambiguous multi-install/account joins must be flagged and reported separately rather than duplicating revenue.
- Experience guardrails: consenting users disabling retention, observed permission revocation, notification-related support complaints, and app reliability. iOS revocation is observable only when the app runs; uninstall/delivery rates are not available from local scheduling alone.

Keep seven-day and 28-day reports separate and include only mature cohorts. Report counts, rates, and uncertainty; current traffic may be too small to conclude revenue uplift. Do not combine earlier build-190 analytics with this version's experiment or assume existing identity checks are complete.

## Release gate

`BRICKVALUE_RETENTION_NOTIFICATIONS_ENABLED=false` by default. Deploying backend support alone cannot enable the sequence. A native build containing this code is required. Reconcile an emergency remote disable on subsequent app launches; a closed app cannot receive an instantaneous local kill switch.

Before enabling: confirm requested reset delivery, dated trial delivery/cancellation, billing APNs in the correct environment, cold launch destinations, permission refusal/revocation, both retention reservations, and cancellation after meaningful activity on a physical iPhone. Use DEBUG fixtures or a test notification clock, not seven-day waits. Do not enable production merely because simulator tests pass.

## Verification

- Final focused native run: 22 tests passed, zero failures, covering the retention planner, coordinator, invitation refusal, holdout, and routing. A simulator launch failure on the preceding attempt cleared after restarting the dedicated test simulator.
- Earlier focused notification/model/image-cache/UI run: 32 tests passed, zero failures.
- Wider native run: 276 passed and one failed. The unrelated image-cache disk-trimming timing assertion passed on the focused rerun. The wider suite is not reported as wholly passing.
- Backend policy, notification localization, and scan-gate tests: 11 passed. Type checking passed.
- Localization audit passed for 846 app strings and four Info.plist strings across all 13 languages. Diff whitespace checks passed.

Native version 1.13 (192), containing this change, is signed and uploaded to App Store Connect for TestFlight processing. Archive: `/tmp/BrickVal192-v113-retention.xcarchive`; arm64 dSYM UUID `45FA4946-DC43-39D2-9555-E95D3AA1F412`; strict signature verification passed. The prior 1.12 train was closed, so the release marketing version moved to 1.13. `BRICKVALUE_RETENTION_NOTIFICATIONS_ENABLED` remains false. Physical iPhone local delivery, external trial cancellation/renewal/expiry, hardware permission journeys, billing APNs, and Sentry symbol upload remain pending. No App Review submission or App Store release was made.

Temporary simulator result bundles were removed to recover disk space before archiving. Test summaries above are retained here.
