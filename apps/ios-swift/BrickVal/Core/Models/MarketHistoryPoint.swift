import Foundation

struct MarketHistoryPoint: Codable, Hashable, Identifiable, Sendable {
    let date: String
    let priceUSD: Double
    let source: String?

    var id: String { "\(date)-\(priceUSD)-\(source ?? "unknown")" }

    enum CodingKeys: String, CodingKey {
        case date
        case priceUSD = "price_usd"
        case source
    }
}
