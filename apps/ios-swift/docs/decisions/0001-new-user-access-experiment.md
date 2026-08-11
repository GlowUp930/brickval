# New-User Pro Access Experiment

Date: 2026-08-11

## Decision

Run a 50/50 access experiment for new users only:

- Control: the existing metered soft-paywall experience.
- Treatment: require Pro immediately before the first real scan.
- Existing users remain on the soft-paywall experience.
- The annual plan is the preferred offer at AUD 79.99 per year with a seven-day introductory trial.
- The monthly alternative is AUD 12.99 with no introductory trial.

The server policy is the kill switch. A hard-cohort user must regain scanner access immediately when the experiment is disabled or when RevenueCat reports an active Pro entitlement.

## Why

RevenueCat's 2026 Utilities benchmark reports materially higher median paid conversion and Day-60 revenue per install for hard-paywall apps than freemium apps. It also reports stronger trial conversion for five-to-nine-day trials than for trials of four days or less. These category benchmarks justify testing a seven-day annual trial, but they do not prove it will improve BrickValue's retained profit.

A controlled new-user experiment protects the established user experience and produces a comparable result. The placement before the first scan avoids starting the camera or consuming identification resources before access is resolved.

## Guardrails

- Do not reassign an existing or replaying-onboarding user.
- Resolve the current RevenueCat entitlement before presenting the gate.
- Do not claim a free trial outside the App Store purchase sheet unless the annual product has an active introductory offer.
- Keep Restore Purchases visible.
- Preserve a remote kill switch and the native purchase fallback.
- Persist the cohort locally and send it as a Superwall and RevenueCat user attribute for revenue attribution.
- Judge the experiment on Day-60 proceeds per install, first renewal, refunds, retention, ratings, and support complaints. Trial starts alone are not a success metric.

## Rollout

1. Configure and verify the annual introductory offer in App Store Connect.
2. Confirm RevenueCat's current offering includes the approved annual and monthly products.
3. Assign the `onboarding_hard_access` Superwall placement to the approved paywall.
4. Release with the experiment disabled if any dependency is incomplete.
5. Activate 50 percent through server policy, monitor daily, and retain the kill switch.

## Sources

- [RevenueCat: State of Subscription Apps 2026 - Utilities](https://www.revenuecat.com/state-of-subscription-apps-2026-utilities)
- [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [Superwall: Placements](https://superwall.com/features/placements)
