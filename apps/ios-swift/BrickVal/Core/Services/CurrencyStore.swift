import Foundation
import Observation
import SwiftUI

@Observable
@MainActor
final class CurrencyStore {
    private(set) var payload: ExchangeRatesPayload?
    private(set) var isLoading = false
    private(set) var conversionUnavailable = false

    @ObservationIgnored private let defaults: UserDefaults
    @ObservationIgnored private let cacheKey = "brickval_currency_rates_cache"
    @ObservationIgnored private let cacheLifetime: TimeInterval = 7 * 24 * 60 * 60
    @ObservationIgnored private let refreshInterval: TimeInterval = 24 * 60 * 60

    private struct CachedRates: Codable {
        let payload: ExchangeRatesPayload
        let fetchedAt: Date
    }

    private var fetchedAt: Date?

    init(
        defaults: UserDefaults = .standard,
        initialPayload: ExchangeRatesPayload? = nil
    ) {
        self.defaults = defaults
        if let initialPayload {
            payload = initialPayload
            fetchedAt = .now
            return
        }
        guard let data = defaults.data(forKey: cacheKey),
              let cached = try? JSONDecoder().decode(CachedRates.self, from: data),
              Date.now.timeIntervalSince(cached.fetchedAt) <= cacheLifetime,
              cached.payload.rates[BrickValCurrency.usd.code] != nil || !cached.payload.rates.isEmpty else {
            return
        }
        payload = cached.payload
        fetchedAt = cached.fetchedAt
    }

    var lastUpdatedText: String? { payload?.asOf }

    func formattedRateDate(locale: Locale) -> String? {
        guard let asOf = payload?.asOf else { return nil }
        let parser = DateFormatter()
        parser.calendar = Calendar(identifier: .gregorian)
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(secondsFromGMT: 0)
        parser.dateFormat = "yyyy-MM-dd"
        guard let date = parser.date(from: asOf) else { return asOf }
        return date.formatted(
            .dateTime
                .year()
                .month(.abbreviated)
                .day()
                .locale(locale)
        )
    }

    var hasUsableRates: Bool {
        guard payload != nil else { return false }
        return BrickValCurrency.allCases.allSatisfy { rate(for: $0) != nil }
    }

    func rate(for currency: BrickValCurrency) -> Double? {
        guard let rate = payload?.rate(for: currency), rate > 0 else {
            return currency == .usd ? 1 : nil
        }
        return rate
    }

    func converted(_ usdValue: Double, to currency: BrickValCurrency) -> Double {
        guard let rate = rate(for: currency) else { return usdValue }
        return usdValue * rate
    }

    func displayCurrency(for requested: BrickValCurrency) -> BrickValCurrency {
        rate(for: requested) == nil ? .usd : requested
    }

    func formatStyle(
        for currency: BrickValCurrency,
        locale: Locale
    ) -> FloatingPointFormatStyle<Double>.Currency {
        FloatingPointFormatStyle<Double>.Currency(code: currency.code)
            .locale(locale)
    }

    func formatted(
        _ usdValue: Double,
        to requestedCurrency: BrickValCurrency,
        locale: Locale
    ) -> String {
        let displayCurrency = displayCurrency(for: requestedCurrency)
        return converted(usdValue, to: displayCurrency)
            .formatted(formatStyle(for: displayCurrency, locale: locale))
    }

    /// Formats a display value with the ISO code that is actually being shown.
    /// The code is intentionally kept outside the localized currency symbol so
    /// similar symbols such as $, ¥, and kr remain unambiguous.
    func formattedWithCode(
        _ usdValue: Double,
        to requestedCurrency: BrickValCurrency,
        locale: Locale
    ) -> String {
        let displayCurrency = displayCurrency(for: requestedCurrency)
        return "\(formatted(usdValue, to: requestedCurrency, locale: locale)) · \(displayCurrency.code)"
    }

    func refresh(using api: BrickValAPIClient) async {
        guard !isLoading else { return }
        if let fetchedAt,
           hasUsableRates,
           Date.now.timeIntervalSince(fetchedAt) < refreshInterval,
           payload?.stale == false {
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let freshPayload = try await api.exchangeRates()
            guard freshPayload.baseCurrency.uppercased() == BrickValCurrency.usd.code,
                  BrickValCurrency.allCases.allSatisfy({ freshPayload.rate(for: $0) != nil }) else {
                throw APIError(endpoint: "exchange rates", statusCode: 502, code: "invalid_exchange_rates", serverMessage: nil)
            }
            payload = freshPayload
            fetchedAt = .now
            conversionUnavailable = false
            let cached = CachedRates(payload: freshPayload, fetchedAt: .now)
            if let data = try? JSONEncoder().encode(cached) {
                defaults.set(data, forKey: cacheKey)
            }
        } catch {
            if let payload {
                self.payload = payload.stalePayload
            }
            conversionUnavailable = !hasUsableRates
        }
    }
}

struct BrickValCurrencyText: View {
    @Environment(PreferencesStore.self) private var preferences
    @Environment(CurrencyStore.self) private var currency

    let usdValue: Double
    let isAlreadyConverted: Bool
    let showsCurrencyCode: Bool

    init(
        _ usdValue: Double,
        isAlreadyConverted: Bool = false,
        showsCurrencyCode: Bool = true
    ) {
        self.usdValue = usdValue
        self.isAlreadyConverted = isAlreadyConverted
        self.showsCurrencyCode = showsCurrencyCode
    }

    var body: some View {
        let requestedCurrency = preferences.effectiveCurrency
        let displayCurrency = currency.displayCurrency(for: requestedCurrency)
        let locale = BrickValLocalization.effectiveLanguage.locale
        let amount = isAlreadyConverted
            ? usdValue.formatted(currency.formatStyle(for: displayCurrency, locale: locale))
            : currency.formatted(usdValue, to: requestedCurrency, locale: locale)

        HStack(alignment: .firstTextBaseline, spacing: BrickValStyle.Primitive.space4) {
            Text(verbatim: amount)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
            if showsCurrencyCode {
                Text(verbatim: displayCurrency.code)
                    .font(.caption2.weight(.semibold))
                    .tracking(0.35)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: "\(amount), \(displayCurrency.code)"))
    }
}

private extension ExchangeRatesPayload {
    var stalePayload: ExchangeRatesPayload {
        ExchangeRatesPayload(baseCurrency: baseCurrency, asOf: asOf, rates: rates, stale: true)
    }
}
