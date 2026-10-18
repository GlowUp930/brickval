# Subscription-only access rollout — 18 October 2026

## Decision and scope

The owner requested 100% hard-paywall access, disabling the soft funnel.
This supersedes the earlier new-user-only 50/50 experiment and legacy free-access rules.
Every non-Pro user requires a subscription, including existing soft cohorts and users
with introductory or referral credits. Existing collections and credit ledgers are retained.
A valid subscription trial is Pro access; trial eligibility and prices remain controlled by Apple.

## Live Superwall configuration

Application 45804, Production, campaign 101303 is now **BrickValue hard access — 100%**.

- Removed `user.seed < 50` from the active audience. It now matches everyone without an active entitlement.
- Kept one `hardpaywall` allocation at 100%, with no holdout or frequency limit.
- Moved `brickval_upgrade` from campaign 86740 into campaign 101303 alongside `onboarding_hard_access`.
- Paused campaign 86740's audience. That campaign has no remaining placements.
- Retained the previously paused fallback audience in campaign 101303; it does not deliver a soft paywall.
- Saved rollout notes explaining that dashboard changes cannot replace installed native access logic.

The configuration was saved and independently reloaded. Evidence:
[Superwall allocation](assets/2026-10-18-hard-paywall/superwall-100-percent.png).

## Compatible production policy update

The live endpoint initially returned policy 6 with the experiment enabled at 50%.
Production settings now set `BRICKVALUE_HARD_PAYWALL_PERCENT=100` and
`BRICKVALUE_LOCKED_BULK_PREVIEW_ENABLED=false`. The existing production deployment
(source commit `71a78fb`) was redeployed with those settings, separately from policy 7.
This changes new-user enrollment without publishing the unreleased native/backend
migration. Deployment `dpl_F5YBmhpNFFC4kdxR3fkyZdYRN5Wj` is Ready and assigned to
`brickvalue.live`. The public endpoint independently returns policy 6 with
`enabled=true`, `hardPaywallPercent=100`, and `lockedBulkPreview=false`.
Evidence: [production deployment](assets/2026-10-18-hard-paywall/production-rollout-ready.png)
and [public policy](assets/2026-10-18-hard-paywall/production-policy.json).
Users with a previously persisted soft cohort still require the replacement native
release for migration; policy 6 only assigns users who have not already enrolled.
Vercel CLI authentication was expired; the existing signed-in dashboard session was used.

## Native changes

Bundled policy 7 migrates older cached policies and persisted cohorts to hard access.
The app gate no longer accepts referral credits as full-app access, and scan eligibility
also rejects saved free allowances. Free-scan counters and reset reminders are disabled.
Locked bulk previews are disabled. Onboarding skips referral entry and completion;
Profile removes the referral promotion, and old referral destinations open Subscription.
All upgrade requests use the hard-access placement. Closing a paywall leaves the access gate in place.

Sign-in is offered before purchase so an anonymous purchase cannot unlock native UI
without authenticated backend scan access. Restore purchases and Apple offer-code
redemption remain available. Signed-in users can still manage or delete their account
from the access gate. Active Pro users keep access.

## Backend changes

Policy 7 fixes hard access at 100%, uses zero free allowances and disables locked previews
and free-scan reset notifications. Old experiment/free-limit environment variables cannot
restore the soft funnel. Shared request authorization requires Pro for every protected
scan and collection-history path. Denials still reconcile RevenueCat before rejecting a
subscriber with a stale database record.

Usage consumption and bulk-session authorization also enforce Pro. Saved free sessions,
referral credits, and grandfathered credits cannot unlock access. Referral reward mutations
return 410; grandfather credit sync returns false. Existing ledgers are not deleted.

## Verification and rollout state

- Backend tests: 89 tests and 46 reliability assertions pass, including free-session denial,
  guest/history denial, paid reconciliation, and no free-credit consumption.
- Type checking and the production Next.js build pass.
- Localization: 863 app strings plus four Info.plist strings pass across all 13 languages.
- Swift parsing passes for changed access, policy, coordinator and routing files.
- Small-iPhone native verification passes 287 Swift tests across 42 suites, two XCTest
  photo-import checks and one hard-gate UI check. The final visual rerun also passes;
  its [screenshot](assets/2026-10-18-hard-paywall/native-gate-small-iphone.png) was inspected.
  Result bundles: `/tmp/BrickVal-hardpaywall-final.xcresult` and
  `/tmp/BrickVal-hardpaywall-visual.xcresult`.
- The notification test explicitly enables its historical scan-reset policy; a separate
  regression verifies that the new default never schedules free-scan reminders.
- An existing chart test used a September reference date before mutations, then silently
  used today's date after mutations/restart. It now consistently uses the reference date.
- Physical purchase, restore, offer-code and camera verification remain required.
- Subscription-only backend policy 7 is not deployed to production at this point. Coordinate deployment with
  the replacement native release; old clients retain their installed UI and cohort rules.
- No App Store submission or release has been made by this task at this point.

## Measurement

Existing Superwall campaign totals are historical and include trials. The previous
campaign comparison is not evidence of a paid-revenue lift. Treat 18 October 2026 as the
routing change boundary and the eventual native release as a separate access-change boundary.
Compare mature trial-to-paid conversion, proceeds per installation, refunds and cancellations.
