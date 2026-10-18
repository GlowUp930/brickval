# Existing free user transition — 2026-10-18

The native app now shows a one-time explanation before the hard access gate to
returning users who had soft access before policy 7. The screen states that
their collection remains saved on the device and that Pro restores access to
saved items and scanning. Its “View Pro options” action opens sign-in for
signed-out users or the existing Superwall hard-access placement for signed-in
users. Restore purchases, eligible offer codes, and signed-in account
management remain available.

The migration records eligibility before it replaces a legacy or experiment
soft cohort with the hard-gate cohort. Completed users with no stored cohort are
also covered. New users and users already assigned to the hard gate skip the
message. Verified Pro users skip it after entitlement loading completes. The
screen does not modify collection storage. Collection data remains local to the
device; the copy does not promise cloud sync or reinstall recovery.

The selected screen was visually checked on the BrickVal Small iPhone. Evidence:
[small-iPhone screenshot](assets/2026-10-18-existing-free-transition/small-iphone.png).

Verification passed:

- 28 `MonetizationStoreTests` on the BrickVal Small iPhone simulator, including
  old soft cohorts, missing cohort migration, one-time presentation, new users,
  and existing hard-gate users.
- Localization audit: 868 app strings and 4 Info.plist strings across all 13
  supported locales.
- Signed Release archive: version 1.14 (194), strict deep-signature check
  passed. Matching arm64 dSYM UUID: `A9565FA1-6589-3F1A-858F-9ADBE5E85579`.

Apple rejected build 193 because version 1.13 is closed for new submissions.
The replacement archive, version 1.14 (194), passed strict signature checks
and was accepted and processed by App Store Connect on 2026-10-18. Its status is
Ready to Submit, and it is available to the existing internal groups Team
(Expo) and v1, with one tester in each group. The TestFlight group assignment
was verified on the build details page.
