import Foundation

struct CollectionItem: Codable, Hashable, Identifiable, Sendable {
    static let marketHistoryMetadataVersionCurrent = 2

    let setNumber: String
    let itemType: ItemType
    let name: String
    let theme: String
    let pieces: Int?
    let yearReleased: Int?
    let isObsolete: Bool?
    let imageURL: URL?
    let marketValueUSD: Double?
    let rrpUSD: Double?
    let gainPercent: Double?
    let dataSource: String?
    var quantity: Int
    let condition: CollectionCondition
    let colorID: Int?
    let colorName: String?
    var marketHistory: [MarketHistoryPoint]
    let marketRows: [MarketRow]
    let addedAt: String
    var pricingSnapshot: LookupPricing? = nil
    var alternateMarketSales: [CollectionMarketSale] = []
    var marketSales: [CollectionMarketSale] = []
    var marketHistoryFetchedAt: String? = nil
    var marketHistoryMetadataVersion: Int? = nil

    var id: String {
        "\(itemType.rawValue)-\(setNumber)-\(condition.rawValue)-\(colorID.map(String.init) ?? "none")"
    }

    /// Stable across New/Used rows so both condition tabs share one item choice.
    var marketRegionPreferenceKey: String {
        "\(itemType.rawValue)-\(setNumber.lowercased())-\(colorID.map(String.init) ?? "none")"
    }

    var totalValue: Double { (marketValueUSD ?? 0) * Double(quantity) }

    var recordedHistory: [MarketHistoryPoint] {
        guard let price = marketValueUSD, price.isFinite, price > 0,
              !marketHistory.contains(where: { $0.date == addedAt }) else { return marketHistory }
        return marketHistory + [MarketHistoryPoint(date: addedAt, priceUSD: price, source: dataSource)]
    }

    init(
        setNumber: String,
        itemType: ItemType,
        name: String,
        theme: String,
        pieces: Int? = nil,
        yearReleased: Int? = nil,
        isObsolete: Bool? = nil,
        imageURL: URL? = nil,
        marketValueUSD: Double? = nil,
        rrpUSD: Double? = nil,
        gainPercent: Double? = nil,
        dataSource: String? = nil,
        quantity: Int = 1,
        condition: CollectionCondition = .newSealed,
        colorID: Int? = nil,
        colorName: String? = nil,
        marketHistory: [MarketHistoryPoint] = [],
        marketRows: [MarketRow] = [],
        addedAt: String = ISO8601DateFormatter().string(from: .now)
    ) {
        self.setNumber = setNumber
        self.itemType = itemType
        self.name = name
        self.theme = theme
        self.pieces = pieces
        self.yearReleased = yearReleased
        self.isObsolete = isObsolete
        self.imageURL = imageURL
        self.marketValueUSD = marketValueUSD
        self.rrpUSD = rrpUSD
        self.gainPercent = gainPercent
        self.dataSource = dataSource
        self.quantity = max(1, quantity)
        self.condition = condition
        self.colorID = colorID
        self.colorName = colorName
        self.marketHistory = marketHistory.filter { $0.priceUSD > 0 }
        self.marketRows = marketRows
        self.addedAt = addedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        setNumber = try container.decode(String.self, forKey: .setNumber)
        itemType = try container.decodeIfPresent(ItemType.self, forKey: .itemType)
            ?? (setNumber.allSatisfy(\.isNumber) ? .set : .minifig)
        name = try container.decode(String.self, forKey: .name)
        theme = try container.decodeIfPresent(String.self, forKey: .theme) ?? "LEGO"
        pieces = try container.decodeIfPresent(Int.self, forKey: .pieces)
        yearReleased = try container.decodeIfPresent(Int.self, forKey: .yearReleased)
        isObsolete = try container.decodeIfPresent(Bool.self, forKey: .isObsolete)
        imageURL = try container.decodeIfPresent(URL.self, forKey: .imageURL)
        marketValueUSD = try container.decodeIfPresent(Double.self, forKey: .marketValueUSD)
        rrpUSD = try container.decodeIfPresent(Double.self, forKey: .rrpUSD)
        gainPercent = try container.decodeIfPresent(Double.self, forKey: .gainPercent)
        dataSource = try container.decodeIfPresent(String.self, forKey: .dataSource)
        quantity = max(1, try container.decodeIfPresent(Int.self, forKey: .quantity) ?? 1)
        condition = try container.decodeIfPresent(CollectionCondition.self, forKey: .condition) ?? .newSealed
        colorID = try container.decodeIfPresent(Int.self, forKey: .colorID)
        colorName = try container.decodeIfPresent(String.self, forKey: .colorName)
        marketHistory = try container.decodeIfPresent([MarketHistoryPoint].self, forKey: .marketHistory) ?? []
        marketRows = try container.decodeIfPresent([MarketRow].self, forKey: .marketRows) ?? []
        addedAt = try container.decodeIfPresent(String.self, forKey: .addedAt)
            ?? ISO8601DateFormatter().string(from: .now)
        pricingSnapshot = try container.decodeIfPresent(LookupPricing.self, forKey: .pricingSnapshot)
        alternateMarketSales = try container.decodeIfPresent([CollectionMarketSale].self, forKey: .alternateMarketSales) ?? []
        marketSales = try container.decodeIfPresent([CollectionMarketSale].self, forKey: .marketSales) ?? []
        marketHistoryFetchedAt = try container.decodeIfPresent(String.self, forKey: .marketHistoryFetchedAt)
        marketHistoryMetadataVersion = try container.decodeIfPresent(Int.self, forKey: .marketHistoryMetadataVersion)
    }

    enum CodingKeys: String, CodingKey {
        case setNumber = "set_number"
        case itemType = "item_type"
        case name
        case theme
        case pieces
        case yearReleased = "year_released"
        case isObsolete = "is_obsolete"
        case imageURL = "image_url"
        case marketValueUSD = "market_value_usd"
        case rrpUSD = "rrp_usd"
        case gainPercent = "gain_pct"
        case dataSource = "data_source"
        case quantity
        case condition
        case colorID = "color_id"
        case colorName = "color_name"
        case marketHistory = "market_history"
        case marketRows = "market_rows"
        case addedAt = "added_at"
        case pricingSnapshot = "pricing_snapshot"
        case alternateMarketSales = "alternate_market_sales"
        case marketSales = "market_sales"
        case marketHistoryFetchedAt = "market_history_fetched_at"
        case marketHistoryMetadataVersion = "market_history_metadata_version"
    }
}
