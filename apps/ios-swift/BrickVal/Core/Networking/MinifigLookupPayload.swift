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

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            name = try container.decode(String.self, forKey: .name)
            figNumber = try container.decode(String.self, forKey: .figNumber)
            yearReleased = try container.decodeIfPresent(Int.self, forKey: .yearReleased)

            let rawImageURL = try container.decodeIfPresent(String.self, forKey: .imageURL)?
                .trimmingCharacters(in: .whitespacesAndNewlines)
            if let rawImageURL, !rawImageURL.isEmpty {
                imageURL = URL(string: rawImageURL.hasPrefix("//") ? "https:\(rawImageURL)" : rawImageURL)
            } else {
                imageURL = nil
            }
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
            theme: figInfo.yearReleased.map { BrickValLocalization.localized("Minifigure · \($0)") } ?? BrickValLocalization.localized("Minifigure"),
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
