# App Store metadata localization — 2026-09-14

## What changed

App Store Connect version 1.08 was updated and saved with a first localization tier for supported non-English markets. The following locales now have translated **app name, subtitle, promotional text, description, What's New text, and keywords**:

| App Store locale | Primary storefront coverage | Currency supported in app |
| --- | --- | --- |
| Japanese | Japan | JPY |
| German | Germany, Austria, German-speaking Switzerland | EUR, CHF |
| French | France, Belgium, French-speaking Switzerland | EUR, CHF |
| Korean | South Korea | KRW |
| Chinese (Traditional) | Taiwan, Hong Kong | TWD, HKD |
| Chinese (Simplified) | Mainland China, Singapore | CNY, SGD |
| Italian | Italy, Italian-speaking Switzerland | EUR, CHF |
| Spanish (Spain) | Spain | EUR |
| Dutch | Netherlands, Dutch-speaking Belgium | EUR |
| Arabic | Gulf storefronts including Saudi Arabia and the UAE | SAR, AED |
| Portuguese (Brazil) | Brazil | BRL |

The English (U.S.) primary metadata and existing screenshots were kept. Terms of Use, Apple Standard EULA, privacy/support, and marketing URLs remain unchanged. No app binary, pricing, subscription, or in-app copy changed in this operation.

## Rationale and limits

The first tier favors supported languages that map to large or high-spend App Store markets, while avoiding a claim that localization alone guarantees revenue. Brazil was included for reach even though its expected ARPU is lower than the European, Japanese, or Korean tiers. Hindi and Spanish (Mexico) remain candidates for a later test after production acquisition and purchase data show enough volume to justify another translation pass.

Apple documents that a localized App Store language is shown to customers whose device/App Store language matches it, with the primary language as fallback: [Localize app information](https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information). Apple also recommends using territory performance data to decide where additional localization is worthwhile: [Localization](https://developer.apple.com/localization/). Current mobile-spend summaries consistently place Japan, South Korea, Germany, France, and other selected markets among the major App Store opportunities; treat that as market context, not a BrickValue-specific forecast.

## Verification

- App Store Connect language menu shows the English primary plus all 11 localized entries above.
- Each localized version page was edited and saved; App Store Connect displayed the Saved state after every locale.
- App-level Name and Subtitle were edited and saved for the same 11 locales.
- The version remains **Prepare for Submission**. Apple review/release is still a separate step.
- Screenshots are still shared from English (U.S.); localized screenshots and keyword experiments are follow-up conversion work.
