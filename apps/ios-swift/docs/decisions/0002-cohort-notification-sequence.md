# Cohort Notification Sequence

Updated: 2026-09-26. Supersedes the 2026-08-14 prohibition on optional inactivity reminders.

## Decision

Use a low-volume, explicitly opted-in notification system:

- Soft-cohort users can request one local free-scan reset reminder. Hard-cohort non-purchasers receive no reset permission prompt.
- Trial users with a future renewal can request one local reminder 48 hours before the scheduled renewal. Copy states the actual renewal date, without asserting renewal is inevitable.
- Subscribers can opt into billing-action alerts.
- After a usable result, eligible installations are assigned equally to sequence or holdout. Assignment is persistent and precedes the consent invitation. Holdout receives no retention invitation or sequence; existing requested and billing reminders remain available.
- Sequence installations receive one consent invitation per installation. Default is off. The invitation explains the frequency before requesting system permission. Settings provides a separate control, including an off switch when rollout is disabled.

## Retention sequence

Meaningful activity is a usable single/bulk result, a collection save, or opening a collection item. Failed scans and locked previews do not qualify. Hard-cohort users must have Pro access when recording a usable result. Bulk invitations wait until results are ready for interaction.

Schedule at 6 PM device-local time after seven inactive calendar days, never earlier than the anniversary of the last meaningful activity. Copy directs users with saved items to Collection and others to Scan. Reserve a second generic Scan reminder after 21 inactive days. Both are scheduled locally because iOS does not reliably wake the app to schedule the second while it stays closed. The user approved this change from the original single-next-request plan.

Cancel and recalculate on meaningful activity, collection presence changes, subscription updates, foreground entry, language changes, and significant clock/time-zone changes. At most two reminders per episode, one per seven elapsed days, and two per rolling 30 days. A reserved date that has elapsed consumes the frequency budget conservatively; it is not reported as delivery. Conflict within 24 hours of a requested scan/trial reminder skips retention. Step two requires step one to have been reserved or elapsed.

## Implementation and boundaries

Use the existing native coordinator and notification center, with durable local state and two stable retention identifiers. Serialize scheduling writes to prevent stale requests from surviving rapid activity changes. Anonymous users need no server scheduler or collection upload. Consent, assignment, and installation invitation history survive account changes; activity and pending reminders do not. Frequency history survives changes to prevent extra notifications. Collection contents remain local.

Cold-launch notification taps are queued until the router is ready. Destinations are `brickval://scan`, `brickval://collection`, and `brickval://subscription`; legacy `brickval://settings` remains supported. Scan and Collection links clear their old navigation stacks. Opening Scan respects current entitlement and existing gates without opening a paywall from the notification itself.

The backend policy adds `notifications.retention`, default false, controlled by `BRICKVALUE_RETENTION_NOTIFICATIONS_ENABLED`. Older policy payloads decode to false. No server notification migration or subscription-price change is needed.

Local limitations are explicit: external subscription cancellations and policy changes cannot retract local notifications while the app remains closed. Local state is installation-specific, not a cross-device frequency cap. Device timezone changes are reconciled when the app runs. Trial copy remains renewal-neutral to avoid claiming a cancelled trial will renew.

## Privacy and experience

No badges, collection names, images, amounts, price-change claims, discounts, or promotional offers. Permission denial never blocks the app. Do not infer a delivery receipt from a scheduled date or APNs acceptance. Retention does not depend on a paid status claim that might become stale.

## Measurement and rollout

See [implementation and measurement report](../../../../docs/audits/2026-09-26-notification-retention.md). Keep rollout disabled until a new build and physical-device checks pass. Review weekly using mature windows and preserve holdout while evidence is insufficient.

Sources: [Apple notification permission](https://developer.apple.com/documentation/usernotifications/asking_permission_to_use_notifications), [Apple notifications design](https://developer.apple.com/design/human-interface-guidelines/notifications), [App Review 4.5.4](https://developer.apple.com/app-store/review/guidelines/#push-notifications).
