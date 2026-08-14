# Cohort Notification Sequence

Date: 2026-08-14

## Decision

Use a low-volume, event-based notification system rather than generic marketing reminders:

- Hard-cohort non-purchasers receive no notification permission prompt.
- Soft-cohort users can request one local notification when their daily free scans reset.
- Annual trial users can request one local reminder 48 hours before renewal.
- Subscribers can opt into account-action alerts for billing problems.
- There are no onboarding, inactivity, renewal-success, collection-limit, or bulk-limit pushes.

## Implementation

Local reminders are scheduled with `UNUserNotificationCenter` only after the user selects an explicit reminder action. Alert and sound authorization are requested without badges. Quiet hours from 8 PM to 9 AM are respected, and entitlement changes reschedule or cancel trial reminders. Notification taps open Scan for scan-reset reminders and Profile > Subscription for trial or billing alerts.

Signed-in device tokens are registered in `notification_devices`. RevenueCat billing-issue webhooks use direct APNs with separate sandbox and production environments. The global notification switch and individual category flags are returned by the monetization policy, so any category can be disabled remotely without an iOS release.

## Guardrails

- Never put collection names, prices, images, or private collection details in notification content.
- Keep the free reset reminder available only in the soft experience.
- Keep trial reminders limited to annual trials that are still set to renew.
- Do not treat denied permission as an error that blocks the app; show a Settings recovery link.
- Measure permission acceptance, scheduling, cancellation, taps, reset-to-scan conversion, trial-reminder-to-subscription views, billing-alert recovery, and revocation by cohort.

## Sources

- [Apple: Asking permission to use notifications](https://developer.apple.com/documentation/usernotifications/asking_permission_to_use_notifications)
- [Apple Human Interface Guidelines: Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications)
