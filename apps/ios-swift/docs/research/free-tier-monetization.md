# BrickValue Free Tier Monetization Research

Last researched: 2026-08-10

## Recommendation

Do not add several unrelated restrictions at once. BrickValue should let a new collector prove that scanning and pricing work, then charge for repeated use, bulk convenience, and deeper market intelligence.

Recommended starting model:

| Capability | Free | Pro |
| --- | --- | --- |
| Single scanning | Three successful scans per day, with a test against five per day | Unlimited |
| Bulk scanning | One complete introductory bulk scan | Unlimited |
| Collection | One collection with 20 unique entries; test 20 against 30 | Unlimited entries; multiple collections when available |
| Market data | Current New/Used value and a short trend | Full history, sold-comparison detail, source comparison, and advanced analytics |
| Data tools | Basic item management | Export, alerts, automated refresh, and cloud sync when those features exist |
| Appearance | Default BrickValue theme | Existing theme, accent, and profile customization |

The current 10-item rule should count unique collection entries, not total quantity. Owning three copies of one minifigure should not consume three free slots.

## Current BrickValue State

- `CollectionStore` caps free users at a total quantity of 10. Duplicate quantities count toward the limit.
- The backend also contains a five-scan lifetime limit for signed-in free users in `src/lib/scan-gate.ts`.
- Scan routes only apply that meter when Clerk returns a user ID. Signed-out users therefore bypass it, and the gate also fails open when Supabase is unavailable.
- The iOS client decodes scan-limit server errors as ordinary API failures. It does not route a limit hit into a contextual Superwall upgrade placement.
- Collection-limit errors similarly show an error message without immediately offering a relevant upgrade action.
- The app currently exposes one generic Superwall placement, `brickval_upgrade`, so it cannot yet compare conversion by trigger or tailor the paywall to the user's attempted action.

This means BrickValue does not currently have a clean monetization baseline. Before adding another limit, make the existing entitlement and limit behavior consistent for guest and signed-in users and measure each conversion moment.

## Evidence

### Metering and timing

Apple explicitly supports freemium and metered paywalls. Its guidance recommends contextually relevant subscription prompts when a user approaches a free limit, while keeping the purchase flow short and clearly describing what the subscriber receives. Apple also requires the full renewal amount to be the most prominent price and clear trial terms.

RevenueCat's 2026 subscription dataset reports that hard-paywall apps have much higher median Day-35 conversion than freemium apps, but RevenueCat also notes that freemium remains appropriate when free use supports word of mouth, brand scale, or a longer conversion journey. BrickValue needs users to trust scan accuracy before asking them to pay, so a contextual metered model is a better first experiment than a launch-time hard paywall.

RevenueCat reports that 5-9 day trials are a practical middle range and have materially better median trial-to-paid conversion than trials of four days or less. It also warns that most short-trial cancellations happen immediately. If BrickValue tests an introductory trial, test seven days after the user has completed successful scans, not a three-day trial at first launch.

Superwall recommends instrumenting separate placements at potential monetization moments. Its feature-gating controls can make the same placement gated or non-gated remotely, allowing BrickValue to test a soft prompt against a hard gate without shipping another app build.

### LEGO category patterns

BrickScan reported a 665-user survey in which most respondents preferred a daily image-identification limit as the main free-versus-paid distinction. BrickScan keeps occasional identification, prices, inventory viewing, and collection storage available, while premium supports heavier scanning and unlimited multi-item images. This closely matches BrickValue's cost structure and user intent.

BrickEconomy keeps current collection value and a single collection free. Its premium tier emphasizes multiple collections, deeper historical analysis, forecasts, buy/sell insights, advanced filters, and richer export tools. This supports charging for decision-making depth rather than hiding the first useful price.

## Highest-Value Constraints

### 1. Meter successful scans on a renewable allowance

Start by testing three versus five successful single scans per day. Count only a returned identification, never a failed match, retry, cancelled capture, or camera error.

Why it is strong:

- It maps directly to recurring identification and pricing costs.
- Occasional collectors retain a useful free app.
- Power users encounter the upgrade prompt at a moment of demonstrated intent.
- A renewable allowance avoids turning the free app into a permanent dead end after five lifetime scans.

### 2. Make bulk scanning the clearest Pro convenience

Give every user one full bulk-scan result so they can understand its value. Gate later bulk captures before the camera operation begins, rather than after the photo has been processed.

Bulk mode is faster, handles multiple items, and has an easy-to-explain value proposition: Pro saves time. This is preferable to obscuring results after the user has already waited.

### 3. Replace the 10-quantity cap with a unique-entry cap

Test 20 versus 30 unique set/minifigure entries in one free collection. Quantities of an existing entry should not consume extra slots. Show progress at 80 percent, for example `16 of 20 free collection slots used`.

Existing saved items must remain readable after a subscription expires. Pro should unlock new additions and premium tools, not hold the user's existing collection hostage.

### 4. Keep the first price useful; gate analytical depth

Free users should still see the identified item, current New/Used value, and a short trend. Candidate Pro features are:

- Full 3M/6M history and exact sold-comparison rows.
- BrickLink versus eBay source comparison.
- Portfolio gain/loss attribution.
- Price alerts and automated collection refresh.
- Buy/sell timing or liquidity insights, only when the data supports them.

This gives serious collectors an ongoing reason to subscribe and better satisfies Apple's requirement that subscriptions provide continuing value.

### 5. Monetize organization and portability

When implemented, reserve multiple named collections, CSV export/import, seller inventory tools, insurance reports, cloud backup, and cross-device sync for Pro. These features solve durable professional or power-collector needs without degrading basic identification.

## Paywall Moments

Add distinct Superwall placements so each can be measured and remotely tested:

- `scan_limit_warning`
- `scan_limit_reached`
- `bulk_scan_attempt`
- `collection_limit_warning`
- `collection_limit_reached`
- `market_history_attempt`
- `export_attempt`

Suggested behavior:

1. Do not hard-paywall before the first successful result.
2. After the first or second successful scan, a soft Pro explanation may be shown but should not block progress.
3. Warn near a limit and state the exact remaining allowance.
4. Hard-gate only when the user explicitly attempts the limited action.
5. Tailor the paywall headline to that action, such as `Scan your whole tray in one photo` or `Keep your full collection in BrickValue`.
6. Never present a subscription paywall because identification failed.

## Experiment Order

Run one meaningful change at a time:

1. **Baseline:** unify guest and signed-in metering, add placement-specific events, and make current limit hits open an upgrade flow.
2. **Bulk experiment:** one free bulk scan versus a renewable weekly bulk scan.
3. **Single-scan experiment:** three versus five successful scans per day.
4. **Collection experiment:** 20 versus 30 unique entries.
5. **Analytics experiment:** short history free versus full history free, with advanced source detail gated.
6. **Offer experiment:** no trial versus a clearly disclosed seven-day annual-plan trial shown after activation.

Primary metric:

- Paid starts per activated user, where activation means at least two successful scans or three saved collection entries.

Guardrails:

- First-scan completion rate.
- Day-1 and Day-7 retention.
- Paywall dismissal rate.
- Successful identification rate.
- Refunds, trial cancellations, and first renewal.
- App rating and support complaints mentioning limits or surprise charges.

Do not select a winner from trial starts alone. RevenueCat specifically recommends checking renewals, refunds, and later cohort revenue because a short-term conversion lift can reduce long-term value.

## What Not to Do

- Do not gate the first scan result or basic current value.
- Do not count failed scans against an allowance.
- Do not keep the current five-scan lifetime meter alongside a new daily meter.
- Do not make manual correction paths Pro-only.
- Do not lock users out of items they already saved after downgrade.
- Do not change scan, collection, analytics, price, and trial rules in one experiment.
- Do not use countdowns, hidden close buttons, misleading weekly-equivalent pricing, or unclear trial renewal terms.

## Sources

- [Apple: Auto-renewable subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [Apple: App Review Guidelines, section 3.1.2](https://developer.apple.com/app-store/review/guidelines/)
- [RevenueCat: State of Subscription Apps 2026 - Utilities](https://www.revenuecat.com/state-of-subscription-apps-2026-utilities)
- [Superwall: Placements](https://superwall.com/features/placements)
- [Superwall: Feature gating](https://superwall.com/docs/support/paywall-editor/4876966592-feature-gating)
- [Superwall: How We Test Paywalls](https://superwall.com/blog/how-we-test-paywalls-at-superwall-and-how-you-can-too/)
- [BrickScan: Premium Version and Survey Results](https://brickscan.com/premium-version-survey-results/)
- [BrickScan: FAQ and premium rationale](https://brickscan.com/brickmonkey-faq-how-to/)
- [BrickEconomy: Free versus Premium](https://www.brickeconomy.com/premium)
