# Referral Rewards Research

Last researched: 2026-08-27

## Recommendation

Build the first version with BrickVal's existing Clerk, Next.js, and Supabase stack. Do not reward an App Store download by itself. On iOS, the app cannot reliably prove that a particular person installed the app from a shared link after the App Store handoff. Reward a referral only after the invited person claims the code on a signed-in account and completes onboarding.

Suggested offer:

- A referrer shares a personal invite link.
- Three different invited accounts claim the code and complete onboarding.
- The referrer receives three bonus bulk scans, once per account milestone.
- Referral credits are a scan allowance, not Pro entitlement and not cash.
- Pro users remain unlimited and do not consume referral credits.

This keeps payment as the normal path while making the free alternative measurable and resistant to accidental double rewards.

## Existing BrickVal Fit

The app already has the core pieces:

- Clerk provides a stable signed-in user ID.
- Supabase already owns atomic feature usage through `user_feature_usage` and `consume_feature_usage`.
- The hosted Next.js API validates Clerk tokens and owns scan consumption.
- The native app already receives URLs through SwiftUI `onOpenURL`.
- PostHog is already available for product events, but it should be used for visibility only. It must not be the source of truth for granting scans.

The current iOS entitlement contains `webcredentials:brickvalue.live`, but not `applinks:brickvalue.live`. A referral link therefore needs a small Associated Domains change, an Apple App Site Association file on the website, and URL routing for `/r/<code>`. Apple documents this as a two-way association between the app and website.

## User Flow

### Referrer

1. Profile or the scan-limit screen shows `Invite friends, earn 3 scans` as a secondary action.
2. The app requests or loads one opaque referral code from the server.
3. The share sheet sends a first-party URL such as `https://brickvalue.live/r/AB12CD`.
4. The app shows progress such as `1 of 3 friends activated`.
5. Progress changes only after the server records a qualified activation.

### Invitee

1. The link opens BrickVal if installed, or a simple website page with the App Store link if not installed.
2. The app stores the pending code locally without granting anything.
3. After sign-in, the app submits the code to the server.
4. The invited user completes onboarding.
5. The server marks the referral qualified and grants the referrer progress or the milestone reward atomically.

Do not request Contacts permission. Use the system share sheet and let the user choose Messages, Mail, or another app.

## Server Design

Add an auditable ledger rather than a client-side counter:

### `referral_codes`

- `id`
- `referrer_user_id`
- `code` (unique, random, non-sequential)
- `created_at`
- `active`

### `referral_attributions`

- `id`
- `referral_code_id`
- `referrer_user_id`
- `referred_user_id`
- `claimed_at`
- `qualified_at`
- `status` (`claimed`, `qualified`, `rejected`)
- `installation_hash` (nullable SHA-256 of the opaque Keychain installation ID)
- Unique constraints on `referred_user_id` and non-null `installation_hash` so one account and one installation can qualify only once.

### `referral_rewards`

- `id`
- `referrer_user_id`
- `milestone` (for example, `3_qualified`)
- `quantity`
- `granted_at`
- Unique constraint on `referrer_user_id, milestone`.

### `referral_credit_ledger`

- `id`
- `user_id`
- `amount` (positive grant, negative consumption)
- `reason`
- `source_referral_id`
- `created_at`

Use one Postgres transaction or RPC for claiming, qualifying, and granting. Onboarding completion should be the qualification event and should be idempotent. A retry must return the existing result, never add another reward.

Implemented native endpoints:

- `GET /api/mobile/referrals` - return the signed-in user's code, progress, reward status, and credits.
- `POST /api/mobile/referrals` with `claim` - attach a pending code to the signed-in user and include the installation ID for server hashing.
- `POST /api/mobile/referrals` with `complete_onboarding` - qualify the claimed invitee and grant the referrer reward.

The scan gate should consume referral credits atomically after checking Pro status and before consuming the normal free allowance. Referral credits should never update `users.is_pro`.

## Implemented Onboarding And Preview Rules

- Onboarding presents referral entry after account setup with Apply and Skip. A pending Universal Link code is prefilled; Apply opens authentication when needed and resumes the claim afterward.
- Onboarding completion is acknowledged separately from claiming. Failed acknowledgements remain in local preferences and retry after sign-in or app activation. Replays do not re-enroll a cohort or qualify a referral again.
- Hard-access users see Subscribe as the primary action and Invite 3 friends as the secondary choice. Three qualified onboarding completions grant three real bulk scans.
- New soft users have no real bulk allowance but can repeat a local detector-only preview. The preview sends no identification, pricing, or scan-consumption request and requires a fresh scan after an unlock. Existing users retain their unused introductory credit through `bulk_intro_grandfathered`.
- The native app sends an opaque Keychain installation UUID only when claiming. The server stores its SHA-256 hash and enforces one attribution per account and installation. Analytics contain metadata only and never include photos or crops.
- The remote `BRICKVALUE_LOCKED_BULK_PREVIEW_ENABLED` flag defaults off until both Supabase migrations and the backend deployment are live.
- Existing anonymous installations with an unused local introductory credit call the authenticated monetization endpoint once after sign-in. The server hashes the Keychain installation ID, binds it to the account, refuses accounts that already used a bulk credit, and makes the grant idempotent. This preserves the rollout promise without granting newly enrolled soft users a credit.

## Tracking That Can Be Trusted

Record these events in the server ledger:

- `invite_created`
- `link_opened` (informational only)
- `code_claimed`
- `qualified_onboarding`
- `reward_granted`
- `reward_consumed`
- `referral_rejected`

PostHog can mirror these events for funnels, with properties such as `milestone`, `source`, and `app_build`. Never send invite codes, auth tokens, photos, or scan request bodies to analytics.

Fraud controls for the first release:

- Prevent self-referral by comparing authenticated user IDs.
- Allow one qualifying referral per invited account.
- Rate-limit code creation and claim attempts.
- Grant only once per milestone with a database uniqueness constraint.
- Do not count link opens, installs, sign-outs, or incomplete onboarding.
- Add a daily or lifetime referral cap if abuse appears.
- Keep a server audit row for every grant and consumption.

DeviceCheck or App Attest can be added later for high-volume abuse. They should not replace account-level idempotency.

## Paywall Integration

Keep Superwall responsible for subscription presentation and StoreKit products. A referral reward is an app usage credit, so it should be validated by BrickVal's server rather than represented as a fake subscription entitlement.

Recommended UI:

- Add a secondary `Invite friends, earn scans` action near a limit, not as a misleading replacement for the purchase button.
- Keep the existing `brickval_upgrade` and hard-access Superwall placements unchanged.
- Optionally add a Superwall custom action such as `showReferral` that opens the native referral sheet. Superwall documents custom actions and says the app must validate the code itself.
- Keep Apple's `Redeem offer code` flow separate. Apple offer codes grant an App Store product entitlement; they are not the right primitive for granting a server-side scan-credit reward.

Apple's review rules prohibit forcing users to rate the app, review it, or download other apps to access functionality. The referral should be voluntary, should concern BrickVal itself, and should clearly state the limited reward and qualification requirement. Add referral terms and abuse language to the privacy/terms surface before launch.

## Tool Choice And Cost

### Lowest-cost MVP: existing stack

Use Supabase, the existing API, Clerk, universal links, and PostHog. This adds no required vendor SDK and should have no material incremental cost while existing hosting and database quotas are sufficient. It requires backend schema/RPC work, native referral UI, universal-link configuration, and QA.

### Optional tools

- Firebase Analytics and Crashlytics have no-cost products, useful for general event and crash visibility. They do not provide a trustworthy referral reward ledger.
- AppsFlyer currently advertises a free Zero plan with a first-year welcome package of 12,000 conversions for owned-media use, but paid activity and later usage can incur cost. It is more machinery than this referral reward needs.
- Branch currently advertises a free trial for its Basics plan, but its pricing page does not promise a permanent free attribution tier. Treat it as a later evaluation, not an MVP dependency.
- Do not start a new implementation with Firebase Dynamic Links. Firebase says the service was deprecated and shut down on 2025-08-25; use Apple's Universal Links directly or evaluate a current provider.

## Rollout And Measurement

Ship the server and UI behind a remote flag, initially disabled. Then test a small cohort before enabling it broadly.

Primary metrics:

- Share tap to link open.
- Link open to account sign-in.
- Sign-in to onboarding completion.
- Qualified referrals per active referrer.
- Reward grant success rate.
- Referral-credit usage.
- Paid conversion and revenue per activated user.

Guardrails:

- Duplicate reward rate must be zero.
- Incomplete or cancelled onboarding must not qualify a referral.
- Referral credits must not change Pro entitlement.
- App Review and support complaints must be monitored.
- Measure paid conversion separately so the free reward does not silently replace a higher-value subscription path.

## Owner Requirements

Before implementation, decide:

1. The exact reward: recommended starting point is three bulk scans after three qualified friends.
2. Whether referral credits apply to bulk scans only or both scan types. Bulk-only is safer because it maps to the existing product offer.
3. Whether sign-in is required before sharing. It should be required before a referral can be claimed or credited.
4. The public referral terms: one account per person, no self-referral, no cash value, abuse reversal, and reward expiry if desired.
5. The rollout percentage and success thresholds.

## Sources

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple: Supporting associated domains](https://developer.apple.com/documentation/xcode/supporting-associated-domains)
- [Apple: Allowing apps and websites to link to your content](https://developer.apple.com/documentation/Xcode/allowing-apps-and-websites-to-link-to-your-content)
- [Apple: Supporting offer codes in your app](https://developer.apple.com/documentation/storekit/supporting-offer-codes-in-your-app)
- [Superwall: Using referral or promo codes with Superwall](https://superwall.com/docs/using-referral-or-promo-codes-with-superwall)
- [Superwall: Using the Superwall delegate](https://superwall.com/docs/ios/guides/using-superwall-delegate)
- [AppsFlyer pricing](https://www.appsflyer.com/pricing/)
- [Branch pricing](https://www.branch.io/pricing/)
- [Firebase pricing](https://firebase.google.com/pricing)
- [Firebase Dynamic Links deprecation FAQ](https://firebase.google.com/support/dynamic-links-faq)
