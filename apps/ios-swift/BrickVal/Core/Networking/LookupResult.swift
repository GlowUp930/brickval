import Foundation

enum MarketPricingAvailability: String, Sendable {
    case available
    case stale
    case unavailable
}

enum MarketPricingResolution: String, Sendable {
    case live
    case freshCache = "fresh_cache"
    case staleCache = "stale_cache"
    case identityOnly = "identity_only"
}

struct LookupResult: Identifiable, Sendable {
    let identifier: String
    let itemType: ItemType
    let name: String
    let theme: String
    let pieces: Int?
    let yearReleased: Int?
    let isObsolete: Bool?
    let imageURL: URL?
    let pricing: LookupPricing
    let marketHistory: [MarketHistoryPoint]
    let colorID: Int?
    let colorName: String?
    let pricingAvailability: MarketPricingAvailability
    let pricingUpdatedAt: String?
    let pricingResolution: MarketPricingResolution

    init(
        identifier: String,
        itemType: ItemType,
        name: String,
        theme: String,
        pieces: Int?,
        yearReleased: Int?,
        isObsolete: Bool?,
        imageURL: URL?,
        pricing: LookupPricing,
        marketHistory: [MarketHistoryPoint],
        colorID: Int?,
        colorName: String?,
        pricingAvailability: MarketPricingAvailability = .available,
        pricingUpdatedAt: String? = nil,
        pricingResolution: MarketPricingResolution = .live
    ) {
        self.identifier = identifier
        self.itemType = itemType
        self.name = name
        self.theme = theme
        self.pieces = pieces
        self.yearReleased = yearReleased
        self.isObsolete = isObsolete
        self.imageURL = imageURL
        self.pricing = pricing
        self.marketHistory = marketHistory
        self.colorID = colorID
        self.colorName = colorName
        self.pricingAvailability = pricingAvailability
        self.pricingUpdatedAt = pricingUpdatedAt
        self.pricingResolution = pricingResolution
    }

    var id: String { "\(itemType.rawValue)-\(identifier)" }

    func collectionItem(quantity: Int, condition: CollectionCondition) -> CollectionItem {
        var item = CollectionItem(
            setNumber: identifier,
            itemType: itemType,
            name: name,
            theme: theme,
            pieces: pieces,
            yearReleased: yearReleased,
            isObsolete: isObsolete,
            imageURL: imageURL,
            marketValueUSD: condition == .used ? pricing.preferredUsedValue : pricing.preferredNewValue,
            rrpUSD: pricing.rrpUSD,
            gainPercent: pricing.gainPercent,
            dataSource: pricing.source(for: condition),
            quantity: quantity,
            condition: condition,
            colorID: colorID,
            colorName: colorName,
            marketHistory: condition == .newSealed ? marketHistory : []
        )
        item.pricingSnapshot = pricing
        return item
    }
}
