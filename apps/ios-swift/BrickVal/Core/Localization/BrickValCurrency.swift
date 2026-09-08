import Foundation

/// Currencies available for BrickValue display values. Market data remains
/// canonical USD; these codes are presentation choices only.
enum BrickValCurrency: String, CaseIterable, Codable, Identifiable, Sendable {
    case usd = "USD"
    case eur = "EUR"
    case gbp = "GBP"
    case aud = "AUD"
    case cad = "CAD"
    case nzd = "NZD"
    case jpy = "JPY"
    case cny = "CNY"
    case hkd = "HKD"
    case twd = "TWD"
    case krw = "KRW"
    case sgd = "SGD"
    case inr = "INR"
    case brl = "BRL"
    case mxn = "MXN"
    case chf = "CHF"
    case sek = "SEK"
    case nok = "NOK"
    case dkk = "DKK"
    case pln = "PLN"
    case czk = "CZK"
    case aed = "AED"
    case sar = "SAR"
    case zar = "ZAR"

    var id: Self { self }

    var code: String { rawValue }

    /// The display name is resolved in the currently selected BrickValue
    /// language while the ISO code remains visible to avoid symbol ambiguity.
    var displayName: String {
        BrickValLocalization.effectiveLanguage.locale.localizedString(forCurrencyCode: rawValue) ?? rawValue
    }

    static var deviceCurrency: Self {
        from(locale: .autoupdatingCurrent) ?? .usd
    }

    static func effective(for override: Self?) -> Self {
        override ?? deviceCurrency
    }

    static func from(locale: Locale) -> Self? {
        guard let identifier = locale.currency?.identifier else { return nil }
        return Self(rawValue: identifier.uppercased())
    }
}
