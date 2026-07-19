import Foundation

struct MinifigLookupPayload: Decodable, Sendable {
    let figInfo: FigInfo
    let pricing: LookupPricing
    let marketHistory: [MarketHistoryPoint]?

    struct FigInfo: Decodable, Sendable {
        let name: String
        let imageURL: URL?
        let figNumber: String
        let yearReleased: Int?

        enum CodingKeys: String, CodingKey {
            case name
            case imageURL = "image_url"
            case figNumber = "fig_number"
            case yearReleased = "year_released"
        }
    }

    enum CodingKeys: String, CodingKey {
        case figInfo
        case pricing
        case marketHistory = "market_history"
    }

    var normalized: LookupResult {
        LookupResult(
            identifier: figInfo.figNumber,
            itemType: .minifig,
            name: figInfo.name,
            theme: figInfo.yearReleased.map { "Minifigure · \($0)" } ?? "Minifigure",
            pieces: nil,
            yearReleased: figInfo.yearReleased,
            isObsolete: nil,
            imageURL: figInfo.imageURL,
            pricing: pricing,
            marketHistory: marketHistory ?? [],
            colorID: nil,
            colorName: nil
        )
    }
}
