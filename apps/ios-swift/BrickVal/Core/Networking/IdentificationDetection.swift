import Foundation

struct IdentificationDetection: Codable, Hashable, Identifiable, Sendable {
    let id: String
    let itemType: ItemType
    let score: Double
    let regionID: String?
    let alternatives: [IdentificationCandidate]?

    enum CodingKeys: String, CodingKey {
        case id
        case itemType = "item_type"
        case score
        case regionID = "regionId"
        case alternatives
    }
}
