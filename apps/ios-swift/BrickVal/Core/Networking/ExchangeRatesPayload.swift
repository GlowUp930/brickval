import Foundation

struct ExchangeRatesPayload: Codable, Sendable, Equatable {
    let baseCurrency: String
    let asOf: String
    let rates: [String: Double]
    let stale: Bool

    enum CodingKeys: String, CodingKey {
        case baseCurrency
        case asOf
        case rates
        case stale
    }

    var usdRates: [String: Double] {
        rates.merging([BrickValCurrency.usd.code: 1], uniquingKeysWith: { _, value in value })
    }

    func rate(for currency: BrickValCurrency) -> Double? {
        currency == .usd ? 1 : usdRates[currency.code]
    }
}
