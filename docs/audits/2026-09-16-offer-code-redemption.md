# Offer-code redemption presentation — 2026-09-16

## Finding

**Severity:** High — paid-access and promotional redemption flow.

**User impact:** Tapping **Redeem offer code** from a paywall could leave the
Superwall paywall in the presentation stack while StoreKit opened. After
repeated attempts, Apple could show a monthly subscription confirmation sheet
over the Redeem Offer Code page. The code field appeared blocked and the user
could not reliably redeem the gift.

**Evidence:** The supplied capture shows the StoreKit monthly subscription
confirmation in front of the Redeem Offer Code form. Source inspection found
that `AppSDKCoordinator.requestOfferCodeRedemption()` changed the state to
`presenting` immediately. The root view then presented the StoreKit sheet, but
the `showPromoRedeem` callback did not dismiss Superwall first. The Superwall
editor was inspected on 16 September: the active **Redeem offer code** control
uses the `showPromoRedeem` custom action and has no attached purchase action.

This is a confirmed app presentation defect. It is separate from Apple’s
purchase-permission errors and does not change subscription products, pricing,
or entitlement rules.

## Reproduction and feedback loop

The regression seam is the same custom-action path used by the paywall:

`xcodebuild test -project BrickVal.xcodeproj -scheme BrickVal -destination 'platform=iOS Simulator,id=D72A48E4-D384-47D8-8A5E-E9EE9C0B0668' -only-testing:BrickValTests/OfferCodeRedemptionTests -only-testing:BrickValTests/PaywallRoutingTests`

Before the fix, the new
`paywallCustomActionDismissesPaywallBeforePresentingRedemptionSheet` test was
red: the dismissal count was `0` when `1` was required. That captured the
reported ordering failure rather than merely checking that no exception was
thrown. The same command now reports **21 tests in 2 suites passed**. The
focused suite also passes on the iPhone 17 Pro simulator.

## Implemented remedy

- Added an explicit `preparing` redemption state.
- Dismissed the active Superwall paywall with its async `dismiss()` API before
  exposing the StoreKit sheet.
- Cleared the purchase placement and pending feature-dismissal callback so a
  stale monthly purchase cannot be triggered during the handoff.
- Treated `preparing` as busy, making repeated taps a no-op.
- If the presentation is dismissed or the user leaves before the async
  dismissal completes, the state returns to idle and the task cannot reopen a
  sheet.

## Verification status

- Small iPhone simulator: focused 21-test suite passed.
- iPhone 17 Pro simulator: focused 21-test suite passed.
- Small iPhone simulator: full native target passed 242 tests in 39 suites.
- iPhone 17 Pro simulator: full native target passed 242 tests in 39 suites.
- No new strings or backend changes were introduced; product and localization
  checks are unaffected.

## Remaining gap

The Apple StoreKit redemption controller and side-button purchase sheet cannot
be reproduced by these simulators. Install the next TestFlight build on a
physical device, open an active paywall, tap **Redeem offer code** once, and
confirm that the paywall closes before the single Redeem Offer Code sheet
appears. Then test cancel, invalid code, successful code, and a second tap
after dismissal. Until that check is complete, physical recovery is an
untested behavior rather than a release claim.
