import Foundation
import Testing
@testable import BrickVal

struct CurrencyTests {
    @Test func supportedCurrencyMatrixIsStable() {
        #expect(BrickValCurrency.allCases.map(\.rawValue) == [
            "USD", "EUR", "GBP", "AUD", "CAD", "NZD", "JPY", "CNY", "HKD", "TWD",
            "KRW", "SGD", "INR", "BRL", "MXN", "CHF", "SEK", "NOK", "DKK", "PLN",
            "CZK", "AED", "SAR", "ZAR",
        ])
    }

    @Test func deviceCurrencyUsesRegionalCurrencyAndFallsBackToUSD() {
        #expect(BrickValCurrency.from(locale: Locale(identifier: "en_AU")) == .aud)
        #expect(BrickValCurrency.from(locale: Locale(identifier: "ja_JP")) == .jpy)
        #expect(BrickValCurrency.from(locale: Locale(identifier: "xx_XX")) == nil)
        #expect(BrickValCurrency.effective(for: nil) == BrickValCurrency.deviceCurrency)
        #expect(BrickValCurrency.effective(for: .eur) == .eur)
    }

    @Test @MainActor func currencyOverridePersistsAndReturnsToSystemDefault() {
        let defaults = UserDefaults(suiteName: "CurrencyTests.\(UUID().uuidString)")!
        let first = PreferencesStore(defaults: defaults)

        #expect(first.currencyOverride == nil)
        first.currencyOverride = .jpy
        #expect(first.effectiveCurrency == .jpy)

        let reloaded = PreferencesStore(defaults: defaults)
        #expect(reloaded.currencyOverride == .jpy)
        reloaded.currencyOverride = nil
        #expect(reloaded.currencyOverride == nil)
        #expect(reloaded.effectiveCurrency == BrickValCurrency.deviceCurrency)
    }

    @Test @MainActor func usdValuesConvertWithTheSelectedRate() {
        let payload = ExchangeRatesPayload(
            baseCurrency: "USD",
            asOf: "2026-09-04",
            rates: ["USD": 1, "EUR": 0.86, "JPY": 158.2],
            stale: false
        )
        let store = CurrencyStore(
            defaults: UserDefaults(suiteName: "CurrencyTests.\(UUID().uuidString)")!,
            initialPayload: payload
        )

        #expect(store.rate(for: .usd) == 1)
        #expect(store.converted(100, to: .eur) == 86)
        #expect(abs(store.converted(100, to: .jpy) - 15_820) < 0.001)
        #expect(store.converted(100, to: .cad) == 100)
    }

    @Test @MainActor func currencyFormattingUsesCurrencySpecificFractionDigits() {
        let payload = ExchangeRatesPayload(
            baseCurrency: "USD",
            asOf: "2026-09-04",
            rates: ["USD": 1, "JPY": 158.2],
            stale: false
        )
        let store = CurrencyStore(
            defaults: UserDefaults(suiteName: "CurrencyTests.\(UUID().uuidString)")!,
            initialPayload: payload
        )

        let jpy = store.formatted(12.5, to: .jpy, locale: Locale(identifier: "en_US"))
        #expect(jpy.contains("." ) == false)
    }

    @Test @MainActor func formattedCurrencyIncludesTheActualDisplayCode() {
        let payload = ExchangeRatesPayload(
            baseCurrency: "USD",
            asOf: "2026-09-04",
            rates: ["USD": 1, "EUR": 0.86],
            stale: false
        )
        let store = CurrencyStore(initialPayload: payload)

        let formatted = store.formattedWithCode(100, to: .eur, locale: Locale(identifier: "en_US"))
        #expect(formatted.contains("EUR"))
        #expect(formatted.contains("86"))
    }

    @Test @MainActor func unavailableConversionIdentifiesUSDAsTheDisplayedCurrency() {
        let store = CurrencyStore(
            initialPayload: ExchangeRatesPayload(
                baseCurrency: "USD",
                asOf: "2026-09-04",
                rates: ["USD": 1],
                stale: false
            )
        )

        let formatted = store.formattedWithCode(100, to: .eur, locale: Locale(identifier: "en_US"))
        #expect(formatted.contains("USD"))
        #expect(formatted.contains("EUR") == false)
    }

    @Test @MainActor func rateDateUsesTheActiveLocale() {
        let payload = ExchangeRatesPayload(
            baseCurrency: "USD",
            asOf: "2026-09-04",
            rates: ["USD": 1, "EUR": 0.86],
            stale: false
        )
        let store = CurrencyStore(initialPayload: payload)
        let formatted = store.formattedRateDate(locale: Locale(identifier: "de-DE"))
        #expect(formatted != "2026-09-04")
        #expect(formatted?.contains("2026") == true)
    }

    @Test func exchangeRatesPayloadAlwaysProvidesUSDIdentity() {
        let payload = ExchangeRatesPayload(
            baseCurrency: "USD",
            asOf: "2026-09-04",
            rates: ["EUR": 0.86],
            stale: false
        )
        #expect(payload.rate(for: .usd) == 1)
        #expect(payload.rate(for: .eur) == 0.86)
    }
}
