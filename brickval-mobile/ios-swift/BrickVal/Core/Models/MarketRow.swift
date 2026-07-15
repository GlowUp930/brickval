import Foundation

struct MarketRow: Codable, Hashable, Identifiable, Sendable {
    let source: String
    let label: String
    let priceUSD: Double?
    let quantity: Int?
    let date: String?

    var id: String { "\(source)-\(label)-\(date ?? "latest")" }

    enum CodingKeys: String, CodingKey {
        case source
        case label
        case priceUSD = "price_usd"
        case quantity
        case date
    }
}
