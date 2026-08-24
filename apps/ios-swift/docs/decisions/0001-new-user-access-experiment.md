# New-User Pro Access Experiment

Date: 2026-08-12

## Decision

Run a guarded access experiment for new users only, starting at 10% treatment and ramping toward 50/50 after validation:

- Control: the existing metered soft-paywall experience.
- Treatment: require Pro immediately after onboarding before showing any app content.
- Existing users remain on the soft-paywall experience.
- The annual plan is the preferred offer at AUD 79.99 per year with a seven-day introductory trial.
- The monthly alternative is AUD 9.99 with no introductory trial.

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
5. Activate a small treatment cohort through server policy, monitor daily, and retain the kill switch.
6. Increase toward 50 percent only after the first 72 hours show no purchase, configuration, or support issues.

## Current Configuration

Initial verification on 2026-08-12; production campaign verification updated on 2026-08-24:

- App Store Connect scheduled the annual price at AUD 79.99 and a monthly price adjustment to AUD 9.99 in 158 affected territories, effective 2026-08-12. Apple will lower renewals for existing subscribers paying the higher monthly price in those territories.
- The annual product has a one-week free introductory trial in all 175 territories. The monthly product has no introductory offer.
- RevenueCat's current `default` offering contains `$rc_annual` (`com.brickval.app.pro.yearly`) and `$rc_monthly` (`com.brickval.app.pro.monthly`).
- Superwall campaign `101303` (`onboarding_hard_access`) uses active paywall `257172` (`hardpaywall`) for users with no active entitlements and `user.seed < 50`.
- Superwall campaign `86740` (`brickval_upgrade`) uses active paywall `223721` (`Paywall test 1`) for every user with no active entitlements, at 100 percent treatment. Removing the accidental `user.seed >= 50` filter restores Profile and contextual upgrade access for the other cohort and for legacy users without a seed. Both active paywalls retain the `showPromoRedeem` offer-code callback.
- The previous paywall `254889` is archived. The live static configuration was checked against build 145's app key on 2026-08-24 and returned both placements, three products per paywall, and the expected entitlement rules.
- A clean Debug simulator install with the hard-access demo verified that the treatment blocks the scanner and automatically presents the mapped BrickValue paywall. StoreKit loaded the monthly and annual products and cached introductory eligibility without errors.
- Production is enabled at a guarded 10 percent hard-access allocation and 90 percent metered control until native build `125` is live: `BRICKVALUE_HARD_PAYWALL_EXPERIMENT_ENABLED=true`, `BRICKVALUE_HARD_PAYWALL_PERCENT=10`, and `BRICKVALUE_PRO_TRIAL_DAYS=7`. After the build is live, change `BRICKVALUE_HARD_PAYWALL_PERCENT` to `50`. The live policy response confirms the trial length and baseline limits of three single scans per day, one introductory bulk scan, and 10 unique collection items.
- The production deployment was verified on `brickvalue.live` on 2026-08-12. Keep the 10 percent ramp for the initial 72-hour smoke period before considering a larger allocation.

## Sources

- [RevenueCat: State of Subscription Apps 2026 - Utilities](https://www.revenuecat.com/state-of-subscription-apps-2026-utilities)
- [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [Superwall: Placements](https://superwall.com/features/placements)
