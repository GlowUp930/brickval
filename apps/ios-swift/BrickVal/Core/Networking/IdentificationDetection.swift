import Foundation

struct IdentificationDetection: Codable, Hashable, Identifiable, Sendable {
    let id: String
    let itemType: ItemType
    let score: Double
    let regionID: String?
    let alternatives: [IdentificationCandidate]?
    let boundingBox: IdentificationBoundingBox?

    enum CodingKeys: String, CodingKey {
        case id
        case itemType = "item_type"
        case score
        case regionID = "regionId"
        case alternatives
        case boundingBox = "bounding_box"
    }
}

struct IdentificationBoundingBox: Codable, Hashable, Sendable {
    let left: Double
    let top: Double
    let right: Double
    let bottom: Double
    let imageWidth: Double
    let imageHeight: Double

    var normalized: NormalizedBoundingBox? {
        guard imageWidth > 0, imageHeight > 0, right > left, bottom > top else { return nil }
        return NormalizedBoundingBox(
            x: left / imageWidth,
            y: top / imageHeight,
            width: (right - left) / imageWidth,
            height: (bottom - top) / imageHeight
        ).clamped
    }
}
