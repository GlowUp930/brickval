import Foundation

struct MinifigFeedback: Sendable {
    enum Outcome: String, Sendable {
        case matched
        case brickognizeRejected = "brickognize-rejected"
        case galleryRecovery = "gallery-recovery"
        case lowConfidence = "low-confidence"
    }

    let outcome: Outcome
    let consent: Bool
    let imageData: Data?
    let detectorModelVersion: String?
    let detectorConfidence: Double?
    let brickognizeID: String?
    let brickognizeScore: Double?
    let detectionMilliseconds: Int?
    let identificationMilliseconds: Int?
    let pricingMilliseconds: Int?
    let totalMilliseconds: Int?
}
