import Foundation

struct IdentificationResult: Codable, Sendable {
    let setNumber: String?
    let confidence: Double?
    let candidates: [IdentificationCandidate]
    let detections: [IdentificationDetection]
    let scansUsed: Int?
    let isPro: Bool?

    enum CodingKeys: String, CodingKey {
        case setNumber = "set_number"
        case confidence
        case candidates
        case detections
        case scansUsed
        case isPro
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        setNumber = try container.decodeIfPresent(String.self, forKey: .setNumber)
        confidence = try container.decodeIfPresent(Double.self, forKey: .confidence)
        candidates = try container.decodeIfPresent([IdentificationCandidate].self, forKey: .candidates) ?? []
        detections = try container.decodeIfPresent([IdentificationDetection].self, forKey: .detections) ?? []
        scansUsed = try container.decodeIfPresent(Int.self, forKey: .scansUsed)
        isPro = try container.decodeIfPresent(Bool.self, forKey: .isPro)
    }
}
