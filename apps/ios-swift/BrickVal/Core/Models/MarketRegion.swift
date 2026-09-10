import Foundation

/// A market view backed by the seller country recorded on each BrickLink sale.
/// `all` deliberately includes rows where BrickLink did not provide a country.
struct MarketRegion: Codable, Hashable, Identifiable, Sendable {
    let countryCode: String?

    static let all = MarketRegion(countryCode: nil)

    init(countryCode: String?) {
        guard let countryCode else {
            self.countryCode = nil
            return
        }
        let normalized = countryCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        self.countryCode = normalized.count == 2 && normalized.allSatisfy { $0.isASCII && $0.isLetter } ? normalized : nil
    }

    static func sellerCountry(_ code: String) -> MarketRegion? {
        let region = MarketRegion(countryCode: code)
        guard region.countryCode != nil else { return nil }
        return region
    }

    init?(rawValue: String) {
        if rawValue.lowercased() == "all" {
            self = .all
        } else if let region = MarketRegion.sellerCountry(rawValue) {
            self = region
        } else {
            return nil
        }
    }

    var id: String { rawValue }

    var rawValue: String { countryCode ?? "all" }

    var isAll: Bool { countryCode == nil }

    func includes(sellerCountryCode: String?) -> Bool {
        guard let countryCode else { return true }
        guard let sellerCountryCode else { return false }
        return sellerCountryCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() == countryCode
    }

    func displayName(locale: Locale = .current) -> String {
        guard let countryCode else { return BrickValLocalization.localized("All regions") }
        return locale.localizedString(forRegionCode: countryCode) ?? countryCode
    }

    func menuTitle(locale: Locale = .current) -> String {
        guard let countryCode else { return displayName(locale: locale) }
        return "\(displayName(locale: locale)) (\(countryCode))"
    }
}
