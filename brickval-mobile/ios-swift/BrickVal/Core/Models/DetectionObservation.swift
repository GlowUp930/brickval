import CoreGraphics
import Foundation

struct DetectionObservation: Codable, Hashable, Identifiable, Sendable {
    let confidence: Double
    let boundingBox: NormalizedBoundingBox
    let detectionFrameCoverage: Double?
    let fullyVisible: Bool
    let regionID: String
    var timestamp: Date

    var id: String { regionID }

    enum CodingKeys: String, CodingKey {
        case confidence
        case boundingBox
        case detectionFrameCoverage
        case fullyVisible
        case regionID = "regionId"
    }

    init(
        confidence: Double,
        boundingBox: NormalizedBoundingBox,
        detectionFrameCoverage: Double? = nil,
        fullyVisible: Bool,
        regionID: String,
        timestamp: Date = .now
    ) {
        self.confidence = confidence
        self.boundingBox = boundingBox
        self.detectionFrameCoverage = detectionFrameCoverage
        self.fullyVisible = fullyVisible
        self.regionID = regionID
        self.timestamp = timestamp
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        confidence = try container.decode(Double.self, forKey: .confidence)
        boundingBox = try container.decode(NormalizedBoundingBox.self, forKey: .boundingBox)
        detectionFrameCoverage = try container.decodeIfPresent(Double.self, forKey: .detectionFrameCoverage)
        fullyVisible = try container.decode(Bool.self, forKey: .fullyVisible)
        regionID = try container.decode(String.self, forKey: .regionID)
        timestamp = .now
    }
}
