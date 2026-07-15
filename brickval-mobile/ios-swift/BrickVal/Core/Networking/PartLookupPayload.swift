import Foundation

struct PartLookupPayload: Decodable, Sendable {
    let partInfo: PartInfo
    let pricing: LookupPricing
    let marketHistory: [MarketHistoryPoint]?

    struct PartInfo: Decodable, Sendable {
        let name: String
        let imageURL: URL?
        let partNumber: String
        let yearReleased: Int?
        let colorID: Int?
        let colorName: String?

        enum CodingKeys: String, CodingKey {
            case name
            case imageURL = "image_url"
            case partNumber = "part_number"
            case yearReleased = "year_released"
            case colorID = "color_id"
            case colorName = "color_name"
        }
    }

    enum CodingKeys: String, CodingKey {
        case partInfo
        case pricing
        case marketHistory = "market_history"
    }

    var normalized: LookupResult {
        LookupResult(
            identifier: partInfo.partNumber,
            itemType: .part,
            name: partInfo.name,
            theme: partInfo.colorName.map { "Part · \($0)" } ?? "Part",
            pieces: nil,
            yearReleased: partInfo.yearReleased,
            isObsolete: nil,
            imageURL: partInfo.imageURL,
            pricing: pricing,
            marketHistory: marketHistory ?? [],
            colorID: partInfo.colorID,
            colorName: partInfo.colorName
        )
    }
}
