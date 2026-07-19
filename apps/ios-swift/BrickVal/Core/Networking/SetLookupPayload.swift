import Foundation

struct SetLookupPayload: Decodable, Sendable {
    let setInfo: SetInfo?
    let setNumber: String?
    let name: String?
    let theme: String?
    let pieces: Int?
    let imageURL: URL?
    let pricing: LookupPricing
    let marketHistory: [MarketHistoryPoint]?

    struct SetInfo: Decodable, Sendable {
        let setNumber: String?
        let name: String?
        let imageURL: URL?
        let yearReleased: Int?
        let isObsolete: Bool?

        enum CodingKeys: String, CodingKey {
            case setNumber = "set_number"
            case name
            case imageURL = "image_url"
            case yearReleased = "year_released"
            case isObsolete = "is_obsolete"
        }
    }

    enum CodingKeys: String, CodingKey {
        case setInfo
        case setNumber = "set_number"
        case name
        case theme
        case pieces
        case imageURL = "image_url"
        case pricing
        case marketHistory = "market_history"
    }

    func normalized(fallbackIdentifier: String) -> LookupResult {
        LookupResult(
            identifier: setInfo?.setNumber ?? setNumber ?? fallbackIdentifier,
            itemType: .set,
            name: setInfo?.name ?? name ?? "Unknown LEGO set",
            theme: theme ?? "LEGO set",
            pieces: pieces,
            yearReleased: setInfo?.yearReleased,
            isObsolete: setInfo?.isObsolete,
            imageURL: setInfo?.imageURL ?? imageURL,
            pricing: pricing,
            marketHistory: marketHistory ?? [],
            colorID: nil,
            colorName: nil
        )
    }
}
