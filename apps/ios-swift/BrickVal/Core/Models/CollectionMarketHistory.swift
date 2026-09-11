import Foundation

struct CollectionMarketSale: Codable, Hashable, Sendable {
    let date: String
    let priceUSD: Double
    let quantity: Int
    let sellerCountryCode: String?
    /// Nil is treated as a completed BrickLink sale for backwards compatibility.
    /// Active listing rows are explicitly marked so they can be shown without
    /// being mistaken for sold history.
    let source: String?

    init(date: String, priceUSD: Double, quantity: Int, sellerCountryCode: String? = nil, source: String? = nil) {
        self.date = date
        self.priceUSD = priceUSD
        self.quantity = quantity
        self.sellerCountryCode = sellerCountryCode
        self.source = source
    }

    var timestamp: Date? {
        (try? Date.ISO8601FormatStyle(includingFractionalSeconds: true).parse(date))
            ?? (try? Date.ISO8601FormatStyle().parse(date))
    }

    enum CodingKeys: String, CodingKey {
        case date, quantity
        case priceUSD = "price_usd"
        case sellerCountryCode = "seller_country_code"
        case source
    }
}

struct CollectionHistoryRequestItem: Codable, Hashable, Sendable {
    let identifier: String
    let itemType: ItemType
    let colorID: Int?

    init(_ item: CollectionItem) {
        identifier = item.itemType == .set && item.setNumber.hasSuffix("-1") ? String(item.setNumber.dropLast(2)) : item.setNumber.lowercased()
        itemType = item.itemType
        colorID = item.itemType == .part ? item.colorID : nil
    }

    enum CodingKeys: String, CodingKey {
        case identifier
        case itemType = "item_type"
        case colorID = "color_id"
    }
}

struct CollectionHistoryResponse: Decodable, Sendable {
    let items: [Row]
    struct Row: Decodable, Sendable {
        let identifier: String
        let itemType: ItemType
        let colorID: Int?
        let newSales: [CollectionMarketSale]
        let usedSales: [CollectionMarketSale]
        let fetchedAt: String
        let newError: String?
        let usedError: String?
        enum CodingKeys: String, CodingKey {
            case identifier
            case itemType = "item_type"
            case colorID = "color_id"
            case newSales = "new_sales"
            case usedSales = "used_sales"
            case fetchedAt = "fetched_at"
            case newError = "new_error"
            case usedError = "used_error"
        }
    }
}
