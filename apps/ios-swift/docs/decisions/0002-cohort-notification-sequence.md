# First-week activation and scan reminders

Updated: 9 October 2026. Supersedes the 26 September 7/21-day inactivity sequence.
Implementation version 2; production rollout must remain disabled until release gates pass.

## Consent and eligibility

Assign eligible installations persistently and equally to sequence or holdout
before inviting. First eligibility is the visible first onboarding demo; returning
users can also qualify after a usable result. Exclude onboarding replay and known
active subscribers. Holdout has no campaign invitation or campaign reminders.
Requested scan-reset, trial and billing notifications remain independent.

Show a small inline invitation after the demo, below Get Started/sign-in controls.
Do not block Get Started or display an automatic system permission prompt.
Invitation: “Want a reminder to scan your minifigures?” Explanation: “Up to three
reminders in your first week. Some scanning features require Pro. Turn reminders
off anytime in Settings.” Actions: Enable reminders / Not now. Record display
once per installation; Settings allows a later explicit choice. Ask iOS permission
only after Enable reminders. Existing denied/authorized statuses are never prompted
again automatically.

## One campaign

Anchor dates to first consent, never to activity: day 1, day 3, day 7, each at
6 PM device-local time no earlier than 24, 72, 168 elapsed hours. Evening consent
or daylight-saving boundaries can move delivery to the next local evening;
“day 7” is the last planned step, not a promise of exactly 168-hour delivery.
Reserve all three locally so a closed app needs no background wakeup.

| Step | No usable scan | Usable scan completed |
| --- | --- | --- |
| 1 | Meet your first minifigure — Place one minifigure in good light and scan it to identify it. | What’s your next find? — Scan another minifigure and see what you discover. |
| 2 | Start with just one figure — One minifigure, good light, one photo. Open BrickVal and try your first scan. | A few figures to identify? — Try Bulk Scan to identify several minifigures in one photo. Pro may be required. |
| 3 | Have a minifigure nearby? — Open BrickVal and try scanning it when you have a moment. | One more find this week? — Pick another minifigure and scan it with BrickVal. |

Latest recognition failure changes step 1 to “Try one figure at a time — Separate
one minifigure from the pile and try again in good light.” Network, camera and
permission failures do not select that copy. Refresh pending copy while the app
runs. A new attempt clears the failure flag; a usable result selects repeat copy.
Locked previews are not usable results.

Skip steps within 24 hours after a scan attempt or collection action, within
24 hours of a requested reset/trial reminder, within 48 hours of another campaign
reservation, or beyond three campaign reservations per rolling 30 days. Skipped
steps are permanently consumed, not shifted or reinstated. Elapsed reservations
consume the budget conservatively, without claiming delivery. No monthly restart.
Purchase/trial activation, opt-out and account change end the campaign permanently.
Remote policy/permission disable removes pending requests; it does not restart dates.

## Routing, migration and compatibility

All campaign links target Scan with version, step, copy variant and mode context.
Only repeat-scan step 2 selects Bulk; other steps select Single. Queue Scan taps
behind unfinished onboarding, persist that pending route, and apply after completion.
Reset old result navigation, pause automatic capture on entry and preserve all
entitlement gates. A notification never opens a paywall or starts a scan itself.

State uses `brickvalue_retention_state_v2`; analytics experiment version is 2.
Version-2 eligibility has its own timestamp so legacy eligibility cannot backdate
the new measurement windows.
Migrate legacy assignment, eligibility, invitation history and elapsed frequency
budget; remove old pending requests and revoke old consent. Previously shown
invitations do not repeat: those users can explicitly consent to the new frequency
in Settings. Anonymous-to-identified account changes also end an already-started
campaign, by design. Account activity/copy never transfers to a different account.

Reuse the coordinator, iOS local scheduler and
`BRICKVALUE_RETENTION_NOTIFICATIONS_ENABLED` (default false). No new APNs service,
pricing change, free allowance, or backend schema migration. The app reconciles
external subscription, timezone and policy changes when next run; it cannot retract
local reminders instantly while closed. Frequency is per installation, not cross-device.

## Measurement and release

See [implementation audit](../../../../docs/audits/2026-10-09-first-week-activation.md).
Do not merge version-1 and version-2 experiment cohorts. Notification schedules are
not delivery receipts; purchases require verified provider evidence. Never-launched
installations cannot be reached through this app's notifications. Public acquisition
copy is in `docs/marketing/2026-10-09-first-scan-messages.md`.
