import Foundation

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

    var id: String { "\(itemType.rawValue)-\(identifier)" }

    func collectionItem(quantity: Int, condition: CollectionCondition) -> CollectionItem {
        CollectionItem(
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
            dataSource: pricing.dataSource,
            quantity: quantity,
            condition: condition,
            colorID: colorID,
            colorName: colorName,
            marketHistory: marketHistory
        )
    }
}
